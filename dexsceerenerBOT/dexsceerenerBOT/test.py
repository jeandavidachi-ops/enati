import requests
import time

etherscan_api_key = "NU222MQW1D4CJTYH8VHNABD48DEJMHP8SR"
contract_address = "0x1121AcC14c63f3C872BFcA497d10926A6098AAc5"
etherscan_base_url = "https://api.etherscan.io/api"

def check_purchases():
    url = f"{etherscan_base_url}?module=account&action=tokentx&contractaddress={contract_address}&startblock=0&endblock=99999999&sort=asc&apikey={etherscan_api_key}"
    response = requests.get(url)
    data = response.json()

    if data["status"] == "1":
        for tx in data["result"]:
            if tx["to"] != "0x0000000000000000000000000000000000000000":  # Фильтрация по "to" для определения покупки
                print(f"Покупка токена: {int(tx['value']) / (10 ** int(tx['tokenDecimal']))} {tx['tokenSymbol']} от {tx['from']}")
    else:
        print("Нет данных или произошла ошибка при запросе")

while True:
    check_purchases()
    time.sleep(60)  # Повторять запрос каждую минуту
