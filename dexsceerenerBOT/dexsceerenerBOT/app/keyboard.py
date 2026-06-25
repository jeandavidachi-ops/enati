from aiogram.types import (ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton)

choose_payment = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='💸 Crypto payment', callback_data='payment_crypto')],
    [InlineKeyboardButton(text='🌎 Stripe payment', callback_data='payment_stripe')], 
])

paid_crypto = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='I paid', callback_data='i_paid')], 
    [InlineKeyboardButton(text='🏚 Home', callback_data='home')], 
])

contact_us = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='🏚 Contact us', url='https://t.me/k1nster')], 
    [InlineKeyboardButton(text='🏚 Home', callback_data='home')], 
])

home = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='🏚 Home', callback_data='home')], 
])

admin = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='Upload files', callback_data='upload_files')],
    [InlineKeyboardButton(text='Upload photo', callback_data='upload_photo')],
    [InlineKeyboardButton(text='Upload video', callback_data='upload_video')],
    [InlineKeyboardButton(text='Delete all files', callback_data='delete_all_files')],
    [InlineKeyboardButton(text='Add category', callback_data='add_category'),
     InlineKeyboardButton(text='Add exiting product', callback_data='add_exiting_product')],
    [InlineKeyboardButton(text='Delete category', callback_data='delete_category'),
     InlineKeyboardButton(text='Delete exiting product', callback_data='delete_exiting_product')],
    [InlineKeyboardButton(text='Change welcome text', callback_data='change_welcome_text')]
])

admin_home = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text='🏚 Back', callback_data='admin_home')], 
])