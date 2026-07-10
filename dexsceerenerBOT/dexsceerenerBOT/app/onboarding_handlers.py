from aiogram import Bot, F, Router
from aiogram.types import ChatMemberUpdated

from config import TOKEN, SITE_URL
import app.mongodb as md

onboarding_handlers = Router()
bot = Bot(token=TOKEN)


@onboarding_handlers.my_chat_member(F.chat.type.in_({'group', 'supergroup'}))
async def on_bot_promoted(event: ChatMemberUpdated):
    """Detecte quand le bot devient ADMIN d'un groupe. Le backend genere alors un
    code d'invitation (+ referral), enregistre le groupe dans la waitlist, et le
    bot poste le code dans le salon pour que le groupe s'inscrive sur le site."""
    old_status = event.old_chat_member.status
    new_status = event.new_chat_member.status

    # On ne reagit qu'a la transition -> administrator (evite les doublons quand le
    # bot etait deja admin ou que d'autres droits changent).
    if new_status != 'administrator' or old_status == 'administrator':
        return

    group_id = event.chat.id
    group_name = event.chat.title or 'Unknown'

    # Photo du groupe (meme logique que le handle des calls), best-effort.
    group_photo = None
    try:
        chat = await bot.get_chat(group_id)
        if chat.photo:
            file = await bot.get_file(chat.photo.big_file_id)
            group_photo = f"https://api.telegram.org/file/bot{TOKEN}/{file.file_path}"
    except Exception as e:
        print('onboarding get_chat photo failed:', e)

    try:
        code, referral_code, already = md.register_group_promotion(
            group_id, group_name, group_photo)
    except Exception as e:
        print('register_group_promotion failed:', e)
        return

    # Groupe deja onboarde -> on ne re-spam pas le salon.
    if already:
        return

    text = (
        "⚔️ *Welcome to Versus!*\n\n"
        "This group is now registered on the Versus waitlist.\n\n"
        f"🔑 *Invitation code:* `{code}`\n"
        f"🎟️ *Referral code:* `{referral_code}`\n\n"
        f"👉 Go to {SITE_URL} and *Register* with your invitation code to unlock your dashboard."
    )
    try:
        await bot.send_message(group_id, text, parse_mode='Markdown')
    except Exception as e:
        print('onboarding welcome message failed:', e)
