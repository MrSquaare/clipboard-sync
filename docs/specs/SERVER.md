# Server Architecture

## Overview
The Relay Server is a **Hono** application designed to be deployed on Cloudflare Workers and uses **Durable Objects** for Room state.

## Core Responsibilities

### 1. Room Management (Durable Objects)
- **Concept**: A "Room" is an isolated actor (Durable Object) identified by a `roomId`.
- **Life Cycle**: Created when the first client connects. Persists as long as clients are connected.
- **State**: Maintains a list of connected WebSocket sessions and their Peer IDs.

### 2. Signaling (WebRTC)
- Acts as a conduit for SDP Offers, Answers, and ICE Candidates.
- **Message Types**:
  - `SIGNAL_OFFER`: Forward to target peer.
  - `SIGNAL_ANSWER`: Forward to target peer.
  - `SIGNAL_ICE`: Forward to target peer.

### 3. Data Relay (Fallback)
- If clients cannot connect P2P, they send clipboard data to the server.
- **Broadcast**: The server receives a `RELAY_DATA` message and broadcasts it to all other sockets in the `roomId`.

## API Endpoints

### HTTP
- `GET /`: Basic info text.
- `GET /ws`: WebSocket upgrade endpoint. Query param: `?roomId=XYZ`.

### WebSocket Protocol
- **Authentication**: The server does NOT validate the `Secret Key` (it doesn't have it). It relies on the clients to ignore/drop messages that fail decryption.
- **Protocol Messages**:
  - `HELLO`: Handshake initiation.
  - `PING`/`PONG`: Heartbeat.
  - `LEAVE`: Explicit disconnect.

## Security Considerations
- **TLS**: WSS (WebSocket Secure) is mandatory in production.
- **Zero Knowledge**: The server processes binary blobs. It parses the *envelope* (who is this for?) but never the *payload*.