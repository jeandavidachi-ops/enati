from pymongo import MongoClient
from bson.binary import Binary
import requests
import time
import app.dexscreenerAPI as dex

from datetime import datetime, timedelta

# Seuils et reglages du suivi temps-reel.
WIN_RATIO = 2       # x2 du market cap initial  -> win
DEFEAT_RATIO = 0.2  # -80% du market cap initial -> defeat
MAX_TRACK_HOURS = 48  # au-dela, un token qui stagne sort en defeat

# Classement canonique partage par /rank ET le leaderboard, pour qu'ils soient correles.
# score effectif d'un groupe = somme(current_stat) - nombre de defeats (chaque defaite = -1).
# Ordre : score desc, puis wins desc, puis group_id (stable). Applique apres un $addFields 'score'.
RANK_SORT = [('score', -1), ('total_wins', -1), ('_id', 1)]

from config import MONGO_DB_URL

# MongoDB connection setup
client = MongoClient(MONGO_DB_URL)
db = client['enati']
users_collection = db['coins']
monitoring_collection = db['monitoring']  # compteur des tokens actuellement monitores
media_collection = db['media']            # images persistantes (partage avec le serveur web)


def store_token_image(address, image_url):
    """Telecharge le logo d'un token et le stocke en base (collection 'media',
    cle 'token:<addr_lower>') pour que le site le serve sans re-fetch. Best-effort :
    toute erreur est ignoree (ne doit jamais casser le traitement d'un call)."""
    if not address or not image_url:
        return
    key = f'token:{address.lower()}'
    try:
        # Deja stocke -> on ne re-telecharge pas.
        existing = media_collection.find_one({'_id': key}, {'data': 1})
        if existing and existing.get('data'):
            return
        img = requests.get(image_url, timeout=15)
        if img.status_code != 200 or not img.content:
            return
        ct = img.headers.get('Content-Type', 'image/jpeg')
        if not ct.startswith('image/'):
            ct = 'image/jpeg'
        media_collection.replace_one(
            {'_id': key},
            {'_id': key, 'data': Binary(img.content), 'content_type': ct,
             'src_url': image_url, 'updated_at': time.time()},
            upsert=True,
        )
    except requests.RequestException:
        pass

def add_or_update_coin(contract_address, coin_name, market_cap, wins, defeat, currect_stat, creation_time, group_name, group_id, group_photo,
                       caller_id=None, caller_username=None, caller_name=None, coin_image=None):
    # Define the query to check if a document with the given contract_address and group_id exists
    query = {'contract_address': contract_address, 'group_id': group_id}

    # Find the existing document with the same contract_address and group_id
    existing_document = users_collection.find_one(query)

    if existing_document:
        # If the document with the same contract_address and group_id exists, do nothing
        return
    else:
        # If no document exists with the given contract_address and group_id, insert a new one
        # caller_* : auteur Telegram du call (pour la page de profil du groupe). Facultatif
        # pour rester compatible avec les documents historiques qui ne l'ont pas.
        new_entry = {
            'contract_address': contract_address,
            'coin_name': coin_name,
            'market_cap': market_cap,
            'current_market_cap': market_cap,  # mcap courant (mis a jour a chaque tick)
            'coin_image': coin_image,          # URL du logo (resolu avec fallback pump.fun)
            'wins': wins,
            'defeat': defeat,
            'current_stat': currect_stat,
            'creation_time': creation_time,
            'group_name': group_name,
            'group_id': group_id,
            'group_photo': group_photo,
            'caller_id': caller_id,
            'caller_username': caller_username,
            'caller_name': caller_name,
        }
        result = users_collection.insert_one(new_entry)
        return result


async def process_active_tokens():
    """
    Tick du suivi temps-reel (appele toutes les 5s par run.py).

    - Ne traite que les tokens "en cours" (wins == 0 ET defeat == 0).
    - Recupere tous leurs market caps en UN appel groupe DexScreener (lots de 30).
    - A CHAQUE tick, le verdict est recalcule a partir du market cap courant :
        ratio >= 2   -> win    (etat terminal -> sort de la liste au prochain tick)
        ratio <= 0.2 -> defeat (etat terminal)
        sinon, si le token a depasse MAX_TRACK_HOURS sans verdict -> defeat (timeout)
    - Met aussi a jour current_stat (plus haut multiple atteint).
    """
    active = list(users_collection.find({'wins': 0, 'defeat': 0}))

    # Compteur de monitoring (reecrit a chaque tick, y compris 0).
    monitoring_collection.update_one(
        {'_id': 'status'},
        {'$set': {'monitored_tokens': len(active)}},
        upsert=True,
    )

    if not active:
        return []

    addresses = [t['contract_address'] for t in active]
    marketcaps = dex.get_marketcaps_batch(addresses)

    now = datetime.now()
    events = []  # paliers atteints ce tick, remontes a run.py pour annonce dans le groupe

    for token in active:
        addr = token['contract_address']
        initial = token.get('market_cap')
        current = marketcaps.get(addr)
        peak = token.get('current_stat', 0)  # plus haut multiple entier deja atteint

        update = {}
        milestone = None

        if current is not None:
            # Mcap courant frais en base -> le site l'affiche sans appel DexScreener.
            update['current_market_cap'] = current

        if current is not None and initial:
            ratio = current / initial
            m = int(ratio)  # multiple entier courant (floor)

            # Nouveau record de multiple (>= x2) -> on enregistre + on annonce.
            if m >= 2 and m > peak:
                update['current_stat'] = m
                peak = m
                milestone = m

            # Mort : -80% du prix INITIAL (du premier call). Suivi arrete, sans message.
            if ratio <= DEFEAT_RATIO:
                update['wins' if peak >= 2 else 'defeat'] = 1

        # Timeout (filet de securite) : meme classification par le pic, sans message.
        if 'wins' not in update and 'defeat' not in update:
            created = token.get('creation_time')
            if isinstance(created, str):
                try:
                    created_dt = datetime.strptime(created, '%d.%m.%Y %H:%M')
                    if now - created_dt > timedelta(hours=MAX_TRACK_HOURS):
                        update['wins' if peak >= 2 else 'defeat'] = 1
                except ValueError:
                    pass

        if update:
            users_collection.update_one({'_id': token['_id']}, {'$set': update})

        if milestone is not None:
            events.append({
                'group_id': token.get('group_id'),
                'coin_name': token.get('coin_name'),
                'contract_address': addr,
                'multiple': milestone,
            })
            print(f"x{milestone} {addr} ({token.get('coin_name')})")

    return events


