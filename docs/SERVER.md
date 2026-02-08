# Server Architecture

## Overview

The server is a lightweight **Hono** application deployed on **Cloudflare Workers** using **Durable Objects** for stateful room management. It provides WebSocket-based signaling for WebRTC negotiation and relay transport for clients that cannot establish P2P connections.

## API Endpoints

**`GET /`**
- Returns plain text banner
- Health check endpoint

**`GET /ws`**
- WebSocket upgrade endpoint
- Query parameter: `roomId` (string, 6-64 characters)
- Creates or retrieves the room for the given ID

## Room

Each room is an isolated Durable Object instance that maintains:
- Connected WebSocket clients
- Client identifiers and names

Rooms are ephemeral and exist only while clients are connected.

## Client Management

The server manages client lifecycle and announces changes to room participants:

**On Connection**
- Assigns a unique client ID to each connecting client
- Welcomes the client with the current room state

**On Join**
- Notifies other clients when a new client joins the room

**On Leave**
- Notifies other clients when a client disconnects

## Signaling

The server facilitates WebRTC peer-to-peer connection establishment by forwarding signaling messages between clients. All signaling data is encrypted, ensuring the server cannot inspect or modify WebRTC negotiation details.

## Relay

When direct P2P connections cannot be established, the server acts as a relay:
- Forwards encrypted messages between clients
- Supports both broadcast (to all clients) and targeted (to specific client) delivery
- Never decrypts messages—only routes encrypted payloads

## Scalability

The server leverages the Cloudflare platform for automatic scalability and global distribution. Each room is an independent Durable Object that can handle its own set of clients.
