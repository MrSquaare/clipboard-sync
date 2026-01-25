# Project Architecture

## Overview
The system adopts a **Hybrid Mesh Architecture**. Devices attempt to connect directly to one another (P2P) to form a mesh. If a direct connection cannot be established (e.g., due to symmetric NATs or corporate firewalls), traffic is routed through a central Relay Server.

Regardless of the transport method (P2P or Relay), **all clipboard payloads are End-to-End Encrypted (E2EE)** using a shared secret known only to the user's devices.

## Topology

### 1. Peer-to-Peer (Preferred)
In an ideal network environment, clients establish direct WebRTC Data Channels.
- **Latency**: Lowest.
- **Privacy**: Maximum (data does not pass through server).
- **Scalability**: High (server only handles signaling).

### 2. Relay Fallback (Enterprise/Restricted)
In environments like Zscaler or strict corporate firewalls, UDP/WebRTC might be blocked.
- Clients maintain a persistent WebSocket connection to the Relay Server.
- If P2P fails, encrypted payloads are pushed to the Relay, which broadcasts them to other authenticated peers in the "Room".
- **Privacy**: Maintained via E2EE (Server sees only ciphertext).

## System Components

### A. The Client
- **Role**: The active agent installed on user machines.
- **Responsibilities**:
  - Monitors system clipboard.
  - Encrypts/Decrypts content.
  - Manages P2P connections (WebRTC) and WebSocket connections.
  - Discovery: Uses the Relay Server to find other peers in the same "Room".

### B. The Relay Server
- **Role**: A lightweight signaling and fallback relay.
- **Responsibilities**:
  - **Signaling**: Exchanges SDP offers/answers and ICE candidates between peers to help them connect P2P.
  - **Room Management**: Groups sockets by a `roomId`.
  - **Data Relay**: If P2P fails, it blindly forwards encrypted binary messages between sockets in the same room.
  - **Zero-Knowledge**: It does *not* possess the decryption keys.

## Setup Flow (Simplified)
To ensure "Easy Setup" while maintaining security:
1.  **Device A (Creator)**: Generates a random `Room ID` and a `Secret Key`.
2.  **User Action**: User enters (or scans) this `Room ID` and `Secret Key` on **Device B**.
3.  **Connection**: Both devices connect to the Relay Server using the `Room ID`.
4.  **Verification**: Devices attempt to decrypt received messages using the `Secret Key`. If decryption fails (wrong key), the message is ignored.
