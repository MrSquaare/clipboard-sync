# Overview

Clipboard Sync is a cross-platform desktop application that synchronizes clipboard content across multiple devices using a **hybrid transport architecture**. The system combines **WebRTC peer-to-peer connections** with a **WebSocket-based relay** to ensure reliable communication in any network environment.

Clipboard data is encrypted before transmission:
- **P2P connections**: Secured using WebRTC's built-in encryption
- **Relay connections**: Secured using End-to-end encryption algorithm to ensure the server cannot access content

The transport layer allows users to select their preferred mode:
- **Auto**: Attempts P2P connections, falls back to relay when needed (default)
- **P2P**: Only uses direct peer-to-peer connections
- **Relay**: Only uses server-relayed connections
