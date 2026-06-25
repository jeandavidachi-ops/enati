import sqlite3
from datetime import datetime, timedelta

class Database:
    def __init__(self, db_file):
        self.connection = sqlite3.connect(db_file)
        self.cursor = self.connection.cursor()
        self._init_tables()

    def _init_tables(self):
        # Cree les tables si elles n'existent pas (indispensable sur un conteneur vierge, ex: Railway).
        with self.connection:
            self.cursor.execute(
                "CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY)"
            )
            self.cursor.execute(
                "CREATE TABLE IF NOT EXISTS countcalls ("
                "contract_address TEXT PRIMARY KEY, count INTEGER DEFAULT 0)"
            )

    # USERS TABLE
        
    def user_exists(self, user_id):
        with self.connection:
            result = self.cursor.execute('select * from users where user_id = ?', (user_id,)).fetchall()
            return bool(len(result))
        
    def add_user(self, user_id):
        with self.connection:
            return self.cursor.execute("INSERT INTO users (user_id) VALUES (?)", (user_id,))
    
    # COUNT CALLS TABLE

    def contract_address_exists(self, contract_address):
        with self.connection:
            result = self.cursor.execute('SELECT * FROM countcalls WHERE contract_address = ?', (contract_address,)).fetchall()
            return bool(len(result))
    
    def increment_contract_count(self, contract_address):
        with self.connection:
            self.cursor.execute("UPDATE countcalls SET count = count + 1 WHERE contract_address = ?", (contract_address,))
            self.connection.commit()

    def add_contract_address(self, contract_address):
        with self.connection:
            if not self.contract_address_exists(contract_address):
                self.cursor.execute("INSERT INTO countcalls (contract_address, count) VALUES (?, ?)", (contract_address, 1))
                self.connection.commit()
            else:
                self.increment_contract_count(contract_address)

    def get_contract_count(self, contract_address):
        with self.connection:
            result = self.cursor.execute('SELECT count FROM countcalls WHERE contract_address = ?', (contract_address,)).fetchone()
            # Return count if the record exists, otherwise return 0
            return result[0] if result else 0