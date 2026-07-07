import os
from pathlib import Path

import re
import time
import threading
import secrets
import hashlib
import hmac

from flask import Flask, jsonify, request, Response, abort, make_response
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
from bson.binary import Binary
from datetime import datetime, timedelta
import logging
import requests
from dotenv import load_dotenv

# Charge les secrets depuis .env (a cote de ce fichier)
load_dotenv(Path(__file__).resolve().parent / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Le frontend est desormais une SPA React (Vite). En prod, Flask sert le build
# (luckyenatisite/dist) ; toutes les routes de pages renvoient index.html et le
# routing est fait cote client par React Router.
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'luckyenatisite', 'dist')

app = Flask(__name__, static_folder=PUBLIC_DIR, static_url_path='')


INDEX_HTML = os.path.join(PUBLIC_DIR, 'index.html')


def _serve_index():
    """Renvoie le index.html de la SPA, ou un message clair (503) si le build
    est absent — evite un 500 opaque quand `dist/` n'a pas ete genere."""
    if not os.path.isfile(INDEX_HTML):
        return ("Build du frontend introuvable (luckyenatisite/dist/index.html). "
                "Lancez `npm run build` dans luckyenatisite/ (ou laissez le Dockerfile le faire)."), 503
    return app.send_static_file('index.html')


@app.route('/')
def home():
    return _serve_index()


# Fallback SPA : toute route de page (inconnue de Flask et sans fichier statique
# correspondant) renvoie index.html pour que React Router prenne le relais.
# Les chemins /api/* et /health gardent un vrai 404 JSON.
@app.errorhandler(404)
def spa_fallback(e):
    path = request.path or ''
    if path.startswith('/api/') or path.startswith('/health'):
        return jsonify({'success': False, 'error': 'not_found'}), 404
    return _serve_index()


# MongoDB connection setup
MONGO_DB_URL = os.environ['MONGO_DB_URL']
client = MongoClient(MONGO_DB_URL)
db = client['enati']
users_collection = db['coins']

# Token du bot (cote serveur uniquement) pour proxifier les photos de groupe sans l'exposer.
BOT_TOKEN = os.environ.get('BOT_TOKEN')
_group_photo_cache = {}          # group_id -> (bytes, content_type, timestamp)
GROUP_PHOTO_TTL = 3600           # 1h

# Stockage PERSISTANT des images (photos users, logos tokens) en base MongoDB.
# Une image telechargee une fois est conservee -> on ne rappelle jamais la source
# (Telegram / DexScreener) tant qu'elle est en base. Cle = 'user:<tg_id>' /
# 'token:<contract_lower>'.
media_collection = db['media']


def _media_get(key):
    """Doc image en base (ou None)."""
    return media_collection.find_one({'_id': key})


def _media_put(key, data, content_type, src_url=None):
    """Enregistre/ecrase une image en base (bytes + content_type)."""
    if not content_type or not content_type.startswith('image/'):
        content_type = 'image/jpeg'  # Telegram renvoie parfois octet-stream
    doc = {'_id': key, 'data': Binary(data), 'content_type': content_type,
           'updated_at': time.time()}
    if src_url is not None:
        doc['src_url'] = src_url
    media_collection.replace_one({'_id': key}, doc, upsert=True)


def _media_set_src(key, src_url):
    """Memorise l'URL source d'une image (indice) sans toucher aux bytes stockes."""
    if not src_url:
        return
    media_collection.update_one({'_id': key}, {'$set': {'src_url': src_url}}, upsert=True)


# =====================================================================
#  Authentification (inscription / connexion / Telegram)
#  Stockage dans MongoDB : app_users + app_sessions (persistant).
# =====================================================================
app_users = db['app_users']
app_sessions = db['app_sessions']
# Marqueurs "demande de join emise" par un user web sur un groupe (page Your Groups).
group_join_requests = db['group_join_requests']
# Jetons ephemeres pour lier un compte Telegram via le bot (deep-link /start <token>).
tg_link_tokens = db['tg_link_tokens']
# Cache persistant des groupes rejoints par user (affichage instantane de Your Groups).
user_joined_groups = db['user_joined_groups']
# Leaderboard des users PRECALCULE (un doc par caller_id + doc '__meta__').
# Reconstruit periodiquement en tache de fond (stale-while-revalidate) pour que
# /api/all-callers et /api/user/<id>/profile repondent instantanement sans agregation
# live ni appel Telegram. Voir _rebuild_user_stats / _maybe_refresh_user_stats.
user_stats = db['user_stats']
try:
    user_stats.create_index([('calls', -1), ('total_stat', -1)])
except Exception as _e:
    logger.warning(f"user_stats index creation failed: {_e}")
