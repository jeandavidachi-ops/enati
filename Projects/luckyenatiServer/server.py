import os
from pathlib import Path

import re
import time
import secrets
import hashlib
import hmac

from flask import Flask, jsonify, request, Response, abort, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
from datetime import datetime, timedelta
import logging
import requests
from dotenv import load_dotenv

# Charge les secrets depuis .env (a cote de ce fichier)
load_dotenv(Path(__file__).resolve().parent / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Le frontend (pages + assets) est dans le dossier voisin luckyenatisite/public.
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'luckyenatisite', 'public')

app = Flask(__name__, static_folder=PUBLIC_DIR, static_url_path='')


@app.route('/')
def home():
    return app.send_static_file('index.html')


@app.route('/leaderboards')
@app.route('/leaderboard')
def leaderboards_page():
    return app.send_static_file('leaderboards.html')


@app.route('/group')
@app.route('/ticker')
def explore_page():
    return app.send_static_file('explore.html')


@app.route('/group/<group_id>')
def group_profile_page(group_id):
    # Page de profil d'un groupe (le group_id est lu cote client depuis l'URL).
    return app.send_static_file('group.html')


@app.route('/ticker/<path:address>')
def token_page(address):
    # Page d'un token (le contract address est lu cote client depuis l'URL).
    return app.send_static_file('token.html')


# MongoDB connection setup
MONGO_DB_URL = os.environ['MONGO_DB_URL']
client = MongoClient(MONGO_DB_URL)
db = client['enati']
users_collection = db['coins']

# Token du bot (cote serveur uniquement) pour proxifier les photos de groupe sans l'exposer.
BOT_TOKEN = os.environ.get('BOT_TOKEN')
_group_photo_cache = {}          # group_id -> (bytes, content_type, timestamp)
GROUP_PHOTO_TTL = 3600           # 1h


# =====================================================================
#  Authentification (inscription / connexion / Telegram)
#  Stockage dans MongoDB : app_users + app_sessions (persistant).
# =====================================================================
app_users = db['app_users']
app_sessions = db['app_sessions']
try:
    app_users.create_index('email', unique=True)
    app_sessions.create_index('token', unique=True)
except Exception as _e:
    logger.warning(f"Auth index setup: {_e}")

AUTH_COOKIE = 'vs_session'
SESSION_MAX_AGE = 60 * 60 * 24 * 30  # 30 jours


def _public_user(u):
    if not u:
        return None
    return {
        'id': u.get('id'),
        'email': u.get('email'),
        'name': u.get('name'),
        'telegram': u.get('telegram'),
    }


def _current_user():
    token = request.cookies.get(AUTH_COOKIE)
    if not token:
        return None
    sess = app_sessions.find_one({'token': token})
    if not sess:
        return None
    return app_users.find_one({'id': sess['user_id']})


def _new_session(resp, user_id):
    token = secrets.token_hex(24)
    app_sessions.insert_one({'token': token, 'user_id': user_id, 'created_at': time.time()})
    resp.set_cookie(AUTH_COOKIE, token, max_age=SESSION_MAX_AGE,
                    httponly=True, samesite='Lax', path='/')
    return resp


