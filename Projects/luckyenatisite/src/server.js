const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Proxy endpoint для Python сервера
app.get('/api/top-groups', async (req, res) => {
    try {
        // URL вашего Python сервера
        const pythonServerUrl = 'http://127.0.0.1:5000/api/top-groups';
        
        const response = await fetch(pythonServerUrl);
        const data = await response.json();
        
        res.json(data);
    } catch (error) {
        console.error('Error proxying to Python server:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to connect to Python server'
        });
    }
});

// Proxy endpoint для получения топ-5 монет группы
app.get('/api/top-coins/:groupId', async (req, res) => {
    try {
        const groupId = req.params.groupId;
        // URL вашего Python сервера
        const pythonServerUrl = `http://127.0.0.1:5000/api/top-coins/${encodeURIComponent(groupId)}`;
        
        const response = await fetch(pythonServerUrl);
        const data = await response.json();
        
        res.json(data);
    } catch (error) {
        console.error('Error proxying to Python server:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to connect to Python server'
        });
    }
});

// Proxy endpoint для получения изображения токена
app.get('/api/token-image/:contractAddress', async (req, res) => {
    try {
        const contractAddress = req.params.contractAddress;
        // URL вашего Python сервера
        const pythonServerUrl = `http://127.0.0.1:5000/api/token-image/${encodeURIComponent(contractAddress)}`;
        
        const response = await fetch(pythonServerUrl);
        const data = await response.json();
        
        res.json(data);
    } catch (error) {
        console.error('Error proxying token image request to Python server:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to connect to Python server'
        });
    }
});

// Proxy endpoint для получения статистики всех групп
app.get('/api/all-groups-stats', async (req, res) => {
    try {
        // URL вашего Python сервера
        const pythonServerUrl = 'http://127.0.0.1:5000/api/all-groups-stats';
        
        const response = await fetch(pythonServerUrl);
        const data = await response.json();
        
        res.json(data);
    } catch (error) {
        console.error('Error proxying all groups stats request to Python server:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to connect to Python server'
        });
    }
});

// Proxy endpoint для получения shared contracts (TOP CLANS)
app.get('/api/shared-contracts', async (req, res) => {
    try {
        // URL вашего Python сервера
        const pythonServerUrl = 'http://127.0.0.1:5000/api/shared-contracts';
        
        console.log('Proxying shared-contracts request to:', pythonServerUrl);
        
        const response = await fetch(pythonServerUrl);
        const data = await response.json();
        
        console.log('Shared contracts response:', data);
        
        res.json(data);
    } catch (error) {
        console.error('Error proxying shared-contracts request to Python server:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to connect to Python server for shared contracts'
        });
    }
});

// Proxy endpoint для получения последних записей (LATEST COINS)
app.get('/api/latest-records', async (req, res) => {
    try {
        // URL вашего Python сервера
        const pythonServerUrl = 'http://127.0.0.1:5000/api/latest-records';
        
        console.log('Proxying latest-records request to:', pythonServerUrl);
        
        const response = await fetch(pythonServerUrl);
        const data = await response.json();
        
        console.log('Latest records response:', data);
        
        res.json(data);
    } catch (error) {
        console.error('Error proxying latest-records request to Python server:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to connect to Python server for latest records'
        });
    }
});

// Route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Route for the leaderboards page
app.get('/leaderboards', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/leaderboards.html'));
});

// Route for the token images test page
app.get('/test-token-images', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/test-token-images.html'));
});

// Route for the groups stats test page
app.get('/test-groups-stats', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/test-groups-stats.html'));
});

// Route for the latest records test page
app.get('/test-latest-records', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/test-latest-records.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Leaderboards page: http://localhost:${PORT}/leaderboards`);
    console.log(`Token images test: http://localhost:${PORT}/test-token-images`);
    console.log(`Groups stats test: http://localhost:${PORT}/test-groups-stats`);
    console.log(`Latest records test: http://localhost:${PORT}/test-latest-records`);
    console.log(`Shared contracts API: http://localhost:${PORT}/api/shared-contracts`);
    console.log(`Latest records API: http://localhost:${PORT}/api/latest-records`);
    console.log(`Make sure your Python server is running on http://127.0.0.1:5000`);
});