try:
    app_users.create_index('email', unique=True)
    app_sessions.create_index('token', unique=True)
    group_join_requests.create_index([('user_id', 1), ('group_id', 1)], unique=True)
    tg_link_tokens.create_index('token', unique=True)
    # Expiration automatique des jetons apres 10 min (TTL index Mongo).
    tg_link_tokens.create_index('created_at', expireAfterSeconds=600)
    user_joined_groups.create_index([('user_id', 1), ('group_id', 1)], unique=True)
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
        # Dernier snapshot des stats (persiste) -> pre-affichage instantane cote UI.
        'stats': u.get('stats'),
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


@app.route('/api/auth/telegram/unlink', methods=['POST'])
def auth_telegram_unlink():
    """Delie le compte Telegram du compte web (cote site uniquement)."""
    user = _current_user()
    if not user:
        return jsonify({'error': 'Not authenticated.'}), 401
    app_users.update_one({'id': user['id']}, {'$set': {'telegram': None}})
    user = app_users.find_one({'id': user['id']})
    return jsonify({'user': _public_user(user)})


@app.route('/api/auth/telegram/link-token', methods=['POST'])
def auth_telegram_link_token():
    """Cree un jeton a usage unique et renvoie le deep-link du bot. L'utilisateur
    ouvre ce lien dans SON app Telegram (ou il choisit son compte) et appuie sur
    Start ; le bot relie alors le compte via /start <token>."""
    user = _current_user()
    if not user:
        return jsonify({'error': 'Not authenticated.'}), 401
    bot_username = None
    if BOT_TOKEN:
        cfg = auth_config().get_json().get('telegram') or {}
        bot_username = cfg.get('bot_username')
    if not bot_username:
        return jsonify({'error': 'Bot non configure.'}), 503

    token = secrets.token_urlsafe(24)
    tg_link_tokens.insert_one({
        'token': token,
        'user_id': user['id'],
        'used': False,
        'created_at': datetime.utcnow(),
    })
    return jsonify({
        'token': token,
        'deep_link': f'https://t.me/{bot_username}?start={token}',
    })


@app.route('/api/auth/telegram/link-status', methods=['GET'])
def auth_telegram_link_status():
    """Indique si le jeton a ete consomme par le bot (compte lie)."""
    user = _current_user()
    if not user:
        return jsonify({'error': 'Not authenticated.'}), 401
    token = request.args.get('token') or ''
    doc = tg_link_tokens.find_one({'token': token, 'user_id': user['id']})
    linked = bool(doc and doc.get('used'))
    # On renvoie l'utilisateur a jour pour que le front rafraichisse l'affichage.
    fresh = app_users.find_one({'id': user['id']})
    return jsonify({'linked': linked, 'user': _public_user(fresh)})


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


@app.route('/api/user-photo/<tg_id>', methods=['GET'])
def user_photo(tg_id):
    """Photo de profil Telegram d'un user. Servie depuis la base (collection
    'media') si deja stockee ; sinon recuperee cote serveur (URL Login Widget ou
    getUserProfilePhotos) PUIS stockee. ?refresh=1 force le re-telechargement.
    404 si indisponible/privee."""
    try:
        uid = int(tg_id)
    except (TypeError, ValueError):
        abort(404)
    key = f'user:{uid}'
    refresh = request.args.get('refresh') in ('1', 'true', 'yes')

    # 1) Deja en base -> on sert, aucun appel reseau.
    if not refresh:
        doc = _media_get(key)
        if doc and doc.get('data'):
            return Response(bytes(doc['data']), mimetype=doc.get('content_type', 'image/jpeg'))

    def _store_and_serve(content, content_type, src_url=None):
        _media_put(key, content, content_type, src_url=src_url)
        stored = _media_get(key)
        return Response(bytes(stored['data']), mimetype=stored.get('content_type', 'image/jpeg'))

    # 2) URL deja stockee sur le compte (cas Login Widget) -> fetch cote serveur.
    acc = app_users.find_one({'telegram.id': uid}, {'telegram.photoUrl': 1})
    stored_url = ((acc or {}).get('telegram') or {}).get('photoUrl')
    if stored_url and isinstance(stored_url, str) and stored_url.startswith('http'):
        try:
            img = requests.get(stored_url, timeout=15)
            if img.status_code == 200 and img.content:
                return _store_and_serve(img.content, img.headers.get('Content-Type', 'image/jpeg'), stored_url)
        except requests.RequestException:
            pass  # fallback ci-dessous

    # 3) Fallback : getUserProfilePhotos -> getFile -> download (necessite BOT_TOKEN).
    if not BOT_TOKEN:
        abort(404)
    try:
        photos = requests.get(f'https://api.telegram.org/bot{BOT_TOKEN}/getUserProfilePhotos',
                              params={'user_id': uid, 'limit': 1}, timeout=10).json()
        sets = (photos.get('result') or {}).get('photos') or []
        if not sets or not sets[0]:
            abort(404)
        file_id = sets[0][-1].get('file_id')  # derniere taille = la plus grande
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
        return _store_and_serve(img.content, img.headers.get('Content-Type', 'image/jpeg'))
    except requests.RequestException as e:
        logger.warning(f"user photo proxy failed for {uid}: {e}")
        abort(404)


