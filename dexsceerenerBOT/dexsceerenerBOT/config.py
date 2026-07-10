import os
from pathlib import Path
from dotenv import load_dotenv

# Charge les secrets depuis le fichier .env situé à côté de ce fichier.
load_dotenv(Path(__file__).resolve().parent / '.env')

TOKEN = os.environ['BOT_TOKEN']
MONGO_DB_URL = os.environ['MONGO_DB_URL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
ADMIN_ID = [int(x) for x in os.environ.get('ADMIN_IDS', '').split(',') if x.strip()]
# URL publique du site (page racine "Versus Guild Portal") postee dans le salon
# quand le bot est promu admin, pour que le groupe aille s'inscrire avec son code.
SITE_URL = os.environ.get('SITE_URL', 'http://localhost:8080')
