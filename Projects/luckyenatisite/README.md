# ENATI - Cryptocurrency Battle Platform

Веб-приложение для просмотра криптовалютных битв и предсказания победителей.

## Настройка проекта

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка Python сервера

Убедитесь, что ваш Python сервер запущен на порту 5000 и имеет следующий API endpoint:

```python
@app.route('/api/top-groups', methods=['GET'])
def get_top_groups():
    try:
        top_groups = get_top_groups_by_wins()
        return jsonify({
            'success': True,
            'data': top_groups,
            'message': 'Top 3 groups retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to retrieve top groups'
        }), 500
```

### 3. Запуск приложения

```bash
# Запуск в режиме разработки
npm run dev

# Запуск в продакшн режиме
npm start
```

Приложение будет доступно по адресу: http://localhost:3001

## Структура проекта

```
luckyenatisite/
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   ├── images/
│   └── index.html
├── src/
│   └── server.js
├── package.json
└── README.md
```

## API Endpoints

- `GET /api/top-groups` - Получение топ-3 групп по количеству побед
- `GET /` - Главная страница
- `GET /leaderboards` - Страница лидербордов

## Функциональность

- Отображение топ-3 групп с их статистикой (победы, поражения, текущий статус)
- Адаптивный дизайн для мобильных устройств
- Анимации и интерактивные элементы
- Состояния загрузки и обработка ошибок

## Технологии

- Frontend: HTML5, CSS3, JavaScript (ES6+)
- Backend: Node.js, Express.js
- API: REST API с прокси к Python серверу
- Стилизация: CSS Grid, Flexbox, CSS Animations
