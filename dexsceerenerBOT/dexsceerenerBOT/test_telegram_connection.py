import requests
from datetime import datetime

def get_token_info(contract_address):
    url = f'https://api.dexscreener.com/latest/dex/tokens/{contract_address}'
    response = requests.get(url)
    
    if response.status_code == 200:
        return response.json()
    else:
        return None

# Тест нового формата времени
def test_creation_time_format():
    current_time = datetime.now().strftime('%d.%m.%Y %H:%M')
    print(f"Новый формат времени: {current_time}")
    print(f"Тип данных: {type(current_time)}")
    return current_time

print("=== Тест API Dexscreener ===")
print(get_token_info('BAthuAsTa3orfbbXrjNjs39VUmZNU6JFwsSMkGjpump'))

print("\n=== Тест нового формата времени ===")
test_creation_time_format()