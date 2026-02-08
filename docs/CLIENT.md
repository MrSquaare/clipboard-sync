# Client Architecture

## Overview

The client is a **Tauri** desktop application that combines a Rust backend for system operations and cryptography with a TypeScript/React frontend for networking and UI.

## Backend (Rust)

The backend provides secure access to system resources and cryptographic operations.

### Modules

**Crypto Module**
- Handles encryption and decryption operations
- Key derivation from user-provided secret

**Platform Module**
- Retrieves device-specific information

### Tauri Commands

The backend exposes commands to the frontend:

- **Crypto**: Encryption and decryption operations
- **Platform**: Device information
- **Secret**: Secure storage and management of the shared secret
- **Window**: Window visibility and focus management

## Frontend (TypeScript + React)

The frontend handles networking, application logic, and user interface.

### Responsibilities

**WebSocket Connection**
- Persistent connection to the relay server
- Message sending and receiving
- Auto-reconnection handling

**WebRTC Connection**
- Peer-to-peer connection establishment
- Direct data channel communication
- Message sending and receiving
- Auto-reconnection handling

**Message Coordination**
- Encryption and decryption coordination with backend
- Transport mode management (P2P vs Relay)
- Message deduplication and ordering

**Clipboard Management**
- Monitors system clipboard for changes
- Sends clipboard updates to other clients
- Applies received clipboard updates

**State Management**
- Connection status and client information
- List of connected clients
- User settings and configuration

**UI**
- Room setup and connection interface
- Display of connected clients and their status
- User settings and configuration management
