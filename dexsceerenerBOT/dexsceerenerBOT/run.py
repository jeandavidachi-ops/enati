import asyncio
from aiogram import Bot, Dispatcher
from aiogram.exceptions import TelegramMigrateToChat
from config import TOKEN
from app.user_handlers import user_handlers
from app.admin_handlers import admin_handlers
import app.mongodb as md

bot = Bot(token=TOKEN)
dp = Dispatcher()

# Suivi temps-reel : toutes les 5 secondes on recalcule le verdict (win/defeat)
# des tokens encore en cours, a partir de leur market cap courant.
WATCH_INTERVAL = 5

async def market_watcher():
    while True:
        try:
            events = await md.process_active_tokens()
            for ev in events or []:
                text = f"🚀 {ev['coin_name']} just hit {ev['multiple']}x! 🔥"
                try:
                    await bot.send_message(ev['group_id'], text)
                except TelegramMigrateToChat as e:
                    # Le groupe est devenu un supergroupe -> nouvel id. On corrige et on renvoie.
                    new_id = e.migrate_to_chat_id
                    md.migrate_group_id(ev['group_id'], new_id)
                    print(f"group {ev['group_id']} migrated -> {new_id}, retrying")
                    try:
                        await bot.send_message(new_id, text)
                    except Exception as e2:
                        print('send milestone error after migrate:', e2)
                except Exception as e:
                    print('send milestone error:', e)
        except Exception as e:
            print('watcher error:', e)
        await asyncio.sleep(WATCH_INTERVAL)

async def main():
    dp.include_router(user_handlers)
    dp.include_router(admin_handlers)

    # Lance le watcher en parallele du polling Telegram.
    asyncio.create_task(market_watcher())

    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
