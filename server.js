const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const path = require('path');
const fs = require('fs');
const MinecraftServer = require('./minecraft-server');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// WebSocket server on distinct path
const wss = new WebSocketServer({ server: server, path: '/ws' });

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize Minecraft server manager
const mcServer = new MinecraftServer();

// Store connected WebSocket clients
const clients = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    clients.add(ws);
    
    // Send current server status
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'status',
            data: {
                running: mcServer.isRunning(),
                players: mcServer.getPlayerCount(),
                maxPlayers: mcServer.getMaxPlayers(),
                uptime: mcServer.getUptime()
            }
        }));
    }
    
    ws.on('close', () => {
        clients.delete(ws);
        console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

// Broadcast to all connected clients
function broadcast(message) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Server status updates
mcServer.on('statusUpdate', (status) => {
    broadcast({
        type: 'status',
        data: status
    });
});

mcServer.on('playerJoin', (player) => {
    broadcast({
        type: 'playerJoin',
        data: { player }
    });
});

mcServer.on('playerLeave', (player) => {
    broadcast({
        type: 'playerLeave',
        data: { player }
    });
});

mcServer.on('serverLog', (log) => {
    broadcast({
        type: 'log',
        data: { message: log }
    });
});

// API Routes
app.post('/api/auth', (req, res) => {
    const { passcode } = req.body;
    if (passcode === '45982') {
        res.json({ success: true, message: 'Authentication successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid passcode' });
    }
});

app.post('/api/server/start', (req, res) => {
    const { passcode } = req.body;
    if (passcode !== '45982') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    mcServer.start()
        .then(() => {
            res.json({ success: true, message: 'Server started successfully' });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: error.message });
        });
});

app.post('/api/server/stop', (req, res) => {
    const { passcode } = req.body;
    if (passcode !== '45982') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    mcServer.stop()
        .then(() => {
            res.json({ success: true, message: 'Server stopped successfully' });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: error.message });
        });
});

app.post('/api/server/restart', (req, res) => {
    const { passcode } = req.body;
    if (passcode !== '45982') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    mcServer.restart()
        .then(() => {
            res.json({ success: true, message: 'Server restarted successfully' });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: error.message });
        });
});

app.post('/api/ops/add', (req, res) => {
    const { passcode, player } = req.body;
    if (passcode !== '45982') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    mcServer.addOp(player)
        .then(() => {
            res.json({ success: true, message: `${player} has been granted operator privileges` });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: error.message });
        });
});

app.post('/api/ops/remove', (req, res) => {
    const { passcode, player } = req.body;
    if (passcode !== '45982') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    mcServer.removeOp(player)
        .then(() => {
            res.json({ success: true, message: `${player} operator privileges have been revoked` });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: error.message });
        });
});

app.post('/api/ban/add', (req, res) => {
    const { passcode, player, reason } = req.body;
    if (passcode !== '45982') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    mcServer.banPlayer(player, reason)
        .then(() => {
            res.json({ success: true, message: `${player} has been banned` });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: error.message });
        });
});

app.post('/api/ban/remove', (req, res) => {
    const { passcode, player } = req.body;
    if (passcode !== '45982') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    mcServer.unbanPlayer(player)
        .then(() => {
            res.json({ success: true, message: `${player} has been unbanned` });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: error.message });
        });
});

app.get('/api/status', (req, res) => {
    res.json({
        running: mcServer.isRunning(),
        players: mcServer.getPlayerCount(),
        maxPlayers: mcServer.getMaxPlayers(),
        uptime: mcServer.getUptime(),
        address: 'mchgland.duckdns.org',
        port: 25565
    });
});

app.get('/api/ops', (req, res) => {
    const { passcode } = req.query;
    if (passcode !== '45982') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    mcServer.getOps()
        .then(ops => {
            res.json({ success: true, ops });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: error.message });
        });
});

app.get('/api/bans', (req, res) => {
    const { passcode } = req.query;
    if (passcode !== '45982') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    mcServer.getBans()
        .then(bans => {
            res.json({ success: true, bans });
        })
        .catch(error => {
            res.status(500).json({ success: false, message: error.message });
        });
});

// Initialize server setup
async function initializeServer() {
    try {
        await mcServer.initialize();
        console.log('Minecraft server initialized successfully');
        
        // Auto-start server for 24/7 availability
        await mcServer.start();
        console.log('Minecraft server started for 24/7 availability');
    } catch (error) {
        console.error('Failed to initialize Minecraft server:', error);
    }
}

// Start the web server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Production server: mchgland.duckdns.org:25565`);
    console.log(`Development server: mchgland.onrender.com:${PORT}`);
    initializeServer();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await mcServer.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await mcServer.stop();
    process.exit(0);
});
