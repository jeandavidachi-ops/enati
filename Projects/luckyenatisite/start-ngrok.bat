@echo off
echo Starting ngrok tunnel for your website...
echo.
echo Your Node.js server should be running on http://localhost:3001
echo Make sure your Python server is running on http://127.0.0.1:5000
echo.
echo Press Ctrl+C to stop ngrok
echo.
ngrok http 3001
