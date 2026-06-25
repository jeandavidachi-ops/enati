# Интеграция изображений токенов в ENATI

## Описание

Добавлена функциональность для автоматического получения и отображения изображений токенов из API DexScreener в таблицах монет на сайте ENATI.

## Что было добавлено

### 1. Новые API endpoints в Node.js сервере
- `/api/token-image/:contractAddress` - проксирует запросы к Python серверу для получения изображений токенов
- `/api/all-groups-stats` - проксирует запросы к Python серверу для получения статистики всех групп

### 2. JavaScript функции для работы с изображениями токенов
- `getTokenImage(contractAddress)` - получает URL изображения токена из API
- `updateCoinAvatar(avatarElement, contractAddress, fallbackImage)` - обновляет аватар монеты изображением токена
- `updateAllTokenImages(allTopCoins, displayOrder, groups)` - обновляет изображения для всех монет в группах
- `updateModalTokenImages(coins)` - обновляет изображения токенов в модальном окне

### 3. Обновленная функциональность лидерборда
- Интеграция с новым API `/api/all-groups-stats` для отображения всех групп
- Отображение фотографий групп, винрейта, максимального множителя и общего количества игр
- Улучшенная функция поиска и сортировки
- Loading состояния и обработка ошибок

### 4. Обновленные стили CSS
- Добавлены стили для изображений токенов в основной таблице и модальном окне
- Добавлены стили для фотографий групп
- Добавлены эффекты hover для изображений токенов
- Обновлена сетка в модальном окне для размещения аватаров токенов
- Добавлены стили для loading состояний

### 5. Тестовые страницы
- `/test-token-images` - страница для тестирования работы API получения изображений токенов
- `/test-groups-stats` - страница для тестирования работы API статистики всех групп

## Как это работает

### Основная страница (index.html)
1. При загрузке страницы вызывается `loadTopGroups()`
2. Для каждой группы загружаются топ-5 монет через `/api/top-coins/:groupId`
3. Создаются карточки групп с монетами
4. Для каждой монеты, если есть `contract_address`, вызывается `updateCoinAvatar()`
5. Функция `getTokenImage()` получает URL изображения из вашего Python API
6. Изображение токена заменяет стандартный аватар

### Страница лидерборда (leaderboards.html)
1. При загрузке страницы вызывается `loadLeaderboardData()`
2. Загружаются данные всех групп через `/api/all-groups-stats`
3. Отображается таблица со всеми группами, включая:
   - Фотографию группы (если есть)
   - Название группы
   - Винрейт (с цветовой индикацией)
   - Максимальный множитель
   - Общее количество игр
   - Кнопку "About" для просмотра топ-5 монет группы
4. При нажатии кнопки "About" открывается модальное окно с топ-5 монетами группы
5. Для каждой монеты в модальном окне загружается изображение токена
6. Работает поиск по названию группы, позиции, винрейту и множителю
7. Работает сортировка по винрейту

### Обработка ошибок
- Если API недоступен или возвращает ошибку, используется fallback изображение
- Если изображение токена не загружается, автоматически возвращается к fallback
- Все ошибки логируются в консоль браузера

## Требования

### Python сервер
Ваш Python сервер должен иметь endpoints:
```python
@app.route('/api/token-image/<contract_address>', methods=['GET'])
def get_token_image_endpoint(contract_address):
    result = get_token_image(contract_address)
    return jsonify(result)

@app.route('/api/all-groups-stats', methods=['GET'])
def get_all_groups_stats_endpoint():
    result = get_all_groups_stats()
    return jsonify(result)
```

### Структура данных
- Монеты в базе данных должны содержать поле `contract_address` с адресом контракта токена
- Группы должны содержать поля: `group_id`, `group_name`, `group_photo`, `total_wins`, `total_defeats`, `max_current_stat`, `total_members`, `win_rate`

## Тестирование

1. Запустите Node.js сервер: `npm start`
2. Убедитесь, что Python сервер работает на `http://127.0.0.1:5000`
3. Откройте тестовые страницы:
   - `http://localhost:3001/test-token-images` - для тестирования изображений токенов
   - `http://localhost:3001/test-groups-stats` - для тестирования статистики групп
4. Проверьте, что изображения токенов и данные групп загружаются корректно
5. Откройте страницу лидерборда: `http://localhost:3001/leaderboards`
6. Проверьте, что все группы отображаются с правильными данными

## Примеры использования

### Получение изображения токена
```javascript
const imageUrl = await getTokenImage('BAthuAsTa3orfbbXrjNjs39VUmZNU6JFwsSMkGjpump');
if (imageUrl) {
    console.log('Token image URL:', imageUrl);
}
```

### Обновление аватара монеты
```javascript
const avatarElement = document.querySelector('.entry-avatar');
await updateCoinAvatar(avatarElement, 'BAthuAsTa3orfbbXrjNjs39VUmZNU6JFwsSMkGjpump', 'avatar-purple-orange.png');
```

## Структура ответа API

### Token Image API
Ожидаемый ответ от Python API:
```json
{
    "success": true,
    "image_url": "https://dd.dexscreener.com/ds-data/tokens/solana/BAthuAsTa3orfbbXrjNjs39VUmZNU6JFwsSMkGjpump.png?key=fd28c9",
    "token_name": "Gemini NanoBanana",
    "token_symbol": "NB"
}
```

### All Groups Stats API
Ожидаемый ответ от Python API:
```json
{
    "success": true,
    "data": [
        {
            "group_id": 1,
            "group_name": "Alpha Team",
            "group_photo": "https://example.com/photo1.jpg",
            "total_wins": 150,
            "total_defeats": 50,
            "max_current_stat": 2500,
            "total_members": 10,
            "win_rate": 75.0
        }
    ],
    "total_groups": 1,
    "message": "Successfully retrieved statistics for 1 groups"
}
```

### В случае ошибки:
```json
{
    "success": false,
    "error": "Error message"
}
```

## Примечания

- Изображения токенов кэшируются браузером автоматически
- Fallback изображения используются при любых ошибках
- Все запросы к API асинхронные и не блокируют интерфейс
- Добавлена обработка ошибок сети и загрузки изображений
