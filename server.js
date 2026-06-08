const fs = require('fs');
const https = require('https');
const express = require('express');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');
const { networkInterfaces } = require('os');
const { randomBytes } = require('crypto');

const serverOptions = {
    cert: fs.readFileSync('./app.example.com+3.pem'),
    key: fs.readFileSync('./app.example.com+3-key.pem'),
};

const app = express();

// ── Rate limiting ─────────────────────────────────────────────
const limiterDefault = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
const limiterApi     = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });
const limiterNewRoom = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

// WebSocket connection rate limiting (express-rate-limit doesn't cover WS upgrades)
const wsLog = new Map();
setInterval(() => {
    const cutoff = Date.now() - 60_000;
    for (const [ip, entry] of wsLog) {
        if (entry.windowStart < cutoff) wsLog.delete(ip);
    }
}, 5 * 60_000);

function allowWsConnection(ip) {
    const now = Date.now();
    const entry = wsLog.get(ip);
    if (!entry || now - entry.windowStart > 60_000) {
        wsLog.set(ip, { windowStart: now, count: 1 });
        return true;
    }
    if (entry.count >= 20) return false;
    entry.count++;
    return true;
}

// ── Routes (explicit only — no express.static to avoid exposing certs) ──
app.get('/api/info', limiterApi, (req, res) => {
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

app.get('/api/new-room', limiterNewRoom, (req, res) => {
    res.json({ roomId: randomBytes(3).toString('hex') });
});

app.get('/', limiterDefault, (req, res) => res.sendFile(__dirname + '/home.html'));
app.get('/room', limiterDefault, (req, res) => res.sendFile(__dirname + '/room.html'));

// ── WebSocket signaling ──────────────────────────────────────
const httpsServer = https.createServer(serverOptions, app);
const wss = new WebSocket.Server({ server: httpsServer });

const sessions = Object.create(null); // null prototype prevents prototype pollution
const MAX_PEERS = 5;
const PEER_ID_RE = /^[a-f0-9]{6}$/;
const SESSION_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress || 'unknown';

    if (!allowWsConnection(ip)) {
        ws.close(1008, 'Rate limit exceeded');
        return;
    }

    const params = new URLSearchParams(req.url.split('?')[1]);
    const sessionId = params.get('session_id');

    if (!sessionId || !SESSION_ID_RE.test(sessionId)) {
        ws.close(1008, 'Invalid session ID');
        return;
    }

    if (!sessions[sessionId]) sessions[sessionId] = [];

    if (sessions[sessionId].length >= MAX_PEERS) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full (max 5 users)' }));
        ws.close();
        return;
    }

    const peerId = randomBytes(3).toString('hex');
    sessions[sessionId].push({ ws, peerId });

    const existingPeers = sessions[sessionId]
        .filter(p => p.peerId !== peerId)
        .map(p => p.peerId);
    ws.send(JSON.stringify({ type: 'init', peerId, peers: existingPeers }));

    sessions[sessionId].forEach(p => {
        if (p.peerId !== peerId && p.ws.readyState === WebSocket.OPEN)
            p.ws.send(JSON.stringify({ type: 'peer_joined', peerId }));
    });

    console.log(`[${sessionId}] peer ${peerId} joined (${sessions[sessionId].length}/${MAX_PEERS})`);

    ws.on('message', (message) => {
        let data;
        try { data = JSON.parse(message); } catch { return; }

        // Validate the `to` field if present — must be a known peer in this session
        if (data.to !== undefined) {
            if (!PEER_ID_RE.test(data.to)) return; // drop malformed target
            const target = sessions[sessionId]?.find(p => p.peerId === data.to);
            if (target?.ws.readyState === WebSocket.OPEN)
                target.ws.send(JSON.stringify({ ...data, from: peerId }));
        } else {
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

httpsServer.listen(3000, '0.0.0.0', () => {
    console.log('Server running → https://localhost:3000');
});
