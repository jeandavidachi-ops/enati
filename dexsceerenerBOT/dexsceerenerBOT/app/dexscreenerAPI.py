import requests

def get_token_info(contract_address):
    url = f'https://api.dexscreener.com/latest/dex/tokens/{contract_address}'
    response = requests.get(url)
    
    if response.status_code == 200:
        return response.json()
    else:
        return None
    
def get_token_marketcap(contract_address):
    token_info = get_token_info(contract_address)
    
    if token_info:
        pairs = token_info.get('pairs', [])
        if pairs:
            for pair in pairs:
                if 'fdv' in pair:
                    return pair['fdv']
    
    return None

def get_token_name(contract_address):
    token_info = get_token_info(contract_address)

    if token_info:
        pairs = token_info.get('pairs', [])
        if pairs:
            for pair in pairs:
                return pair['baseToken']['symbol']

    return None


def get_marketcaps_batch(addresses):
    """
    Recupere le market cap (fdv) de plusieurs tokens en une seule requete.
    DexScreener accepte jusqu'a 30 adresses par appel.
    Retourne un dict {adresse: fdv}. Les adresses absentes (token pas encore
    reference sur un DEX) ne sont simplement pas dans le dict.
    """
    result = {}
    if not addresses:
        return result

    # Decoupe en lots de 30 (limite de l'endpoint).
    for i in range(0, len(addresses), 30):
        chunk = addresses[i:i + 30]
        url = f"https://api.dexscreener.com/latest/dex/tokens/{','.join(chunk)}"
        try:
            response = requests.get(url, timeout=10)
        except requests.RequestException:
            continue

        if response.status_code != 200:
            continue

        pairs = response.json().get('pairs') or []
        for pair in pairs:
            addr = pair.get('baseToken', {}).get('address')
            fdv = pair.get('fdv')
            if not addr or fdv is None:
                continue
            # On garde la paire la plus liquide pour un meme token.
            liq = (pair.get('liquidity') or {}).get('usd', 0) or 0
            prev = result.get(addr)
            if prev is None or liq > prev[1]:
                result[addr] = (fdv, liq)

    # On ne renvoie que le fdv.
    return {addr: val[0] for addr, val in result.items()}