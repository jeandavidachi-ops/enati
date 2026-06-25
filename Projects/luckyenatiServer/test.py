import requests

def get_token_info(contract_address):
    url = f'https://api.dexscreener.com/latest/dex/tokens/{contract_address}'
    response = requests.get(url)
    
    if response.status_code == 200:
        return response.json()
    else:
        return None
    

def get_token_name(contract_address):
    token_info = get_token_info(contract_address)
    
    if token_info:
        pairs = token_info.get('pairs', [])
        if pairs:
            for pair in pairs:
                return pair['baseToken']['symbol']
    
    return None

print(get_token_name('GNHW5JetZmW85vAU35KyoDcYoSd3sNWtx5RPMTDJpump'))