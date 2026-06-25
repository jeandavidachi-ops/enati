from pymongo import MongoClient
import app.dexscreenerAPI as dex

from datetime import datetime, timedelta

# Seuils et reglages du suivi temps-reel.
WIN_RATIO = 2       # x2 du market cap initial  -> win
DEFEAT_RATIO = 0.2  # -80% du market cap initial -> defeat
MAX_TRACK_HOURS = 48  # au-dela, un token qui stagne sort en defeat

from config import MONGO_DB_URL

# MongoDB connection setup
client = MongoClient(MONGO_DB_URL)
db = client['enati']
users_collection = db['coins']

def add_or_update_coin(contract_address, coin_name, market_cap, wins, defeat, currect_stat, creation_time, group_name, group_id, group_photo):
    # Define the query to check if a document with the given contract_address and group_id exists
    query = {'contract_address': contract_address, 'group_id': group_id}
    
    # Find the existing document with the same contract_address and group_id
    existing_document = users_collection.find_one(query)
    
    if existing_document:
        # If the document with the same contract_address and group_id exists, do nothing
        return
    else:
        # If no document exists with the given contract_address and group_id, insert a new one
        new_entry = {
            'contract_address': contract_address,
            'coin_name': coin_name,
            'market_cap': market_cap,
            'wins': wins,
            'defeat': defeat,
            'current_stat': currect_stat,
            'creation_time': creation_time,
            'group_name': group_name,
            'group_id': group_id,
            'group_photo': group_photo,
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
    if not active:
        return []

    addresses = [t['contract_address'] for t in active]
    marketcaps = dex.get_marketcaps_batch(addresses)

    now = datetime.now()
    events = []  # verdicts de ce tick, remontes a run.py pour annonce dans le groupe

    for token in active:
        addr = token['contract_address']
        initial = token.get('market_cap')
        current = marketcaps.get(addr)

        update = {}

        if current is not None and initial:
            ratio = current / initial
            x_rounded = int(ratio // 2) * 2

            if x_rounded > token.get('current_stat', 0):
                update['current_stat'] = x_rounded

            if ratio >= WIN_RATIO:
                update['wins'] = 1
            elif ratio <= DEFEAT_RATIO:
                update['defeat'] = 1

        # Timeout: token qui stagne depuis trop longtemps -> defeat.
        if 'wins' not in update and 'defeat' not in update:
            created = token.get('creation_time')
            if isinstance(created, str):
                try:
                    created_dt = datetime.strptime(created, '%d.%m.%Y %H:%M')
                    if now - created_dt > timedelta(hours=MAX_TRACK_HOURS):
                        update['defeat'] = 1
                except ValueError:
                    pass

        if update:
            users_collection.update_one({'_id': token['_id']}, {'$set': update})

            if 'wins' in update or 'defeat' in update:
                verdict = 'win' if 'wins' in update else 'defeat'
                events.append({
                    'group_id': token.get('group_id'),
                    'coin_name': token.get('coin_name'),
                    'contract_address': addr,
                    'verdict': verdict,
                    'stat': update.get('current_stat', token.get('current_stat', 0)),
                })
                print(f"{'WIN ' if verdict == 'win' else 'LOSS'} {addr} ({token.get('coin_name')})")

    return events


def get_top_groups_by_wins():
    # Use an aggregation pipeline to group by group_name, sum the fields, and sort by wins
    pipeline = [
        {
            '$group': {
                '_id': '$group_name',  # Group by group_name
                'total_wins': {'$sum': '$wins'},
                'total_defeat': {'$sum': '$defeat'},
                'total_current_stat': {'$sum': '$current_stat'}
            }
        },
        {
            '$sort': {'total_wins': -1}  # Sort by total_wins in descending order
        },
        {
            '$limit': 10  # Limit to the top 10 groups
        }
    ]
    
    # Run the aggregation pipeline
    top_groups = list(users_collection.aggregate(pipeline))
    
    return top_groups

def get_group_position_by_wins(group_id):
    # First, retrieve the total wins for the specified group
    group_stats = users_collection.aggregate([
        {
            '$match': {'group_id': group_id}
        },
        {
            '$group': {
                '_id': '$group_id',
                'total_wins': {'$sum': '$wins'}
            }
        }
    ])

    group_stats = list(group_stats)
    
    if not group_stats:
        return f"Group {group_id} not found."
    
    total_wins = group_stats[0]['total_wins']
    
    # Now, count how many groups have more total_wins than this group
    position = users_collection.aggregate([
        {
            '$group': {
                '_id': '$group_id',
                'total_wins': {'$sum': '$wins'}
            }
        },
        {
            '$match': {
                'total_wins': {'$gt': total_wins}
            }
        },
        {
            '$count': 'higher_wins_count'
        }
    ])

    position_list = list(position)
    
    # If no groups have more wins, this group is in the first position
    if position_list:
        # The position will be 1 + the number of groups with higher wins
        rank = position_list[0]['higher_wins_count'] + 1
    else:
        rank = 1  # This group has the highest wins
    
    return rank

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