def get_top_groups_by_wins():
    # Groupe par group_id (et non group_name, pour ne pas fusionner deux groupes homonymes
    # ni casser un groupe renomme) et trie selon le classement canonique RANK_SORT.
    pipeline = [
        {
            '$group': {
                '_id': '$group_id',
                'group_name': {'$first': '$group_name'},
                'total_wins': {'$sum': '$wins'},
                'total_defeat': {'$sum': '$defeat'},
                'total_current_stat': {'$sum': '$current_stat'}
            }
        },
        {'$addFields': {'score': {'$subtract': ['$total_current_stat', '$total_defeat']}}},
        {
            '$sort': dict(RANK_SORT)
        },
        {
            '$limit': 10
        }
    ]
    
    # Run the aggregation pipeline
    top_groups = list(users_collection.aggregate(pipeline))
    
    return top_groups

def _ranked_groups():
    # Liste de tous les groupes, tries selon le classement canonique (RANK_SORT).
    return list(users_collection.aggregate([
        {
            '$group': {
                '_id': '$group_id',
                'group_name': {'$first': '$group_name'},
                'total_wins': {'$sum': '$wins'},
                'total_current_stat': {'$sum': '$current_stat'},
                'total_defeat': {'$sum': '$defeat'},
            }
        },
        {'$addFields': {'score': {'$subtract': ['$total_current_stat', '$total_defeat']}}},
        {'$sort': dict(RANK_SORT)},
    ]))


def get_ranked_groups():
    # Version publique : meme liste triee (canonique), avec group_id, group_name et stats.
    # L'index dans la liste (+1) = le rang du groupe (utilise par /poke et /rank).
    return _ranked_groups()


def get_group_position_by_wins(group_id):
    # Rang = position exacte du groupe dans le classement canonique (meme ordre que le leaderboard).
    groups = _ranked_groups()
    for index, group in enumerate(groups):
        if group['_id'] == group_id:
            return index + 1
    return f"Group {group_id} not found."

def sum_current_stat_for_group(group_id):
    # Define the query to find all documents for the specified group_name
    query = {'group_id': group_id}

    pipeline = [
        {'$match': query},
        {
            '$group': {
                '_id': '$group_id',
                'total_current_stat': {'$sum': '$current_stat'}
            }
        }
    ]

    # Run the aggregation pipeline
    result = list(users_collection.aggregate(pipeline))

    # If the group exists, return the total current_stat, otherwise return 0
    if result:
        return result[0]['total_current_stat']
    else:
        return 0  # Return 0 if no documents are found for the specified group
    
def get_group_wins(group_id):
    """
    Функция для получения суммы выигрышей по group_id.

    :param group_id: ID группы, по которой нужно суммировать количество выигрышей.
    :return: сумма выигрышей для указанной группы.
    """
    # Используем агрегатный запрос для группировки по group_id и суммирования поля wins
    pipeline = [
        {"$match": {"group_id": group_id}},  # Фильтруем по group_id
        {"$group": {"_id": "$group_id", "total_wins": {"$sum": "$wins"}}}  # Группируем по group_id и суммируем поле wins
    ]
    
    result = users_collection.aggregate(pipeline)
    total_wins = 0

    # Извлекаем результат
    for item in result:
        total_wins = item['total_wins']
    
    return total_wins

def migrate_group_id(old_group_id, new_group_id):
    # Quand un groupe basique passe en supergroupe, son id change.
    # On reporte le nouvel id sur tous les documents de l'ancien.
    result = users_collection.update_many(
        {'group_id': old_group_id},
        {'$set': {'group_id': new_group_id}}
    )
    return result.modified_count


def get_group_defeats(group_id):
    # Somme des defeats sur TOUS les tokens du groupe (et non un seul document).
    pipeline = [
        {"$match": {"group_id": group_id}},
        {"$group": {"_id": "$group_id", "total_defeats": {"$sum": "$defeat"}}}
    ]

    total_defeats = 0
    for item in users_collection.aggregate(pipeline):
        total_defeats = item['total_defeats']

    return total_defeats