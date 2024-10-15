const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');

const serverOptions = {
    cert: fs.readFileSync('./app.example.com+3.pem'),
    key: fs.readFileSync('./app.example.com+3-key.pem'),
};

const httpsServer = https.createServer(serverOptions);

const wss = new WebSocket.Server({ server: httpsServer });

const sessions = {};

wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.split('?')[1]);
    const sessionId = params.get('session_id');

    if (!sessionId) {
        ws.send(JSON.stringify({ error: 'No session ID provided' }));
        ws.close();
        return;
    }

    if (!sessions[sessionId]) {
        sessions[sessionId] = [];
    }

    sessions[sessionId].push(ws);
    console.log(`A new client joined session: ${sessionId}`);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log(`Received message in session ${sessionId}: ${data.type}`);

        // Broadcast message to all peers in the same session
        sessions[sessionId].forEach((peer) => {
            if (peer !== ws) {
                peer.send(JSON.stringify(data));
            }
        });
    });

    ws.on('close', () => {
        console.log(`A client left session: ${sessionId}`);
        sessions[sessionId] = sessions[sessionId].filter(peer => peer !== ws);

        if (sessions[sessionId].length === 0) {
            delete sessions[sessionId];
        }
    });
});

httpsServer.listen(3000, () => {
    console.log('WebSocket signaling server with SSL is running on wss://localhost:3000');
});
