const fs = require('fs');
const https = require('https');
const express = require('express');
const WebSocket = require('ws');
const { networkInterfaces } = require('os');
const { randomBytes } = require('crypto');

const serverOptions = {
    cert: fs.readFileSync('./app.example.com+3.pem'),
    key: fs.readFileSync('./app.example.com+3-key.pem'),
};

const app = express();
app.use(express.static('.', { index: false }));

app.get('/api/info', (req, res) => {
    const nets = networkInterfaces();
    let localIp = 'localhost';
    for (const iface of Object.values(nets)) {
        for (const net of iface) {
            if (net.family === 'IPv4' && !net.internal) { localIp = net.address; break; }
        }
        if (localIp !== 'localhost') break;
    }
    res.json({ localIp, port: 3000 });
});

app.get('/api/new-room', (req, res) => {
    res.json({ roomId: randomBytes(3).toString('hex') });
});

app.get('/', (req, res) => res.sendFile(__dirname + '/home.html'));
app.get('/room', (req, res) => res.sendFile(__dirname + '/room.html'));

const httpsServer = https.createServer(serverOptions, app);
const wss = new WebSocket.Server({ server: httpsServer });

// sessions = { sessionId: [ { ws, peerId } ] }
const sessions = {};
const MAX_PEERS = 5;

wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.split('?')[1]);
    const sessionId = params.get('session_id');
    if (!sessionId) { ws.close(); return; }

    if (!sessions[sessionId]) sessions[sessionId] = [];

    if (sessions[sessionId].length >= MAX_PEERS) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full (max 5 users)' }));
        ws.close();
        return;
    }

    const peerId = randomBytes(3).toString('hex');
    sessions[sessionId].push({ ws, peerId });

    // Tell new peer their ID + list of existing peer IDs
    const existingPeers = sessions[sessionId]
        .filter(p => p.peerId !== peerId)
        .map(p => p.peerId);
    ws.send(JSON.stringify({ type: 'init', peerId, peers: existingPeers }));

    // Notify existing peers
    sessions[sessionId].forEach(p => {
        if (p.peerId !== peerId && p.ws.readyState === WebSocket.OPEN)
            p.ws.send(JSON.stringify({ type: 'peer_joined', peerId }));
    });

    console.log(`[${sessionId}] peer ${peerId} joined (${sessions[sessionId].length}/${MAX_PEERS})`);

    ws.on('message', (message) => {
        let data;
        try { data = JSON.parse(message); } catch { return; }

        if (data.to) {
            // Route to a specific peer
            const target = sessions[sessionId]?.find(p => p.peerId === data.to);
            if (target?.ws.readyState === WebSocket.OPEN)
                target.ws.send(JSON.stringify({ ...data, from: peerId }));
        } else {
            // Broadcast to all others
            sessions[sessionId]?.forEach(p => {
                if (p.peerId !== peerId && p.ws.readyState === WebSocket.OPEN)
                    p.ws.send(JSON.stringify({ ...data, from: peerId }));
            });
        }
    });

    ws.on('close', () => {
        if (!sessions[sessionId]) return;
        sessions[sessionId] = sessions[sessionId].filter(p => p.peerId !== peerId);
        sessions[sessionId].forEach(p => {
            if (p.ws.readyState === WebSocket.OPEN)
                p.ws.send(JSON.stringify({ type: 'peer_left', peerId }));
        });
        if (sessions[sessionId].length === 0) delete sessions[sessionId];
        console.log(`[${sessionId}] peer ${peerId} left`);
    });
});

function broadcast(sessionId, senderPeerId, data) {
    (sessions[sessionId] || []).forEach(p => {
        if (p.peerId !== senderPeerId && p.ws.readyState === WebSocket.OPEN)
            p.ws.send(JSON.stringify(data));
    });
}

httpsServer.listen(3000, '0.0.0.0', () => {
    console.log('Server running → https://localhost:3000');
});
