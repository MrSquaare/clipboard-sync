# Clipboard Sync Specs

## Project Overview
Clipboard Sync is a cross-platform application (Windows, macOS, Linux) designed to synchronize clipboard content securely across multiple devices. It prioritizes peer-to-peer connections for privacy but includes a relay server fallback to ensure functionality in restrictive network environments (e.g., enterprise networks with Zscaler).

**Key Features:**
- **Cross-Platform**: Built with Tauri for native performance on desktop OSs.
- **End-to-End Encryption (E2EE)**: Data is encrypted locally before transmission. Neither the relay server nor any intermediary can read the clipboard contents.
- **Hybrid Networking**: Prefers direct P2P (WebRTC) but seamlessly falls back to a Relay Server (WebSocket) if direct connections are blocked.
- **Multi-Device**: Supports synchronizing between more than two devices in a mesh or star topology.
- **Ease of Use**: Simple setup process for linking devices.

## Documentation Index

Please refer to the following documents for detailed specifications:

- **[Architecture](./ARCHITECTURE.md)**: High-level system design and topology.
- **[Protocol](./PROTOCOL.md)**: Security, encryption standards, and communication protocols.
- **[Tech Stack](./TECH_STACK.md)**: Libraries and frameworks used for Client and Server.
- **[Client Architecture](./CLIENT.md)**: Details on the Tauri application structure.
- **[Server Architecture](./SERVER.md)**: Details on the Hono-based Relay Server.