@app.route('/api/auth/signup', methods=['POST'])
def auth_signup():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    name = (data.get('name') or '').strip()
    if not email or not password:
        return jsonify({'error': 'Email and password required.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400
    if app_users.find_one({'email': email}):
        return jsonify({'error': 'An account with this email already exists.'}), 409
    user = {
        'id': secrets.token_hex(16),
        'email': email,
        'name': name or email.split('@')[0],
        'password': generate_password_hash(password),
        'telegram': None,
        'created_at': time.time(),
    }
    app_users.insert_one(user)
    resp = make_response(jsonify({'user': _public_user(user)}))
    return _new_session(resp, user['id'])


@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    if not email or not password:
        return jsonify({'error': 'Email and password required.'}), 400
    user = app_users.find_one({'email': email})
    if not user or not check_password_hash(user.get('password', ''), password):
        return jsonify({'error': 'Invalid email or password.'}), 401
    resp = make_response(jsonify({'user': _public_user(user)}))
    return _new_session(resp, user['id'])


@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    token = request.cookies.get(AUTH_COOKIE)
    if token:
        app_sessions.delete_one({'token': token})
    resp = make_response(jsonify({'ok': True}))
    resp.set_cookie(AUTH_COOKIE, '', max_age=0, httponly=True, samesite='Lax', path='/')
    return resp


@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    return jsonify({'user': _public_user(_current_user())})


_tg_config_cache = None  # {'bot_id':..., 'bot_username':...}


@app.route('/api/auth/config', methods=['GET'])
def auth_config():
    """Expose les infos publiques du bot (id + username) pour le Login Widget.
    Le BOT_TOKEN reste secret cote serveur ; seul l'id/username (publics) sortent."""
    global _tg_config_cache
    if not BOT_TOKEN:
        return jsonify({'telegram': None})
    if _tg_config_cache is None:
        bot_id = BOT_TOKEN.split(':')[0]
        bot_username = None
        try:
            r = requests.get(f'https://api.telegram.org/bot{BOT_TOKEN}/getMe', timeout=6)
            j = r.json()
            if j.get('ok'):
                bot_username = j['result'].get('username')
        except Exception as e:
            logger.warning(f"getMe failed: {e}")
        _tg_config_cache = {'bot_id': bot_id, 'bot_username': bot_username}
    return jsonify({'telegram': _tg_config_cache})


@app.route('/api/auth/telegram', methods=['POST'])
def auth_telegram():
    user = _current_user()
    if not user:
        return jsonify({'error': 'Not authenticated.'}), 401
    data = request.get_json(silent=True) or {}

    # Verifie la signature du Telegram Login Widget quand un bot token est configure.
    if BOT_TOKEN and data.get('hash'):
        secret = hashlib.sha256(BOT_TOKEN.encode()).digest()
        check_string = '\n'.join(
            f"{k}={data[k]}" for k in sorted(data) if k != 'hash'
        )
        expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, data['hash']):
            return jsonify({'error': 'Invalid Telegram signature.'}), 403

    tg = {
        'id': data.get('id'),
        'username': data.get('username'),
        'firstName': data.get('first_name'),
        'photoUrl': data.get('photo_url'),
        'linkedAt': time.time(),
    }
    app_users.update_one({'id': user['id']}, {'$set': {'telegram': tg}})
    user = app_users.find_one({'id': user['id']})
    return jsonify({'user': _public_user(user)})


@app.route('/api/group-photo/<group_id>', methods=['GET'])
def group_photo(group_id):
    """
    Renvoie la photo d'un groupe en la recuperant cote serveur via l'API Telegram.
    Le token du bot reste cote serveur -> jamais expose au navigateur.
    """
    try:
        gid = int(group_id)
    except (TypeError, ValueError):
        abort(404)

    cached = _group_photo_cache.get(gid)
    if cached and (time.time() - cached[2] < GROUP_PHOTO_TTL):
        return Response(cached[0], mimetype=cached[1])

    def _serve(content, content_type):
        if not content_type or not content_type.startswith('image/'):
            content_type = 'image/jpeg'  # Telegram renvoie parfois octet-stream
        _group_photo_cache[gid] = (content, content_type, time.time())
        return Response(content, mimetype=content_type)

    # 1) URL stockee dans la base (marche meme si le bot a quitte le groupe).
    #    On la fetch cote serveur -> le token present dans l'URL n'est jamais expose au navigateur.
    doc = users_collection.find_one({'group_id': gid}, {'group_photo': 1})
    stored = (doc or {}).get('group_photo')
    if stored and isinstance(stored, str) and stored.startswith('http'):
        try:
            img = requests.get(stored, timeout=15)
            if img.status_code == 200 and img.content:
                return _serve(img.content, img.headers.get('Content-Type', 'image/jpeg'))
        except requests.RequestException:
            pass  # on tente le fallback ci-dessous

    # 2) Fallback : re-fetch via l'API Telegram (URL stockee absente/expiree).
    #    Necessite BOT_TOKEN et que le bot soit encore dans le groupe.
    if not BOT_TOKEN:
        abort(404)
    try:
        chat = requests.get(f'https://api.telegram.org/bot{BOT_TOKEN}/getChat',
                            params={'chat_id': gid}, timeout=10).json()
        file_id = ((chat.get('result') or {}).get('photo') or {}).get('big_file_id')
        if not file_id:
            abort(404)
        finfo = requests.get(f'https://api.telegram.org/bot{BOT_TOKEN}/getFile',
                             params={'file_id': file_id}, timeout=10).json()
        file_path = (finfo.get('result') or {}).get('file_path')
        if not file_path:
            abort(404)
        img = requests.get(f'https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}', timeout=15)
        if img.status_code != 200:
            abort(404)
        return _serve(img.content, img.headers.get('Content-Type', 'image/jpeg'))
    except requests.RequestException as e:
        logger.warning(f"group photo proxy failed for {gid}: {e}")
        abort(404)

def get_top_groups_by_wins():
    # Use an aggregation pipeline to group by group_id, sum the fields, and sort by wins
    pipeline = [
        {
            '$group': {
                '_id': '$group_id',  # Group by group_id
                'group_name': {'$first': '$group_name'},  # Keep the group name for display
                'group_photo': {'$first': '$group_photo'},  # Keep the group photo for display
                'total_wins': {'$sum': '$wins'},
                'total_defeat': {'$sum': '$defeat'},
                'total_current_stat': {'$sum': '$current_stat'}
            }
        },
        {'$addFields': {'score': {'$subtract': ['$total_current_stat', '$total_defeat']}}},
        {
            # Classement canonique: score (current_stat - defeats), puis wins, puis id (stable).
            '$sort': {'score': -1, 'total_wins': -1, '_id': 1}
        },
        {
            '$limit': 3  # Limit to the top 3 groups
        }
    ]
    
    # Run the aggregation pipeline
    top_groups = list(users_collection.aggregate(pipeline))
    logger.info(f"Found {len(top_groups)} top groups: {top_groups}")
    
    return top_groups

def get_top_coins_by_group(group_id):
    # Pipeline to get top 5 coins by current_stat for a specific group
    pipeline = [
        {
            '$match': {
                'group_id': int(group_id)
            }
        },
        {
            '$sort': {'current_stat': -1}
        },
        {
            '$limit': 5
        }
    ]
    
    # Run the aggregation pipeline
    top_coins = list(users_collection.aggregate(pipeline))
    
    # Convert ObjectId to string for JSON serialization
    for coin in top_coins:
        coin['_id'] = str(coin['_id'])
    
    return top_coins

@app.route('/api/top-groups', methods=['GET'])
def get_top_groups():
    try:
        top_groups = get_top_groups_by_wins()
        response_data = {
            'success': True,
            'data': top_groups,
            'message': 'Top 3 groups retrieved successfully'
        }
        logger.info(f"Returning top groups: {response_data}")
        return jsonify(response_data), 200
    except Exception as e:
        logger.error(f"Error in get_top_groups: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to retrieve top groups'
        }), 500

