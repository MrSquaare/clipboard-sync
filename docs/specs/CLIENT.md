# Client Architecture

## Overview
The client is a **Tauri v2** application. It combines a Rust backend for critical system operations (cryptography, clipboard APIs, networking) with a React frontend for the UI.

## Structure

### 1. Rust Backend (`src-tauri`)
The "heavy lifting" happens here to ensure performance and security.

- **Clipboard Monitor**:
  - Runs on a separate thread.
  - Polling or Event-based (depending on OS support) detection of clipboard changes.
  - *Constraint*: Must distinguish between "user copied" and "app wrote to clipboard" to prevent loops.
- **Crypto Module**:
  - Implementation of AES-256-GCM.
  - Handles Key Derivation (Argon2id).
  - **NEVER** exposes the raw secret key to the webview (Frontend) if possible, keeping it in protected memory.
- **Network Manager**:
  - Manages the WebSocket connection to the Relay.
  - Manages WebRTC PeerConnections (using a Rust WebRTC crate or passing signaling to frontend JS WebRTC). 
  - *Decision*: Managing WebRTC in Rust (via `webrtc-rs`) offers better stability and control than the webview, but JS WebRTC is easier to implement. *Recommendation*: Start with JS WebRTC (Frontend) for P2P, but handle Encryption in Rust.

### 2. Frontend (`src`)
The UI and orchestration layer.

- **State Management**: Holds the list of connected peers, connection status, and logs.
- **Settings UI**:
  - "Connect to Room" form.
  - "Generate New Room" view.
  - Toggle specific settings (e.g., "Receive only", "Send only").
- **IPC Layer**:
  - Communicates with Rust backend via Tauri Commands.
  - Events: `clipboard-update`, `peer-status-update`.

## Security Boundary
- **Sensitive Data**: The `Secret Key` should ideally remain in the Rust Backend.
- **Operation**: 
  1. Frontend receives "User setup config". Passes it to Rust.
  2. Rust stores keys in memory.
  3. When clipboard changes, Rust encrypts data -> Sends ciphertext to Frontend -> Frontend sends via WebRTC/WS. 
  4. *Alternatively*: Rust handles the networking entirely for maximum security.

## Multi-Device Logic
- The client maintains a list of `Active Peers`.
- When a local copy event occurs:
  - Iterate through all `Active Peers`.
  - Send Encrypted Payload via WebRTC (if connected) OR via Relay (if not).
