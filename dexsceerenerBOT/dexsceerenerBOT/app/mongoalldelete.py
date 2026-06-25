import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

# Charge le meme .env que le bot (un niveau au-dessus de ce fichier app/).
load_dotenv(Path(__file__).resolve().parents[1] / '.env')

# MongoDB connection setup
client = MongoClient(os.environ['MONGO_DB_URL'])
db = client['enati']
users_collection = db['coins']

# Securite: vider toute la collection est destructif, on demande confirmation.
if input('Vider TOUTE la collection coins ? Tape OUI pour confirmer: ') == 'OUI':
    print(users_collection.delete_many({}))
else:
    print('Annule.')
