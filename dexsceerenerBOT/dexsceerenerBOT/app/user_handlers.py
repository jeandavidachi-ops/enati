import asyncio
from aiogram import Bot, Dispatcher, F, types, Router
from aiogram.types import Message, CallbackQuery, ContentType
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, KeyboardButton
from aiogram.filters import Command, CommandObject, StateFilter
from aiogram.exceptions import TelegramMigrateToChat

from datetime import datetime, timedelta
import re
import time

import app.keyboard as kb
from app.db import Database
from config import TOKEN, ADMIN_ID, MONGO_DB_URL, ADMIN_PASSWORD

import app.dexscreenerAPI as dex
import app.mongodb as md

from pymongo import MongoClient

# MongoDB connection setup
client = MongoClient(MONGO_DB_URL)
db = client['enati']
users_collection = db['coins']
# Liaison compte web <-> Telegram via deep-link /start <token> (memes collections que le site).
app_users = db['app_users']
tg_link_tokens = db['tg_link_tokens']

user_handlers = Router()
bot = Bot(token=TOKEN)
db = Database('database.db')

class userStates(StatesGroup):
    token_info = State()
    reset_password = State()

# ----------- START COMMAND ------------

def format_marketcap(marketcap):
    try:
        if isinstance(marketcap, str):
            marketcap = int(float(marketcap.replace(",", "")))  # Убираем запятые и приводим к int
        elif isinstance(marketcap, float):  
            marketcap = int(marketcap)  # Округляем float в int
        elif isinstance(marketcap, int):
            pass  # Если уже int, оставляем как есть
        else:
            return str(marketcap)  # Если это не str, не float и не int, просто возвращаем как строку

        if marketcap >= 1_000_000_000:
            return f"{marketcap / 1_000_000_000:.1f}B"
        elif marketcap >= 1_000_000:
            return f"{marketcap / 1_000_000:.1f}M"
        elif marketcap >= 1_000:
            return f"{marketcap / 1_000:.1f}K"
        else:
            return str(marketcap)
    except ValueError:
        return str(marketcap)  # Если не число, возвращаем как строку

def _link_web_account(token, tg_user):
    """Relie un compte web au compte Telegram via un jeton (deep-link). Renvoie
    True si un jeton valide et non utilise a ete consomme."""
    doc = tg_link_tokens.find_one({'token': token, 'used': False})
    if not doc:
        return False
    tg = {
        'id': tg_user.id,
        'username': tg_user.username,
        'firstName': tg_user.first_name,
        'photoUrl': None,
        'linkedAt': time.time(),
    }
    app_users.update_one({'id': doc['user_id']}, {'$set': {'telegram': tg}})
    tg_link_tokens.update_one({'_id': doc['_id']}, {'$set': {'used': True}})
    return True


@user_handlers.message(Command('start'))
async def cmd_start(message:Message, state:FSMContext, command: CommandObject = None):
    user_id = message.from_user.id

    if not db.user_exists(user_id):
        db.add_user(user_id)

    # Deep-link de liaison : /start <token> depuis le site (Manage Account).
    token = (command.args or '').strip() if command else ''
    if token:
        if _link_web_account(token, message.from_user):
            await message.answer('✅ Your Telegram account is now linked to Versus. You can go back to the site.')
        else:
            await message.answer('⚠️ Invalid or expired link. Please restart from the site.')
        return

    await message.answer(
        f'*🚀 Welcome to Our Bot*\n\n'
        f'🤖 This bot provides up-to-date information on various cryptocurrencies. '
        f'You can easily find out the target audience, market value, and holders of any cryptocurrency.\n\n'
        f'*Available commands:*\n'
        f'• `/leaderboard` — _View the leaderboard of top cryptocurrencies._\n'
        f'• `/token_info <contract address>` — _Get detailed information about a specific token._\n'
        f"• `/countcalls <contract_address>` — _Show the count of calls for a specific token address._\n\n"
        f'Get started now and explore the world of crypto! 💰',
    parse_mode='Markdown'
)
    