@app.route('/api/top-coins/<group_id>', methods=['GET'])
def get_top_coins(group_id):
    try:
        top_coins = get_top_coins_by_group(group_id)
        return jsonify({
            'success': True,
            'data': top_coins,
            'group_id': group_id,
            'message': f'Top 5 coins for group {group_id} retrieved successfully'
        }), 200
    except Exception as e:
        print(f"ERROR:__main__:Error in get_top_coins for group {group_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'Failed to retrieve top coins for group {group_id}'
        }), 500

@app.route('/api/debug/groups', methods=['GET'])
def debug_groups():
    """Debug endpoint to see all available group_ids"""
    try:
        # Get all unique group_ids
        pipeline = [
            {
                '$group': {
                    '_id': '$group_id',
                    'group_name': {'$first': '$group_name'},
                    'count': {'$sum': 1}
                }
            },
            {
                '$sort': {'_id': 1}
            }
        ]
        groups = list(users_collection.aggregate(pipeline))
        
        return jsonify({
            'success': True,
            'total_groups': len(groups),
            'groups': groups,
            'message': 'All groups retrieved successfully'
        }), 200
    except Exception as e:
        logger.error(f"Error in debug_groups endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to retrieve groups'
        }), 500

@app.route('/api/search', methods=['GET'])
def search():
    """
    Recherche live pour la barre du site : renvoie les groupes (par nom) et les tickers
    (par nom de coin ou adresse de contrat) correspondant a la requete 'q'.
    Reponse : {success, groups:[{group_id, group_name}], tickers:[{contract_address, coin_name, market_cap}]}
    """
    q = (request.args.get('q') or '').strip()
    if not q:
        return jsonify({'success': True, 'groups': [], 'tickers': []})

    # Regex insensible a la casse, en echappant les caracteres speciaux saisis par l'utilisateur.
    rx = {'$regex': re.escape(q), '$options': 'i'}

    try:
        # --- Groupes : dedup par group_id, tri par nombre de records, limite 6 ---
        group_pipeline = [
            {'$match': {'group_name': rx}},
            {'$group': {
                '_id': '$group_id',
                'group_name': {'$first': '$group_name'},
                'count': {'$sum': 1},
            }},
            {'$sort': {'count': -1}},
            {'$limit': 6},
        ]
        groups = [
            {'group_id': g['_id'], 'group_name': g.get('group_name') or 'Unknown'}
            for g in users_collection.aggregate(group_pipeline)
            if g.get('_id') is not None
        ]

        # --- Tickers : match sur coin_name OU contract_address, dedup par adresse, limite 6 ---
        ticker_pipeline = [
            {'$match': {
                'contract_address': {'$exists': True, '$ne': None, '$ne': ''},
                '$or': [{'coin_name': rx}, {'contract_address': rx}],
            }},
            {'$group': {
                '_id': '$contract_address',
                'coin_name': {'$first': '$coin_name'},
                'market_cap': {'$first': '$market_cap'},
                'count': {'$sum': 1},
            }},
            {'$sort': {'count': -1}},
            {'$limit': 6},
        ]
        tickers = [
            {
                'contract_address': t['_id'],
                'coin_name': t.get('coin_name') or 'Unknown',
                'market_cap': t.get('market_cap'),
            }
            for t in users_collection.aggregate(ticker_pipeline)
        ]

        return jsonify({'success': True, 'groups': groups, 'tickers': tickers})
    except Exception as e:
        logger.error(f"Error in search for q={q!r}: {e}")
        return jsonify({'success': False, 'error': str(e), 'groups': [], 'tickers': []}), 500


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Server is running'
    }), 200

