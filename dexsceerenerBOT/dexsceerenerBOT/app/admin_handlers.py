import asyncio
from aiogram import Bot, Dispatcher, F, types, Router
from aiogram.types import Message, CallbackQuery, ContentType
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, KeyboardButton

from datetime import datetime
import random

from aiogram.filters import Command

import app.keyboard as kb
from app.db import Database
from config import TOKEN, ADMIN_PASSWORD

admin_handlers = Router()
bot = Bot(token=TOKEN)
db = Database('database.db')

class adminStates(StatesGroup):
    password = State()

@admin_handlers.message(Command('admin'))
async def cmd_admin(message: Message, state:FSMContext):
    await message.answer('Enter the access password to log in to the admin panel')

    await state.set_state(adminStates.password)

@admin_handlers.message(adminStates.password)
async def cmd_enter_password(message: Message, state:FSMContext):
    message_text = message.text

    if message_text == ADMIN_PASSWORD:
        await message.answer('You have successfully logged in as an administrator', reply_markup=kb.admin)
        await state.clear()
    else:
        pass