@user_handlers.message(F.text.startswith('/leaderboard'))
async def cmd_leaderboard(message: Message, state: FSMContext):
    # Fetch the top 10 groups sorted by wins from the database
    top_groups = md.get_top_groups_by_wins()
    
    # Prepare the leaderboard message
    leaderboard_text = "*📊 Leaderboard: ⚡️ TOP GROUPS ⚡️*\n\n"
    
    # Iterate over the top groups and add them to the leaderboard message
    for index, group in enumerate(top_groups):
        place = index + 1
        emoji = '🥇' if place == 1 else '🥈' if place == 2 else '🥉' if place == 3 else ''
        position = 'st' if place == 1 else 'nd' if place == 2 else 'rd' if place == 3 else 'th'
        leaderboard_text += (
            f"{emoji} *{place}{position} Place:* {group.get('group_name', 'Unknown')}\n"
            f"🔥 Currect Stat: *{group['total_current_stat']}x*\n"
            f"🏆 Wins: *{group['total_wins']}*\n"
            f"💀 Defeat: *{group['total_defeat']}*\n\n"
        )
    
    # Add a call to action
    leaderboard_text += (
        "⚔️ Compete, track stats, and climb the leaderboard with your group!"
    )
    
    # Send the message
    await message.answer(leaderboard_text, parse_mode='Markdown')

# ---------- TOKEN INFO --------------

@user_handlers.message(F.text.startswith('/token_info'))
async def cmd_token_info(message: Message, state: FSMContext):
    # Извлечение контрактного адреса из команды
    command_parts = message.text.split()

    if len(command_parts) > 1:
        contract_address = command_parts[1]  # Получаем второй элемент, который является контрактным адресом
        await message.answer(
            f"🔍 *Token Information*\n\n"
            f"Fetching information for token address: `{contract_address}`\n\n"
            f"Please wait a moment... 💹",
            parse_mode='Markdown',
        )
        
        # Здесь можно вызвать функцию для получения информации о токене и отправки ответа
        token_info = dex.get_token_info(contract_address)  # Вызов функции для получения информации о токене
        
        if token_info:
            pairs = token_info.get('pairs', [])
            
            info_message = f"🔍 *Token Information*\n\n"

            if pairs:
                db.add_contract_address(contract_address)
                for pair in pairs:
                    info_message += (
                        f"💰 *Market Cap*: `{pair['fdv']} USD`\n"
                        f"🏦 *Exchange*: `{pair['dexId']}`\n"
                        f"🔄 *Pair*: `{pair['baseToken']['symbol']} / {pair['quoteToken']['symbol']}`\n"
                        f"💵 *Price*: `{pair['priceUsd']} USD`\n"
                        f"💧 *Liquidity*: `{pair['liquidity']['usd']} USD`\n"
                        f"📊 *Volume (24h)*: `{pair['volume']['h24']} USD`\n"
                        "-----------------------------\n"
                    )
                await message.answer(info_message, parse_mode='Markdown')
            else:
                await message.answer(f"{info_message}No pairs data found for this token.")
        else:
            await message.answer("Error: Unable to fetch token info or token does not exist.")
    else:
        await message.answer(
            "❌ Please provide a valid token address after the command.\n\n"
            "Example: `/token_info 0x1234567890abcdef1234567890abcdef12345678`",
            parse_mode='Markdown',
        )
# --------- COUNT CALLS ------------
@user_handlers.message(F.text.startswith('/countcalls'))
async def cmd_token_info(message: Message, state: FSMContext):
    # Extracting contract address from the command
    command_parts = message.text.split()

    if len(command_parts) > 1:
        contract_address = command_parts[1]  # Get the second element, which is the contract address
        count_calls = db.get_contract_count(contract_address)
        await message.answer(
            f"🔍 *Token Information*\n\n"
            f"📌 *Contract Address:* `{contract_address}`\n\n"
            f"📈 *Total Requests:* `{count_calls}`",
            parse_mode='Markdown',
        )
    else:
        await message.answer(
            "❌ Please provide a valid token address after the command.\n\n"
            "Example: `/countcalls 0x1234567890abcdef1234567890abcdef12345678`",
            parse_mode='Markdown',
        )

# --------------------------------------------------------- GROUP COMMANDS ------------------------------------------------------------------