def _extract_socials(info):
    """
    Extrait les liens X (Twitter) et Telegram depuis le bloc 'info' d'une paire DexScreener.
    Structure attendue : info['socials'] = [{'type': 'twitter'|'telegram', 'url': ...}, ...].
    Renvoie toujours {'twitter': url|None, 'telegram': url|None}.
    """
    out = {'twitter': None, 'telegram': None}
    if not isinstance(info, dict):
        return out
    for s in (info.get('socials') or []):
        if not isinstance(s, dict):
            continue
        stype = (s.get('type') or '').lower()
        url = s.get('url')
        if not url:
            continue
        if stype in ('twitter', 'x') and not out['twitter']:
            out['twitter'] = url
        elif stype == 'telegram' and not out['telegram']:
            out['telegram'] = url
    return out


def get_pumpfun_image(contract_address):
    """
    Secours : recupere l'image via l'API pump.fun (gratuite, sans cle) quand DexScreener
    n'a pas d'image. Couvre les tokens pump.fun (la plupart des tokens du projet).
    """
    try:
        url = f'https://frontend-api-v3.pump.fun/coins/{contract_address}'
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if data.get('image_uri'):
                return {
                    'success': True,
                    'image_url': data['image_uri'],
                    'token_name': data.get('name'),
                    'token_symbol': data.get('symbol'),
                    # pump.fun expose parfois les socials directement sur la fiche du coin.
                    'twitter': data.get('twitter'),
                    'telegram': data.get('telegram'),
                }
    except Exception as e:
        logger.warning(f"pumpfun image fallback failed for {contract_address}: {e}")
    return {'success': False, 'error': 'No image found (DexScreener + pump.fun)'}


def get_token_image(contract_address):
    """
    Recupere l'URL de l'image d'un token. DexScreener en priorite, puis pump.fun en secours.
    """
    try:
        url = f'https://api.dexscreener.com/latest/dex/tokens/{contract_address}'
        response = requests.get(url)

        if response.status_code == 200:
            data = response.json()

            # On prend la premiere paire (la plus active) si elle a une image.
            if 'pairs' in data and len(data['pairs']) > 0:
                first_pair = data['pairs'][0]
                if 'info' in first_pair and 'imageUrl' in first_pair['info']:
                    socials = _extract_socials(first_pair.get('info'))
                    return {
                        'success': True,
                        'image_url': first_pair['info']['imageUrl'],
                        'token_name': first_pair['baseToken']['name'],
                        'token_symbol': first_pair['baseToken']['symbol'],
                        'twitter': socials['twitter'],
                        'telegram': socials['telegram'],
                    }

        # Pas d'image cote DexScreener -> secours pump.fun.
        return get_pumpfun_image(contract_address)

    except Exception as e:
        logger.warning(f"DexScreener image failed for {contract_address}: {e}, trying pump.fun")
        return get_pumpfun_image(contract_address)

