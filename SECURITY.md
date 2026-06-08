# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | Yes       |
| 1.x     | No        |

## Known Security Considerations

This project is intended for **local network / LAN use**. Before deploying to a public server, be aware of:

- **Self-signed SSL certificate** — the included cert is for local development only. Replace it with a trusted certificate (e.g. Let's Encrypt) for any public deployment.
- **No authentication** — anyone with the room link can join. There is no password or access control. Add auth middleware in `server.js` if needed.
- **Max 5 peers per room** — enforced server-side, but there is no rate limiting or DDoS protection. Add rate limiting (e.g. `express-rate-limit`) for public deployments.
- **WebRTC is peer-to-peer** — media streams travel directly between browsers and never touch the server. The server only relays signaling messages (offer/answer/ICE candidates).
- **`.pem` files** — SSL private key files are excluded from git via `.gitignore`. Never commit them.

## Reporting a Vulnerability

If you find a security issue, please open a [GitHub Issue](../../issues) or email the maintainer directly. Include steps to reproduce and the potential impact.
