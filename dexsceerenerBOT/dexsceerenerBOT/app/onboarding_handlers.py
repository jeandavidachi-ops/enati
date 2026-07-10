from aiogram import Bot, F, Router
from aiogram.filters import Command, CommandObject
from aiogram.types import ChatMemberUpdated, Message

from config import TOKEN, SITE_URL
import app.mongodb as md

onboarding_handlers = Router()
bot = Bot(token=TOKEN)


async def _get_group_photo(group_id):
    """URL de la photo du groupe (best-effort, meme logique que le handle des calls)."""
    try:
        chat = await bot.get_chat(group_id)
        if chat.photo:
            file = await bot.get_file(chat.photo.big_file_id)
            return f"https://api.telegram.org/file/bot{TOKEN}/{file.file_path}"
    except Exception as e:
        print('onboarding get_chat photo failed:', e)
    return None


@onboarding_handlers.my_chat_member(F.chat.type.in_({'group', 'supergroup'}))
async def on_bot_promoted(event: ChatMemberUpdated):
    """Detecte quand le bot devient ADMIN d'un groupe. On ne genere/n'inscrit rien
    a ce stade : le bot DEMANDE un invitation code. Le groupe n'entre dans la waitlist
    que via /code <code> (cf. cmd_invitation_code) avec un code valide."""
    old_status = event.old_chat_member.status
    new_status = event.new_chat_member.status

    # On ne reagit qu'a la transition -> administrator (evite les doublons quand le
    # bot etait deja admin ou que d'autres droits changent).
    if new_status != 'administrator' or old_status == 'administrator':
        return

    group_id = event.chat.id

    # Groupe deja inscrit -> on ne re-spam pas le salon.
    try:
        if md.group_is_registered(group_id):
            return
    except Exception as e:
        print('group_is_registered failed:', e)

    text = (
        "⚔️ *Welcome to Versus!*\n\n"
        "To join the Versus waitlist, this group needs a valid *invitation code* "
        "received from an already-registered guild.\n\n"
        "👉 Send it here with:\n`/code YOUR_INVITATION_CODE`\n\n"
        "Once it's valid, you'll instantly get your own one-time *referral code* "
        "to invite the next guild."
    )
    try:
        await bot.send_message(group_id, text, parse_mode='Markdown')
    except Exception as e:
        print('onboarding welcome message failed:', e)


@onboarding_handlers.message(Command('code'), F.chat.type.in_({'group', 'supergroup'}))
async def cmd_invitation_code(message: Message, command: CommandObject = None):
    """Saisie d'un invitation code par un groupe. Valide via md.redeem_invitation_code :
    si invalide -> on redemande ; si valide -> le groupe est inscrit sur la waitlist
    et recoit son propre referral code (usage unique)."""
    entered = (command.args or '').strip() if command else ''
    group_id = message.chat.id
    group_name = message.chat.title or 'Unknown'

    if not entered:
        await message.reply(
            "Please provide your invitation code:\n`/code YOUR_INVITATION_CODE`",
            parse_mode='Markdown')
        return

    group_photo = await _get_group_photo(group_id)
    try:
        status, referral = md.redeem_invitation_code(
            group_id, group_name, entered, group_photo)
    except Exception as e:
        print('redeem_invitation_code failed:', e)
        await message.reply("⚠️ Something went wrong, please try again in a moment.")
        return

    if status == 'already':
        await message.reply(
            "This group is already registered on the Versus waitlist.\n"
            f"🎟️ Your referral code: `{referral}`",
            parse_mode='Markdown')
    elif status == 'ok':
        await message.reply(
            "✅ *Registered!* This group is now on the Versus waitlist.\n\n"
            f"🎟️ *Your referral code:* `{referral}`\n"
            "Share it with the next guild you invite — it can only be redeemed once.\n\n"
            f"👉 {SITE_URL}",
            parse_mode='Markdown')
    else:  # invalid
        await message.reply(
            "❌ Invalid or already-used invitation code. Please try again with a "
            "valid one:\n`/code YOUR_INVITATION_CODE`",
            parse_mode='Markdown')
