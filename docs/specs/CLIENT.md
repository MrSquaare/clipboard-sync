# Client Architecture

## Overview
The client is a **Tauri v2** application. It combines a Rust backend for critical system operations (cryptography) with a React frontend for the UI, networking, and application logic.

## Structure

### 1. Backend (`src-tauri`)
The "secure enclave" for cryptographic operations.

- **Crypto Module**:
  - Implementation of AES-256-GCM.
  - Handles Key Derivation (Argon2id).
  - **State**: Stores the `Secret Key` in protected memory (Mutex).
  - **Commands**: Exposes `encrypt_message`, `decrypt_message`, and `set_secret` to the frontend.

### 2. Frontend (`src`)
The UI, orchestration layer, and networking hub.

- **Clipboard Monitor**:
  - Polls the system clipboard using the Tauri Clipboard plugin.
  - Detects changes and triggers synchronization.
  - Handles "remote write" logic to prevent clipboard loops (echoing back what was just received).
- **Network Manager**:
  - Manages the WebSocket client to the Signaling/Relay Server.
  - Manages the WebRTC peer communication.
  - Manages the WebSocket Relay communication.
  - Handles the hybrid logic (routing messages via P2P or Relay).
- **State Management**:
  - Save non-sensitive user configuration.
  - Tracks connected peers and their status.
- **UI**:
  - Setup wizard for entering `Room ID` and `Secret Key`.
  - Dashboard with information and connected clients.

## Security Boundary
- **Sensitive Data**: The `Secret Key` is sent to backend once during setup and stored there.
- **Operation**: 
  1. Frontend detects clipboard change.
  2. Frontend sends plaintext to backend.
  3. Backend derives key (if needed), encrypts data, and returns IV + ciphertext + Salt.
  4. Frontend broadcasts encrypted payload via WebRTC/WS.
  5. Frontend passes encrypted payload received to backend for decryption.

## Multi-Device Logic
- The client maintains a list of `Active Peers`.
- When a local copy event occurs:
  - Iterate through all `Active Peers`.
  - Send Encrypted Payload via WebRTC (if connected) OR via Relay (if not).