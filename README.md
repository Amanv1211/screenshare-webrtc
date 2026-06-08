# WebRTC Video Call — Screen Share, Video & Audio

A peer-to-peer video calling app built with WebRTC and Node.js. Supports up to **5 users per room** with bidirectional video, audio, and screen sharing.

## Features

- Multi-user rooms (up to 5 peers, mesh WebRTC)
- Bidirectional video + audio
- Screen sharing (works even without a camera)
- Camera and mic optional — join audio-only or screen-share-only
- Shareable room links (works over local network / Wi-Fi)
- No external services — fully self-hosted

## Tech Stack

- **Backend**: Node.js + Express + `ws` (WebSocket signaling server)
- **Frontend**: Vanilla HTML/CSS/JS (no framework needed)
- **Transport**: WebRTC (peer-to-peer), WSS for signaling

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. SSL certificate (required for camera/mic access)

WebRTC requires HTTPS. Generate a local cert with [mkcert](https://github.com/FiloSottile/mkcert):

```bash
# Install mkcert
sudo apt install mkcert
mkcert -install
mkcert localhost 127.0.0.1 <your-local-ip>
```

Rename the generated files to match what `server.js` expects:

```
app.example.com+3.pem       ← certificate
app.example.com+3-key.pem   ← private key
```

Or edit `server.js` lines 8–9 to point to your cert files.

### 3. Run

```bash
node server.js
```

Server starts on `https://localhost:3000`.

## Usage

1. Open `https://localhost:3000` in your browser
2. Click **"Advanced → Proceed"** to accept the self-signed certificate
3. Click **Create New Room** — a shareable link is generated
4. Send the link to others (works on the same Wi-Fi network)
5. Everyone opens the link, accepts the certificate warning, then clicks **Join Call**

> **Other devices on your network:** use the IP link shown on the home page, e.g. `https://192.168.x.x:3000/room?session_id=abc123`. Each device needs to accept the SSL certificate once.

## Controls

| Button | Action |
|---|---|
| Join Call | Get camera/mic and enter the room |
| 🎤 Mic | Mute / unmute microphone |
| 📷 Cam | Turn camera on / off |
| 🖥 Share Screen | Share your screen (replaces camera feed for others) |
| End Call | Leave the room |

## Folder Structure

```
├── server.js          — WebSocket signaling server + static file serving
├── home.html          — Landing page (create / join rooms)
├── room.html          — Call room (video, audio, screen share)
├── index.html         — Redirect to home
├── package.json
└── *.pem              — SSL certificate files (not committed)
```

## Notes

- `.pem` cert files are excluded from git (see `.gitignore`) — generate your own locally
- Max 5 peers per room (mesh: each peer connects to every other peer)
- TURN server not included — works on local network; for internet calls add a TURN server to the `ICE_SERVERS` config in `room.html`