def _resolve_token_image_url(addr):
    """URL du logo d'un token : DexScreener (paire la plus liquide) puis fallback
    pump.fun. Renvoie None si aucune image."""
    src_url = None
    try:
        resp = requests.get(f'https://api.dexscreener.com/latest/dex/tokens/{addr}', timeout=12)
        if resp.status_code == 200:
            addr_l = addr.lower()
            best_liq = -1
            for p in (resp.json() or {}).get('pairs') or []:
                if ((p.get('baseToken') or {}).get('address') or '').lower() != addr_l:
                    continue
                img_url = (p.get('info') or {}).get('imageUrl')
                liq = _to_float((p.get('liquidity') or {}).get('usd')) or 0
                if img_url and liq > best_liq:
                    src_url, best_liq = img_url, liq
    except requests.RequestException as e:
        logger.warning(f"token photo DexScreener resolve failed for {addr}: {e}")
    if src_url:
        return src_url
    # Fallback pump.fun (couvre les tokens pump.fun absents de DexScreener).
    try:
        r = requests.get(f'https://frontend-api-v3.pump.fun/coins/{addr}',
                         headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        if r.status_code == 200:
            return (r.json() or {}).get('image_uri')
    except requests.RequestException as e:
        logger.warning(f"token photo pump.fun resolve failed for {addr}: {e}")
    return None


@app.route('/api/token-photo/<path:address>', methods=['GET'])
def token_photo(address):
    """Logo d'un token. Servi depuis la base (collection 'media') si deja stocke ;
    sinon resolu via coin_image (base) / DexScreener / pump.fun PUIS stocke. Un echec
    est memorise (marqueur 'missing') pour ne pas re-appeler les API. ?refresh=1 force.
    404 (placeholder cote front) si aucun logo."""
    addr = (address or '').strip()
    if not addr:
        abort(404)
    key = f'token:{addr.lower()}'
    refresh = request.args.get('refresh') in ('1', 'true', 'yes')

    doc = _media_get(key)
    if not refresh and doc:
        # Deja en base -> on sert.
        if doc.get('data'):
            return Response(bytes(doc['data']), mimetype=doc.get('content_type', 'image/jpeg'))
        # Echec deja memorise -> 404 rapide, sans re-appeler les API.
        if doc.get('missing'):
            abort(404)

    # URL source : indice memorise (media.src_url) -> coin_image (base) -> resolution.
    src_url = (doc or {}).get('src_url')
    if not src_url:
        coin = users_collection.find_one({'contract_address': addr}, {'coin_image': 1})
        src_url = (coin or {}).get('coin_image')
    if not src_url:
        src_url = _resolve_token_image_url(addr)

    if src_url:
        try:
            img = requests.get(src_url, timeout=15)
            if img.status_code == 200 and img.content:
                _media_put(key, img.content, img.headers.get('Content-Type', 'image/jpeg'), src_url=src_url)
                stored = _media_get(key)
                return Response(bytes(stored['data']), mimetype=stored.get('content_type', 'image/jpeg'))
        except requests.RequestException as e:
            logger.warning(f"token photo download failed for {addr}: {e}")

    # Echec : marqueur negatif -> evite de re-appeler les API aux prochains chargements.
    media_collection.update_one(
        {'_id': key},
        {'$set': {'missing': True, 'updated_at': time.time()}},
        upsert=True,
    )
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


# =====================================================================
#  Page "Your Groups" : appartenance + groupes disponibles.
#  Le pont d'identite est le compte Telegram lie (app_users.telegram.id).
#  Un bot ne peut pas lister les groupes d'un user : on part des groupes
#  connus (ceux ou le bot est present, = group_id distincts de 'coins')
#  et on teste l'appartenance via getChatMember.
# =====================================================================
_MEMBER_STATUSES = {'creator', 'administrator', 'member', 'restricted'}

_chat_member_cache = {}   # (group_id, tg_id) -> (status, ts)
_member_count_cache = {}  # group_id -> (count, ts)
_join_link_cache = {}     # group_id -> (link_or_None, ts)
_groups_created_cache = {} # tg_id -> (count, ts)
CHAT_MEMBER_TTL = 300     # 5 min
MEMBER_COUNT_TTL = 3600   # 1h
JOIN_LINK_TTL = 3600      # 1h
GROUPS_CREATED_TTL = 3600 # 1h


def _tg_get_chat_member(group_id, tg_id, force=False):
    """Statut d'appartenance du user au groupe (via getChatMember), ou None si
    indeterminable (bot absent du groupe, user inconnu, pas de token...).
    force=True ignore le cache (re-verification a la demande, ex. retour d'onglet)."""
    if not BOT_TOKEN:
        return None
    key = (group_id, tg_id)
    cached = _chat_member_cache.get(key)
    if not force and cached and (time.time() - cached[1] < CHAT_MEMBER_TTL):
        return cached[0]
    status = None
    try:
        r = requests.get(f'https://api.telegram.org/bot{BOT_TOKEN}/getChatMember',
                         params={'chat_id': group_id, 'user_id': tg_id}, timeout=8)
        j = r.json()
        if j.get('ok'):
            member = j.get('result') or {}
            status = member.get('status')
            # 'restricted' peut etre un membre encore present (is_member) ou non.
            if status == 'restricted' and not member.get('is_member', False):
                status = 'left'
    except requests.RequestException as e:
        logger.warning(f"getChatMember failed for {group_id}/{tg_id}: {e}")
    _chat_member_cache[key] = (status, time.time())
    return status


def _tg_member_count(group_id):
    """Nombre reel de membres du groupe (getChatMemberCount), ou None."""
    if not BOT_TOKEN:
        return None
    cached = _member_count_cache.get(group_id)
    if cached and (time.time() - cached[1] < MEMBER_COUNT_TTL):
        return cached[0]
    count = None
    try:
        r = requests.get(f'https://api.telegram.org/bot{BOT_TOKEN}/getChatMemberCount',
                         params={'chat_id': group_id}, timeout=8)
        j = r.json()
        if j.get('ok'):
            count = j.get('result')
    except requests.RequestException as e:
        logger.warning(f"getChatMemberCount failed for {group_id}: {e}")
    _member_count_cache[group_id] = (count, time.time())
    return count


def _tg_join_link(group_id):
    """Lien pour rejoindre le groupe : t.me/<username> si public, sinon un lien
    d'invitation genere par le bot (echoue proprement si le bot n'est pas admin)
    -> None. Le resultat (y compris None) est cache."""
    if not BOT_TOKEN:
        return None
    cached = _join_link_cache.get(group_id)
    if cached and (time.time() - cached[1] < JOIN_LINK_TTL):
        return cached[0]
    link = None
    try:
        chat = requests.get(f'https://api.telegram.org/bot{BOT_TOKEN}/getChat',
                            params={'chat_id': group_id}, timeout=8).json()
        result = chat.get('result') or {}
        username = result.get('username')
        if username:
            link = f'https://t.me/{username}'
        else:
            # Groupe prive : on cree un lien qui declenche une DEMANDE d'adhesion
            # (approbation admin requise), jamais un join direct. On ne reutilise
            # pas le invite_link primaire du chat car celui-ci fait rejoindre
            # directement. Echoue proprement (-> None) si le bot n'est pas admin.
            inv = requests.get(f'https://api.telegram.org/bot{BOT_TOKEN}/createChatInviteLink',
                               params={'chat_id': group_id, 'creates_join_request': 'true'},
                               timeout=8).json()
            if inv.get('ok'):
                link = (inv.get('result') or {}).get('invite_link')
    except requests.RequestException as e:
        logger.warning(f"join link resolve failed for {group_id}: {e}")
    _join_link_cache[group_id] = (link, time.time())
    return link


def _my_groups_auth():
    """Retourne (user, tg_id) si connecte + Telegram lie, sinon (reponse d'erreur, None)."""
    user = _current_user()
    if not user:
        return (jsonify({'success': False, 'error': 'not_authenticated'}), 401), None
    tg_id = (user.get('telegram') or {}).get('id')
    if not tg_id:
        return (jsonify({'success': False, 'error': 'telegram_not_linked'}), 401), None
    try:
        return user, int(tg_id)
    except (TypeError, ValueError):
        return (jsonify({'success': False, 'error': 'invalid_telegram_id'}), 400), None


def _hydrate_my_groups(user, joined_ids, members_by_gid):
    """Construit {joined, available} a partir des stats agregees + de l'ensemble
    des group_id rejoints (joined_ids). Aucun appel Telegram ici -> instantane.
    members_by_gid : nb de membres deja connu (stocke) par group_id (peut etre vide)."""
    stats = get_all_groups_stats().get('data', [])
    requested_ids = {
        d['group_id'] for d in group_join_requests.find({'user_id': user['id']}, {'group_id': 1})
    }
    joined, available = [], []
    for g in stats:
        gid = g.get('group_id')
        if gid is None:
            continue
        base = {
            'group_id': gid,
            'group_name': g.get('group_name', 'Unknown'),
            'wins': g.get('total_wins', 0),
            'defeats': g.get('total_defeats', 0),
            'calls': g.get('total_members', 0),
            'win_rate': round(g.get('win_rate', 0)),
        }
        if gid in joined_ids:
            base['members'] = members_by_gid.get(gid)
            joined.append(base)
        else:
            base['requested'] = gid in requested_ids
            available.append(base)
    return {'success': True, 'joined': joined, 'available': available}


# =====================================================================
#  Statistiques utilisateur (carte de rang + page profil)
#  scans/wins/defeats = agregation des calls postes par le user
#  (collection 'coins', caller_id == telegram.id).
# =====================================================================

def _user_call_stats(tg_id):
    """Agrege les calls postes par le user (caller_id). Une seule requete Mongo.
    Retourne {scans, wins, defeats, win_rate, total_stat}."""
    pipeline = [
        {'$match': {'caller_id': tg_id}},
        {'$group': {
            '_id': None,
            'scans': {'$sum': 1},
            'wins': {'$sum': '$wins'},
            'defeats': {'$sum': '$defeat'},
            'total_stat': {'$sum': '$current_stat'},
        }},
    ]
    agg = list(users_collection.aggregate(pipeline))
    if not agg:
        return {'scans': 0, 'wins': 0, 'defeats': 0, 'win_rate': 0, 'total_stat': 0}
    d = agg[0]
    wins = d.get('wins', 0) or 0
    defeats = d.get('defeats', 0) or 0
    win_rate = round(wins / (wins + defeats) * 100) if (wins + defeats) > 0 else 0
    return {
        'scans': d.get('scans', 0) or 0,
        'wins': wins,
        'defeats': defeats,
        'win_rate': win_rate,
        'total_stat': d.get('total_stat', 0) or 0,
    }


def _groups_created_count(tg_id, force=False):
    """Nombre de groupes (ou le bot est present) dont le user est le CREATEUR.
    Scanne les group_id connus via getChatMember (deja cache 5 min). Cache le
    total par tg_id (TTL 1h)."""
    cached = _groups_created_cache.get(tg_id)
    if not force and cached and (time.time() - cached[1] < GROUPS_CREATED_TTL):
        return cached[0]
    count = 0
    for g in get_all_groups_stats().get('data', []):
        gid = g.get('group_id')
        if gid is None:
            continue
        if _tg_get_chat_member(gid, tg_id, force=force) == 'creator':
            count += 1
    _groups_created_cache[tg_id] = (count, time.time())
    return count


def _persist_user_stats(user, extra):
    """Ecrit un snapshot des stats dans app_users (persistance)."""
    snapshot = dict(extra)
    snapshot['updated_at'] = time.time()
    try:
        app_users.update_one({'id': user['id']}, {'$set': {'stats': snapshot}})
    except Exception as e:
        logger.warning(f"persist user stats failed for {user.get('id')}: {e}")


@app.route('/api/me/stats', methods=['GET'])
def get_me_stats():
    """Stats legeres pour la carte de rang (header) + cartes du haut du profil."""
    user, tg_id = _my_groups_auth()
    if tg_id is None:
        return user  # (reponse, code) d'erreur
    stats = _user_call_stats(tg_id)
    groups_joined = user_joined_groups.count_documents({'user_id': user['id']})
    groups_created = _groups_created_count(tg_id)
    out = {
        'scans': stats['scans'], 'wins': stats['wins'], 'defeats': stats['defeats'],
        'win_rate': stats['win_rate'],
        'groups_joined': groups_joined, 'groups_created': groups_created,
    }
    _persist_user_stats(user, out)
    return jsonify({'success': True, **out})


def _ago(ts):
    """'2d ago' / '3h ago' / '5m ago' depuis un timestamp epoch (ou None)."""
    if not ts:
        return ''
    try:
        secs = max(0, time.time() - float(ts))
    except (TypeError, ValueError):
        return ''
    if secs < 3600:
        return f"{int(secs // 60)}m ago"
    if secs < 86400:
        return f"{int(secs // 3600)}h ago"
    return f"{int(secs // 86400)}d ago"


def _profile_call_row(d):
    """Transforme un document 'call' (users_collection) en ligne pour les tables
    du profil (Your Calls / Groups Calls). Partage entre /api/me/profile et
    /api/user/<id>/profile."""
    addr = d.get('contract_address') or ''
    mcap_then = _to_float(d.get('market_cap'))
    # Mcap courant : lu depuis la base (stocke par le bot), pas d'appel live.
    mcap_now = _to_float(d.get('current_market_cap'))
    # PnL : derive du multiple si dispo.
    cs = _to_float(d.get('current_stat'))
    pnl_pct = round((cs - 1) * 100, 2) if cs else None
    return {
        'symbol': d.get('coin_name') or 'Unknown',
        'name': d.get('coin_name') or 'Unknown',
        'contract': addr,
        'image': (f'/api/token-photo/{addr}' if addr else None),
        'mcap_then': mcap_then,
        'mcap_now': mcap_now,
        'pnl_pct': pnl_pct,
        'caller_username': d.get('caller_username'),
        'ago': _ago(d.get('creation_time')),
    }


@app.route('/api/me/profile', methods=['GET'])
def get_me_profile():
    """Donnees completes de la page profil : header, stats, anneau win rate,
    tables 'Your Calls' (calls du user) et 'Groups Calls' (calls de ses groupes)."""
    user, tg_id = _my_groups_auth()
    if tg_id is None:
        return user

    stats = _user_call_stats(tg_id)
    groups_joined = user_joined_groups.count_documents({'user_id': user['id']})
    groups_created = _groups_created_count(tg_id)
    joined_ids = [d['group_id'] for d in
                  user_joined_groups.find({'user_id': user['id']}, {'group_id': 1})]

    your_docs = list(users_collection.find({'caller_id': tg_id}).sort('creation_time', -1).limit(15))
    group_docs = list(users_collection.find(
        {'group_id': {'$in': joined_ids}}).sort('creation_time', -1).limit(50)) if joined_ids else []

    your_calls = [_profile_call_row(d) for d in your_docs]
    group_calls = [_profile_call_row(d) for d in group_docs]

    out_stats = {
        'scans': stats['scans'], 'wins': stats['wins'], 'defeats': stats['defeats'],
        'win_rate': stats['win_rate'],
        'groups_joined': groups_joined, 'groups_created': groups_created,
    }
    _persist_user_stats(user, out_stats)
    tg = user.get('telegram') or {}
    return jsonify({
        'success': True,
        'telegram': {
            'id': tg.get('id'), 'username': tg.get('username'),
            'firstName': tg.get('firstName'), 'photoUrl': tg.get('photoUrl'),
        },
        'name': user.get('name'),
        'joined_at': user.get('created_at'),
        'stats': out_stats,
        'your_calls': your_calls,
        'group_calls': group_calls,
    })


@app.route('/api/my-groups', methods=['GET'])
def get_my_groups():
    """Chemin RAPIDE (aucun appel Telegram) : lit les groupes rejoints depuis la
    base (user_joined_groups) pour un affichage instantane. La detection des
    nouveaux/anciens se fait via /api/my-groups/refresh (tache de fond du front)."""
    user, tg_id = _my_groups_auth()
    if tg_id is None:
        return user  # (reponse, code) d'erreur

    stored = list(user_joined_groups.find({'user_id': user['id']}, {'group_id': 1, 'members': 1}))
    joined_ids = {d['group_id'] for d in stored}
    members_by_gid = {d['group_id']: d.get('members') for d in stored}
    return jsonify(_hydrate_my_groups(user, joined_ids, members_by_gid))


@app.route('/api/my-groups/refresh', methods=['GET'])
def refresh_my_groups():
    """Chemin LENT (reconciliation) : scanne l'appartenance via getChatMember sur
    tous les groupes connus, met a jour user_joined_groups (ajoute les nouveaux,
    retire ceux quittes) et renvoie la liste fraiche."""
    user, tg_id = _my_groups_auth()
    if tg_id is None:
        return user

    force = request.args.get('force') in ('1', 'true', 'yes')
    stats = get_all_groups_stats().get('data', [])
    member_ids = set()
    members_by_gid = {}
    created_count = 0
    for g in stats:
        gid = g.get('group_id')
        if gid is None:
            continue
        status = _tg_get_chat_member(gid, tg_id, force=force)
        if status == 'creator':
            created_count += 1
        if status in _MEMBER_STATUSES:
            member_ids.add(gid)
            members_by_gid[gid] = _tg_member_count(gid)
    # Le scan complet ci-dessus donne aussi le compte "groups created" -> on le
    # met en cache (evite un 2e scan cote /api/me/stats) et on le persiste.
    _groups_created_cache[tg_id] = (created_count, time.time())

    # Reconciliation de la base : upsert des membres, suppression des groupes quittes.
    for gid in member_ids:
        user_joined_groups.update_one(
            {'user_id': user['id'], 'group_id': gid},
            {'$set': {'user_id': user['id'], 'group_id': gid,
                      'members': members_by_gid.get(gid), 'joined_at': time.time()}},
            upsert=True,
        )
    user_joined_groups.delete_many({'user_id': user['id'], 'group_id': {'$nin': list(member_ids)}})
    # Un groupe devenu membre n'a plus de demande en attente -> on nettoie.
    if member_ids:
        group_join_requests.delete_many({'user_id': user['id'], 'group_id': {'$in': list(member_ids)}})

    # Persiste un snapshot des stats a jour (groups_joined/created + calls).
    call_stats = _user_call_stats(tg_id)
    _persist_user_stats(user, {
        'scans': call_stats['scans'], 'wins': call_stats['wins'],
        'defeats': call_stats['defeats'], 'win_rate': call_stats['win_rate'],
        'groups_joined': len(member_ids), 'groups_created': created_count,
    })

    return jsonify(_hydrate_my_groups(user, member_ids, members_by_gid))


@app.route('/api/group/<group_id>/request-join', methods=['POST'])
def request_join_group(group_id):
    """Enregistre qu'un user a demande a rejoindre un groupe et renvoie le lien
    de join (a ouvrir cote client). Requiert compte + Telegram lie."""
    user = _current_user()
    if not user:
        return jsonify({'success': False, 'error': 'not_authenticated'}), 401
    if not (user.get('telegram') or {}).get('id'):
        return jsonify({'success': False, 'error': 'telegram_not_linked'}), 401
    try:
        gid = int(group_id)
    except (TypeError, ValueError):
        return jsonify({'success': False, 'error': 'invalid_group_id'}), 400

    link = _tg_join_link(gid)
    group_join_requests.update_one(
        {'user_id': user['id'], 'group_id': gid},
        {'$set': {'user_id': user['id'], 'group_id': gid, 'at': time.time()}},
        upsert=True,
    )
    return jsonify({'success': bool(link), 'join_link': link})


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


# =====================================================================
#  Leaderboard des users PRECALCULE (collection user_stats)
#  Agregation globale par caller_id, reconstruite en tache de fond
#  (stale-while-revalidate). Les endpoints lisent la collection -> reponse
#  instantanee, sans agregation live ni appel Telegram.
# =====================================================================
USER_STATS_TTL = 120  # secondes : au-dela, on declenche une reconstruction en fond
_user_stats_lock = threading.Lock()
_user_stats_building = False  # garde : une seule reconstruction a la fois


def _rebuild_user_stats():
    """Recalcule le leaderboard des users et l'ecrit dans user_stats (bulk upsert).
    Un doc par caller_id + un doc '__meta__' avec updated_at."""
    global _user_stats_building
    try:
        pipeline = [
            {'$match': {'caller_id': {'$ne': None}}},
            {'$group': {
                '_id': '$caller_id',
                'name': {'$first': {'$ifNull': ['$caller_name', 'Unknown']}},
                'username': {'$first': '$caller_username'},
                'wins': {'$sum': '$wins'},
                'defeats': {'$sum': '$defeat'},
                'total_stat': {'$sum': '$current_stat'},
                'max_stat': {'$max': '$current_stat'},
                'calls': {'$sum': 1},
                'groups': {'$addToSet': '$group_id'},
                'first_call': {'$min': '$creation_time'},
            }},
            {'$sort': {'calls': -1, 'total_stat': -1}},
        ]
        from pymongo import ReplaceOne
        ops = []
        now = time.time()
        rank = 0
        for c in users_collection.aggregate(pipeline, allowDiskUse=True):
            rank += 1
            c_calls = c.get('calls', 0) or 0
            wins = c.get('wins', 0) or 0
            defeats = c.get('defeats', 0) or 0
            win_rate = round((wins / (wins + defeats) * 100)) if (wins + defeats) > 0 else 0
            avg = (c.get('total_stat', 0) / c_calls) if c_calls > 0 else 0
            groups = [g for g in (c.get('groups') or []) if g is not None]
            doc = {
                '_id': c['_id'],
                'name': c.get('name') or 'Unknown',
                'username': c.get('username'),
                'wins': wins,
                'defeats': defeats,
                'win_rate': win_rate,
                'calls': c_calls,
                'total_stat': c.get('total_stat', 0) or 0,
                'max_stat': c.get('max_stat', 0) or 0,
                'avg': round(avg, 1),
                'high': c.get('max_stat', 0) or 0,
                'groups_joined': len(groups),
                'first_call': c.get('first_call'),
                'rank': rank,
                'updated_at': now,
            }
            ops.append(ReplaceOne({'_id': c['_id']}, doc, upsert=True))
        if ops:
            user_stats.bulk_write(ops, ordered=False)
        # Purge des callers disparus (docs plus anciens que ce build).
        user_stats.delete_many({'_id': {'$ne': '__meta__'}, 'updated_at': {'$lt': now}})
        user_stats.replace_one({'_id': '__meta__'},
                               {'_id': '__meta__', 'updated_at': now}, upsert=True)
        logger.info(f"user_stats rebuilt: {len(ops)} callers")
    except Exception as e:
        logger.error(f"_rebuild_user_stats failed: {e}")
    finally:
        with _user_stats_lock:
            _user_stats_building = False


def _maybe_refresh_user_stats():
    """Declenche une reconstruction si les donnees sont perimees (> TTL). Au tout
    premier appel (collection vide), reconstruit de facon SYNCHRONE. Sinon lance un
    thread de fond et sert les donnees courantes (stale-while-revalidate)."""
    global _user_stats_building
    meta = user_stats.find_one({'_id': '__meta__'})
    if not meta:
        # Cold start : build synchrone une fois pour avoir des donnees a servir.
        with _user_stats_lock:
            if _user_stats_building:
                return
            _user_stats_building = True
        _rebuild_user_stats()
        return
    if (time.time() - meta.get('updated_at', 0)) < USER_STATS_TTL:
        return
    with _user_stats_lock:
        if _user_stats_building:
            return
        _user_stats_building = True
    threading.Thread(target=_rebuild_user_stats, daemon=True).start()


@app.route('/api/all-callers', methods=['GET'])
def get_all_callers():
    """Classement global des users (auteurs de calls), lu depuis user_stats
    (precalcule). Utilise pour le leaderboard 'users' du menu de gauche de l'accueil."""
    _maybe_refresh_user_stats()
    out = []
    for c in user_stats.find({'_id': {'$ne': '__meta__'}}).sort('calls', -1).limit(100):
        out.append({
            'caller_id': c['_id'],
            'name': c.get('name') or 'Unknown',
            'username': c.get('username'),
            'win': f"{c.get('win_rate', 0)}%",
            'avg': f"{c.get('avg', 0)}x",
            'high': f"{c.get('high', 0)}x",
            'calls': c.get('calls', 0),
            'img': f"/api/user-photo/{c['_id']}",
        })
    return jsonify({'success': True, 'data': out})


@app.route('/api/user/<caller_id>/profile', methods=['GET'])
def get_user_profile(caller_id):
    """Profil public d'un user (auteur de calls), meme schema que /api/me/profile
    mais pour un caller_id arbitraire et sans authentification. Stats lues depuis
    user_stats (precalcule, aucun appel Telegram) ; listes de calls lues en direct
    (find indexes, rapides). Utilise pour le profil inline du leaderboard."""
    try:
        cid = int(caller_id)
    except (TypeError, ValueError):
        return jsonify({'success': False, 'error': 'invalid_caller_id'}), 400

    _maybe_refresh_user_stats()
    st = user_stats.find_one({'_id': cid})

    your_docs = list(users_collection.find({'caller_id': cid}).sort('creation_time', -1).limit(15))
    if st is None and not your_docs:
        return jsonify({'success': False, 'error': 'user_not_found'}), 404

    # Fallback si le doc precalcule n'existe pas encore (caller tres recent).
    if st is None:
        fb = _user_call_stats(cid)
        joined_ids_fb = [g for g in users_collection.distinct('group_id', {'caller_id': cid}) if g is not None]
        st = {
            'name': (your_docs[0].get('caller_name') if your_docs else None) or 'Unknown',
            'username': your_docs[0].get('caller_username') if your_docs else None,
            'wins': fb['wins'], 'defeats': fb['defeats'], 'win_rate': fb['win_rate'],
            'calls': fb['scans'], 'groups_joined': len(joined_ids_fb),
            'first_call': None,
        }

    username = st.get('username')
    firstName = st.get('name') or 'Unknown'

    # group_calls : derniers calls des groupes ou le user a calle.
    joined_ids = users_collection.distinct('group_id', {'caller_id': cid})
    group_docs = list(users_collection.find(
        {'group_id': {'$in': joined_ids}}).sort('creation_time', -1).limit(50)) if joined_ids else []

    your_calls = [_profile_call_row(d) for d in your_docs]
    group_calls = [_profile_call_row(d) for d in group_docs]

    out_stats = {
        'scans': st.get('calls', 0),
        'wins': st.get('wins', 0),
        'defeats': st.get('defeats', 0),
        'win_rate': st.get('win_rate', 0),
        'groups_joined': st.get('groups_joined', 0),
        # groups_created non calcule pour un tiers (necessiterait des appels Telegram).
    }
    joined_at = st.get('first_call')
    if joined_at is None and your_docs:
        oldest = list(users_collection.find({'caller_id': cid}).sort('creation_time', 1).limit(1))
        if oldest:
            joined_at = oldest[0].get('creation_time')

    return jsonify({
        'success': True,
        'telegram': {
            'id': cid, 'username': username, 'firstName': firstName, 'photoUrl': None,
        },
        'name': firstName,
        'joined_at': joined_at,
        'stats': out_stats,
        'your_calls': your_calls,
        'group_calls': group_calls,
    })


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