@user_handlers.message(StateFilter(None), ~F.text.startswith('/'), F.text.regexp(r'([0-9a-zA-Z]{20})'))
async def handle_contract_address(message: Message, state: FSMContext):

    await message.answer('Processing... ⚔️⚔️⚔️')
    
    address = message.text
    dexscreener_marketcap = dex.get_token_marketcap(address)
    
    if dexscreener_marketcap:
        
        group_username = message.chat.title
        group_id = message.chat.id

        # Auteur du call (pour la page de profil du groupe / Top Callers).
        caller = message.from_user
        caller_id = caller.id if caller else None
        caller_username = caller.username if caller else None
        caller_name = caller.full_name if caller else None

        group_current_stat = md.sum_current_stat_for_group(group_id)

        info_message = "⚔️ ENATI\n\n"

        marketcap = dex.get_token_marketcap(address)
        coin_name = dex.get_token_name(address)

        marketcap_text = format_marketcap(marketcap)


        creation_time = datetime.now().strftime('%d.%m.%Y %H:%M')

        chat = await bot.get_chat(message.chat.id)
        if chat.photo:
            file_id = chat.photo.big_file_id
            file = await bot.get_file(file_id)
            group_photo = f"https://api.telegram.org/file/bot{TOKEN}/{file.file_path}"
        else:
            group_photo = 'None'

        md.add_or_update_coin(address, coin_name, marketcap, 0, 0, 0, creation_time, group_username, group_id, group_photo,
                              caller_id=caller_id, caller_username=caller_username, caller_name=caller_name)
        group_position = md.get_group_position_by_wins(group_id)

        info_message += (
            f"👥 *Group Name:* {group_username}\n"
            f"🔄 *Scanned Coin Name:* {coin_name} / SOL\n"
            f"💰 *Market Cap*: `{marketcap_text} USD`\n"
            f"📍 *Position on Leaderboards:* {group_position}\n"
            f"⚡️ *Current Score (X's):* {group_current_stat}x\n"
        )

        image_url = dex.get_token_image_url(address)
        if image_url:
            try:
                await bot.send_photo(message.chat.id, photo=image_url,
                                     caption=info_message, parse_mode='Markdown')
            except Exception:
                # Image injoignable (URL invalide / IPFS lent) -> carte en texte seul.
                await message.answer(info_message, parse_mode='Markdown')
        else:
            await message.answer(info_message, parse_mode='Markdown')
        await message.answer('⚔️ Ranking ✅')
    else:
        # Token introuvable sur DexScreener -> on ne l'enregistre pas (pas de suivi possible).
        await message.answer(
            "❌ This token isn't available on DexScreener yet, so it can't be tracked."
        )

@user_handlers.message(F.text.startswith('/wins'), F.chat.type.in_({'group', 'supergroup'}))
async def cmd_wins(message: Message, state: FSMContext):
    group_id = message.chat.id
    
    wins = md.get_group_wins(group_id)
    await message.answer(f"🏆 *Wins for Group:* {wins}", parse_mode='Markdown')
    

@user_handlers.message(F.text.startswith('/defeats'), F.chat.type.in_({'group', 'supergroup'}))
async def cmd_defeats(message: Message, state: FSMContext):
    group_id = message.chat.id
    
    defeats = md.get_group_defeats(group_id)
    await message.answer(f"💀 *Defeats for Group:* {defeats}", parse_mode='Markdown')
    
@user_handlers.message(F.text.startswith('/rank'), F.chat.type.in_({'group', 'supergroup'}))
async def cmd_rank(message: Message, state: FSMContext):
    group_id = message.chat.id
    
    try:
        position = int(md.get_group_position_by_wins(group_id))
    except Exception as e:
        await message.answer('⚡️ Your group is not yet registered in our system. Scan the contract address of the coin to register.')
        return
    
    emoji = '🥇' if position == 1 else '🥈' if position == 2 else '🥉' if position == 3 else ''
    
    if position:
        if position <= 3:
            await message.answer(f"{emoji} *Group Rank:* #{position}", parse_mode='Markdown')
        else:
            await message.answer(f"🏆 *Group Rank:* #{position}", parse_mode='Markdown')
    else:
        await message.answer("ℹ️ Your group is not ranked yet.", parse_mode='Markdown')
        
        