@app.route('/api/token-image/<contract_address>', methods=['GET'])
def get_token_image_endpoint(contract_address):
    """
    API endpoint для получения изображения токена
    """
    result = get_token_image(contract_address)
    return jsonify(result)


def _to_float(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def get_token_detail(address):
    """
    Detail d'un token pour sa page : identite + metriques live (DexScreener),
    infos pour le chart embed (chain + pair_address), et la liste des groupes
    qui ont pris le call (depuis la base 'coins').
    """
    # --- DexScreener : identite, metriques live, meilleure paire ---
    token = {'name': None, 'symbol': None, 'image': None, 'chain': None, 'pair_address': None,
             'twitter': None, 'telegram': None}
    metrics = {'price': None, 'market_cap': None, 'volume_24h': None,
               'liquidity': None, 'change_24h': None, 'holders': None, 'ath': None}
    mcap_now = None
    try:
        url = f'https://api.dexscreener.com/latest/dex/tokens/{address}'
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            pairs = (resp.json() or {}).get('pairs') or []
            # On ne garde que les paires ou le token demande est le baseToken (sinon
            # prix/mcap correspondraient a l'autre token de la paire).
            addr_l = address.lower()
            base_pairs = [p for p in pairs if ((p.get('baseToken') or {}).get('address') or '').lower() == addr_l]
            pairs = base_pairs or pairs
            if pairs:
                # Paire la plus liquide = la plus representative pour le chart/metriques.
                pairs.sort(key=lambda p: (_to_float((p.get('liquidity') or {}).get('usd')) or 0), reverse=True)
                p = pairs[0]
                base = p.get('baseToken') or {}
                info = p.get('info') or {}
                token['name'] = base.get('name')
                token['symbol'] = base.get('symbol')
                token['image'] = info.get('imageUrl')
                token['chain'] = p.get('chainId')
                token['pair_address'] = p.get('pairAddress')
                socials = _extract_socials(info)
                token['twitter'] = socials['twitter']
                token['telegram'] = socials['telegram']
                metrics['price'] = _to_float(p.get('priceUsd'))
                mcap_now = _to_float(p.get('marketCap')) or _to_float(p.get('fdv'))
                metrics['market_cap'] = mcap_now
                metrics['volume_24h'] = _to_float((p.get('volume') or {}).get('h24'))
                metrics['liquidity'] = _to_float((p.get('liquidity') or {}).get('usd'))
                metrics['change_24h'] = _to_float((p.get('priceChange') or {}).get('h24'))
    except requests.RequestException as e:
        logger.warning(f"DexScreener token detail failed for {address}: {e}")

    # Image de secours (pump.fun) si DexScreener n'a rien.
    if not token['image']:
        fallback = get_token_image(address)
        if fallback.get('success'):
            token['image'] = fallback.get('image_url')
            token['name'] = token['name'] or fallback.get('token_name')
            token['symbol'] = token['symbol'] or fallback.get('token_symbol')
            token['twitter'] = token['twitter'] or fallback.get('twitter')
            token['telegram'] = token['telegram'] or fallback.get('telegram')

    # --- Groupes qui ont pris le call (un document par groupe) ---
    groups = []
    for doc in users_collection.find({'contract_address': address}).sort('current_stat', -1):
        token['name'] = token['name'] or doc.get('coin_name')
        if doc.get('wins'):
            outcome = 'Win'
        elif doc.get('defeat'):
            outcome = 'Lost'
        else:
            outcome = 'Live'
        groups.append({
            'group_id': doc.get('group_id'),
            'group_name': doc.get('group_name', 'Unknown'),
            'first_scan': doc.get('creation_time'),
            'mcap_then': doc.get('market_cap'),
            'calls': 1,
            'mcap_now': mcap_now,
            'mult': f"{doc.get('current_stat', 0)}x",
            'outcome': outcome,
        })

    # Introuvable partout -> 404.
    if not token['name'] and not groups:
        return {'success': False, 'error': 'token_not_found',
                'message': f'Token {address} not found'}

    return {
        'success': True,
        'data': {
            'address': address,
            'token': token,
            'metrics': metrics,
            'groups': groups,
        },
    }


@app.route('/api/token/<path:address>', methods=['GET'])
def get_token_detail_endpoint(address):
    try:
        result = get_token_detail(address)
        status = 200 if result.get('success') else 404
        return jsonify(result), status
    except Exception as e:
        logger.error(f"Error in get_token_detail for {address}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def get_all_groups_stats():
    """
    Получает статистику всех групп из базы данных
    Возвращает: group_photo, group_name, total_wins, total_defeats, max_current_stat, win_rate
    """
    try:
        # Агрегационный pipeline для получения статистики всех групп
        pipeline = [
            {
                '$group': {
                    '_id': '$group_id',
                    'group_name': {'$first': '$group_name'},
                    'group_photo': {'$first': '$group_photo'},  # Предполагаем, что есть поле group_photo
                    'total_wins': {'$sum': '$wins'},
                    'total_defeats': {'$sum': '$defeat'},
                    'total_current_stat': {'$sum': '$current_stat'},
                    'max_current_stat': {'$max': '$current_stat'},
                    'total_members': {'$sum': 1}  # Количество записей в группе
                }
            },
            {
                # Score effectif = somme(current_stat) - defaites (meme definition que /rank).
                '$addFields': {'score': {'$subtract': ['$total_current_stat', '$total_defeats']}}
            },
            {
                '$addFields': {
                    'win_rate': {
                        '$cond': {
                            'if': {'$gt': [{'$add': ['$total_wins', '$total_defeats']}, 0]},
                            'then': {
                                '$multiply': [
                                    {'$divide': ['$total_wins', {'$add': ['$total_wins', '$total_defeats']}]},
                                    100
                                ]
                            },
                            'else': 0
                        }
                    }
                }
            },
            {
                # Meme classement canonique que /rank et le reste du leaderboard.
                '$sort': {'score': -1, 'total_wins': -1, '_id': 1}
            }
        ]
        
        # Выполняем агрегацию
        groups_stats = list(users_collection.aggregate(pipeline))
        
        # Форматируем результат
        formatted_stats = []
        for group in groups_stats:
            formatted_group = {
                'group_id': group['_id'],
                'group_name': group['group_name'],
                'group_photo': group.get('group_photo', None),  # Может быть None если поля нет
                'total_wins': group['total_wins'],
                'total_defeats': group['total_defeats'],
                'max_current_stat': group['max_current_stat'],
                'total_current_stat': group.get('total_current_stat', 0),
                'score': group.get('score', 0),
                'total_members': group['total_members'],
                'win_rate': round(group['win_rate'], 2)  # Округляем до 2 знаков после запятой
            }
            formatted_stats.append(formatted_group)
        
        return {
            'success': True,
            'data': formatted_stats,
            'total_groups': len(formatted_stats),
            'message': f'Successfully retrieved statistics for {len(formatted_stats)} groups'
        }
        
    except Exception as e:
        logger.error(f"Error in get_all_groups_stats: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'message': 'Failed to retrieve groups statistics'
        }

@app.route('/api/all-groups-stats', methods=['GET'])
def get_all_groups_stats_endpoint():
    """
    API endpoint для получения статистики всех групп
    """
    result = get_all_groups_stats()
    return jsonify(result)


def get_group_detail(group_id):
    """
    Detail d'un groupe pour sa page de profil : hero + heroStats, top callers
    (par auteur du call) et derniers calls. Les documents historiques sans
    'caller_id' sont regroupes sous 'Unknown'.
    """
    gid = int(group_id)

    # --- Hero + rang (reutilise le classement canonique de get_all_groups_stats) ---
    all_stats = get_all_groups_stats().get('data', [])
    rank = None
    hero = None
    for i, g in enumerate(all_stats):
        if g['group_id'] == gid:
            rank = i + 1
            hero = g
            break

    if hero is None:
        return {'success': False, 'error': 'group_not_found',
                'message': f'Group {gid} not found'}

    calls = hero.get('total_members', 0)
    total_stat = hero.get('total_current_stat', 0)
    avg_mult = (total_stat / calls) if calls > 0 else 0

    hero_stats = [
        {'label': 'Win Rate', 'value': f"{round(hero.get('win_rate', 0))}%",
         'sub': f"{hero.get('total_wins', 0)} won · {hero.get('total_defeats', 0)} lost",
         'color': '#3fd35f'},
        {'label': 'Avg. Multiplier', 'value': f"{avg_mult:.1f}x",
         'sub': f"Across {calls} calls", 'color': '#F5F5F5'},
        {'label': 'Highest Multiplier', 'value': f"{hero.get('max_current_stat', 0)}x",
         'sub': 'All time', 'color': '#F5F5F5'},
        {'label': 'Total Calls', 'value': str(calls),
         'sub': f"{hero.get('total_defeats', 0)} lost", 'color': '#F5F5F5'},
        {'label': 'Duels', 'value': '—', 'sub': 'Soon', 'color': '#797d84'},
    ]

    # --- Top callers : agregation par auteur du call ---
    caller_pipeline = [
        {'$match': {'group_id': gid}},
        {'$group': {
            '_id': {'$ifNull': ['$caller_id', 'unknown']},
            'name': {'$first': {'$ifNull': ['$caller_name', 'Unknown']}},
            'username': {'$first': '$caller_username'},
            'wins': {'$sum': '$wins'},
            'defeats': {'$sum': '$defeat'},
            'total_stat': {'$sum': '$current_stat'},
            'max_stat': {'$max': '$current_stat'},
            'calls': {'$sum': 1},
        }},
        {'$sort': {'calls': -1, 'total_stat': -1}},
        {'$limit': 10},
    ]
    callers = []
    for c in users_collection.aggregate(caller_pipeline):
        c_calls = c.get('calls', 0) or 0
        wins = c.get('wins', 0) or 0
        defeats = c.get('defeats', 0) or 0
        win_rate = round((wins / (wins + defeats) * 100)) if (wins + defeats) > 0 else 0
        avg = (c.get('total_stat', 0) / c_calls) if c_calls > 0 else 0
        callers.append({
            'caller_id': None if c['_id'] == 'unknown' else c['_id'],
            'name': c.get('name') or 'Unknown',
            'username': c.get('username'),
            'win': f"{win_rate}%",
            'avg': f"{avg:.1f}x",
            'high': f"{c.get('max_stat', 0)}x",
            'calls': c_calls,
        })

    # --- Recent calls (derniers documents du groupe) ---
    recent = []
    for r in users_collection.find({'group_id': gid}).sort('creation_time', -1).limit(10):
        if r.get('wins'):
            outcome = 'Win'
        elif r.get('defeat'):
            outcome = 'Lost'
        else:
            outcome = 'Live'
        recent.append({
            'token': r.get('coin_name', '?'),
            'contract_address': r.get('contract_address'),
            'by': r.get('caller_name') or 'Unknown',
            'at': r.get('creation_time'),
            'mcapThen': r.get('market_cap'),
            'mult': f"{r.get('current_stat', 0)}x",
            'outcome': outcome,
        })

    return {
        'success': True,
        'data': {
            'hero': {
                'group_id': gid,
                'group_name': hero.get('group_name', 'Unknown'),
                'rank': rank,
                'stats': hero_stats,
            },
            'callers': callers,
            'recent': recent,
        },
    }


@app.route('/api/group/<group_id>', methods=['GET'])
def get_group_detail_endpoint(group_id):
    try:
        result = get_group_detail(group_id)
        status = 200 if result.get('success') else 404
        return jsonify(result), status
    except (TypeError, ValueError):
        return jsonify({'success': False, 'error': 'invalid_group_id'}), 400
    except Exception as e:
        logger.error(f"Error in get_group_detail for {group_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def get_shared_contracts_analysis():
    """
    Анализирует все записи в БД и находит контрактные адреса монет, 
    которые используются в нескольких группах
    Возвращает: contract_address, token_name, token_image, groups_count, group_ids
    """
    try:
        logger.info("Starting get_shared_contracts_analysis function")
        
        # Агрегационный pipeline для поиска контрактных адресов, используемых в нескольких группах
        pipeline = [
            {
                '$match': {
                    'contract_address': {'$exists': True, '$ne': None, '$ne': ''}  # Фильтруем записи с валидными адресами
                }
            },
            {
                '$group': {
                    '_id': '$contract_address',
                    'coin_name': {'$first': '$coin_name'},  # Берем первое название монеты из coin_name
                    'market_cap': {'$first': '$market_cap'},  # Берем первый market_cap (с подчеркиванием)
                    'groups_using': {'$addToSet': '$group_id'},  # Собираем уникальные group_id
                    'total_records': {'$sum': 1}  # Общее количество записей с этим адресом
                }
            },
            {
                '$addFields': {
                    'groups_count': {'$size': '$groups_using'}  # Количество групп, использующих этот адрес
                }
            },
            {
                '$match': {
                    'groups_count': {'$gt': 1}  # Только адреса, используемые в более чем одной группе
                }
            },
            {
                '$sort': {'groups_count': -1, 'total_records': -1}  # Сортировка по количеству групп и записей
            }
        ]
        
        logger.info(f"Aggregation pipeline: {pipeline}")
        
        # Выполняем агрегацию
        shared_contracts = list(users_collection.aggregate(pipeline))
        logger.info(f"Raw aggregation result: {shared_contracts}")
        logger.info(f"Number of shared contracts found: {len(shared_contracts)}")
        
        # Форматируем результат и получаем изображения токенов
        formatted_result = []
        for i, contract in enumerate(shared_contracts):
            logger.info(f"Processing contract {i+1}: {contract}")
            
            # Получаем изображение токена и ticker
            token_image_result = get_token_image(contract['_id'])
            token_image_url = None
            token_ticker = None
            
            if token_image_result.get('success'):
                token_image_url = token_image_result.get('image_url')
                token_ticker = token_image_result.get('token_symbol')  # Получаем ticker из API
                logger.info(f"Got token image for {contract['_id']}: {token_image_url}")
                logger.info(f"Got token ticker for {contract['_id']}: {token_ticker}")
            else:
                logger.warning(f"Failed to get token image for {contract['_id']}: {token_image_result.get('error')}")
            
            formatted_contract = {
                'contract_address': contract['_id'],
                'token_name': contract.get('coin_name', 'Unknown'),
                'token_ticker': token_ticker,
                'token_image': token_image_url,
                'market_cap': contract.get('market_cap', None),
                'groups_count': contract['groups_count'],
                'total_records': contract['total_records'],
                'group_ids': sorted(contract['groups_using'])  # Сортируем ID групп для удобства
            }
            formatted_result.append(formatted_contract)
            logger.info(f"Formatted contract {i+1}: {formatted_contract}")
        
        final_result = {
            'success': True,
            'data': formatted_result,
            'total_shared_contracts': len(formatted_result),
            'message': f'Found {len(formatted_result)} contract addresses used across multiple groups'
        }
        
        logger.info(f"Final result: {final_result}")
        return final_result
        
    except Exception as e:
        logger.error(f"Error in get_shared_contracts_analysis: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return {
            'success': False,
            'error': str(e),
            'message': 'Failed to analyze shared contracts'
        }

@app.route('/api/shared-contracts', methods=['GET'])
def get_shared_contracts_endpoint():
    """
    API endpoint для получения анализа контрактных адресов, используемых в нескольких группах
    """
    logger.info("=== /api/shared-contracts endpoint called ===")
    logger.info(f"Request method: {request.method}")
    logger.info(f"Request headers: {dict(request.headers)}")
    
    result = get_shared_contracts_analysis()
    
    logger.info(f"Endpoint returning result: {result}")
    logger.info("=== /api/shared-contracts endpoint finished ===")
    
    return jsonify(result)

@app.route('/api/latest-records', methods=['GET'])
def get_latest_records():
    """
    Получает последние 10 записей по creation_time (самые новые)
    Формат даты: 31.08.2025 11:11
    """
    try:
        # Получаем последние 10 записей, отсортированные по creation_time
        latest_records = list(users_collection.find().sort('creation_time', -1).limit(10))
        
        # Конвертируем ObjectId в строки для JSON сериализации
        for record in latest_records:
            record['_id'] = str(record['_id'])
            
            # Форматируем creation_time в нужный формат, если поле существует
            if 'creation_time' in record and record['creation_time']:
                try:
                    # Если creation_time это строка, парсим её
                    if isinstance(record['creation_time'], str):
                        dt = datetime.fromisoformat(record['creation_time'].replace('Z', '+00:00'))
                    else:
                        # Если это datetime объект
                        dt = record['creation_time']
                    
                    # Форматируем в нужный формат: 31.08.2025 11:11
                    record['creation_time'] = dt.strftime('%d.%m.%Y %H:%M')
                except:
                    # Если не удалось отформатировать, оставляем как есть
                    pass
        
        return jsonify({
            'success': True,
            'data': latest_records,
            'total_records': len(latest_records),
            'message': f'Successfully retrieved {len(latest_records)} latest records'
        })
        
    except Exception as e:
        logger.error(f"Error getting latest records: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to retrieve latest records'
        }), 500

if __name__ == '__main__':
    # debug desactive par defaut (ne jamais exposer le debugger Werkzeug en public).
    # Mets FLASK_DEBUG=1 dans .env uniquement en local pour developper.
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'
    # Railway fournit le port via $PORT et exige une ecoute sur 0.0.0.0.
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=debug, host='0.0.0.0', port=port)
