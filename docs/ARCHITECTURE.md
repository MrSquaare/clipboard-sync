# Architecture

## Client

The client is a **Tauri** desktop application combining native system access with web technologies.

### Backend (Rust)
Handles low-level system and cryptography operations:
- Platform-specific integrations (system tray, autostart)
- Key derivation and secure storage
- Encryption/decryption operations

### Frontend (TypeScript + React)
Manages networking, application logic and user interface:
- WebSocket connection to server
- WebRTC peer-to-peer connections
- Message coordination
- Clipboard monitoring and synchronization
- User interface

## Server

The server is a lightweight **Hono** application deployed on **Cloudflare Workers** application using **Durable Objects** for room management.

- **Room management**: Maintains isolated state per room with connected clients
- **Signaling**: Facilitates WebRTC peer-to-peer connection establishment
- **Relay**: Forwards encrypted messages