@user_handlers.message(F.text.startswith('/reset'))
async def cmd_reset(message: Message, state: FSMContext):
    user_id = message.from_user.id

    if user_id in ADMIN_ID:
        await message.answer("🔒 Enter the reset password:")
        await state.set_state(userStates.reset_password)


@user_handlers.message(userStates.reset_password)
async def cmd_reset_confirm(message: Message, state: FSMContext):
    if message.text == ADMIN_PASSWORD:
        users_collection.delete_many({})
        await message.answer("🔄 *All groups have been reset.*", parse_mode='Markdown')
    else:
        await message.answer("❌ Password is wrong.")

    await state.clear()
        
# ---------- POKE (message inter-groupes) ----------

POKE_COOLDOWN = 30  # secondes entre deux pokes pour un meme groupe (anti-spam)
_poke_last = {}     # group_id -> timestamp du dernier poke envoye


@user_handlers.message(Command('poke'), F.chat.type.in_({'group', 'supergroup'}))
async def cmd_poke(message: Message, state: FSMContext):
    # Restreint aux groupes (silencieux en prive via le filtre ci-dessus).
    parts = message.text.split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip():
        await message.answer("Usage: /poke <group name> <message>")
        return
    rest = parts[1].strip()

    sender_id = message.chat.id
    groups = md.get_ranked_groups()
    rank_of = {g['_id']: i + 1 for i, g in enumerate(groups)}

    if sender_id not in rank_of:
        await message.answer("Your group isn't ranked yet. Scan a token first.")
        return

    # Anti-spam: cooldown par groupe.
    now = time.time()
    elapsed = now - _poke_last.get(sender_id, 0)
    if elapsed < POKE_COOLDOWN:
        await message.answer(f"⏳ Slow down — wait {int(POKE_COOLDOWN - elapsed)}s before poking again.")
        return

    # Cible par nom : on prend le nom de groupe le plus long qui prefixe le texte (gere les espaces).
    rest_lower = rest.lower()
    candidates = [
        g for g in groups
        if g.get('group_name') and g['_id'] != sender_id
        and rest_lower.startswith(g['group_name'].lower())
    ]
    if not candidates:
        await message.answer("Group not found.")
        return
    target = max(candidates, key=lambda g: len(g['group_name']))
    poke_msg = rest[len(target['group_name']):].strip()
    if not poke_msg:
        await message.answer("Add a message after the group name.")
        return

    sender_rank = rank_of[sender_id]
    target_rank = rank_of[target['_id']]
    if target_rank <= sender_rank:
        await message.answer("You can only poke groups ranked below yours.")
        return

    sender_title = message.chat.title or "A group"
    text = f"📣 Poke from {sender_title} (#{sender_rank}):\n\n{poke_msg}"

    try:
        await bot.send_message(target['_id'], text)
    except TelegramMigrateToChat as e:
        # Le groupe cible est devenu un supergroupe -> on corrige l'id et on renvoie.
        new_id = e.migrate_to_chat_id
        md.migrate_group_id(target['_id'], new_id)
        try:
            await bot.send_message(new_id, text)
        except Exception:
            await message.answer("Couldn't reach that group (the bot may not be a member).")
            return
    except Exception:
        await message.answer("Couldn't reach that group (the bot may not be a member).")
        return

    _poke_last[sender_id] = now
    await message.answer(f"✅ Poke sent to {target['group_name']}.")


@user_handlers.message(F.text.startswith('/help'))
async def cmd_reset(message: Message, state: FSMContext):
    message_text = (
        "📖 WELCOME TO THE Versus HELP SECTION\n\n"
        "📊 Leaderboard & Stats:\n\n"
        "/wins – Displays the group's total wins (number of tokens that reached 2x of their call). 🏆\n\n"
        "/rank – Shows the group's current ranking on the leaderboard. 📈\n\n"
        "/defeats – Lists the number of tokens that dropped to -80% of their call. 💀\n\n"
        "/poke <group> <message> – Send a message to a group ranked below yours. 📣\n\n"
        "⚔️ Compete, track stats, and climb the leaderboard with your group!"
    )
    
    await message.answer(message_text, parse_mode='Markdown')