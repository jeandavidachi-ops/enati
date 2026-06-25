import os
from pathlib import Path

from flask import Flask, jsonify, request
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
def leaderboards_page():
    return app.send_static_file('leaderboards.html')


# MongoDB connection setup
MONGO_DB_URL = os.environ['MONGO_DB_URL']
client = MongoClient(MONGO_DB_URL)
db = client['enati']
users_collection = db['coins']

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
        {
            '$sort': {'total_wins': -1}  # Sort by total_wins in descending order
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

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Server is running'
    }), 200

def get_token_image(contract_address):
    """
    Получает URL изображения токена по контрактному адресу
    """
    try:
        url = f'https://api.dexscreener.com/latest/dex/tokens/{contract_address}'
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            
            # Проверяем, есть ли пары
            if 'pairs' in data and len(data['pairs']) > 0:
                # Берем первую пару (обычно самая активная)
                first_pair = data['pairs'][0]
                
                # Проверяем, есть ли информация об изображении
                if 'info' in first_pair and 'imageUrl' in first_pair['info']:
                    return {
                        'success': True,
                        'image_url': first_pair['info']['imageUrl'],
                        'token_name': first_pair['baseToken']['name'],
                        'token_symbol': first_pair['baseToken']['symbol']
                    }
                else:
                    return {
                        'success': False,
                        'error': 'Image URL not found for this token'
                    }
            else:
                return {
                    'success': False,
                    'error': 'No trading pairs found for this token'
                }
        else:
            return {
                'success': False,
                'error': f'API request failed with status code: {response.status_code}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': f'Error fetching token image: {str(e)}'
        }

@app.route('/api/token-image/<contract_address>', methods=['GET'])
def get_token_image_endpoint(contract_address):
    """
    API endpoint для получения изображения токена
    """
    result = get_token_image(contract_address)
    return jsonify(result)

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
                    'max_current_stat': {'$max': '$current_stat'},
                    'total_members': {'$sum': 1}  # Количество записей в группе
                }
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
                '$sort': {'total_wins': -1}  # Сортировка по количеству побед
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
