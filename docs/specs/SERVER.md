# Server Architecture

## Overview
The Relay Server is a **Hono** application designed to be deployed on edge runtimes (like Cloudflare Workers) or standard Node.js containers. It is stateless and lightweight.

## Core Responsibilities

### 1. Room Management
- **Concept**: A "Room" is an ephemeral grouping of WebSocket connections identified by a `roomId`.
- **Life Cycle**: Created when the first client connects; destroyed when the last client disconnects.

### 2. Signaling (WebRTC)
- Acts as a conduit for SDP Offers, Answers, and ICE Candidates.
- **Message Types**:
  - `SIGNAL_OFFER`: Target specific peer.
  - `SIGNAL_ANSWER`: Target specific peer.
  - `SIGNAL_ICE`: Target specific peer.

### 3. Data Relay (Fallback)
- If clients cannot connect P2P, they send clipboard data to the server.
- **Broadcast**: The server receives a `RELAY_DATA` message and broadcasts it to all other sockets in the `roomId`.
- **Constraint**: The server imposes size limits on payloads to prevent abuse (e.g., max 10MB).

## API Endpoints

### HTTP
- `GET /health`: Health check.
- `GET /stats`: (Optional) Active rooms/connections count (protected).

### WebSocket (`/ws`)
- **Connection**: `ws://server.com/ws?roomId=XYZ`
- **Authentication**: The server does NOT validate the `Secret Key` (it doesn't have it). It relies on the clients to ignore/drop messages that fail decryption.
  - *Optional hardening*: Clients can use a derived "Room Password" to prevent random strangers from joining the WebSocket room, separate from the "Encryption Key".

## Security Considerations
- **TLS**: WSS (WebSocket Secure) is mandatory.
- **Zero Knowledge**: The server processes binary blobs. It parses the *envelope* (who is this for?) but never the *payload*.
- **Rate Limiting**: Prevent flooding of signaling or data messages.
