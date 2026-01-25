# Communication Protocol

This document outlines the security, signaling, and synchronization protocols.

## 1. Security & Encryption

All clipboard data is secured using **End-to-End Encryption (E2EE)**.

### Keys
- **Master Secret**: A high-entropy string provided by the user.
- **Encryption Key**: Derived from the Master Secret (Argon2id).
- **Room ID**: A public identifier for the signaling channel.

### Cipher
- **Algorithm**: AES-256-GCM (Galois/Counter Mode).
- **Properties**: Authenticated Encryption (ensures confidentiality AND integrity).
- **Nonce/IV**: Unique random value for every message.

### Payload Structure (Encrypted)
The actual JSON object exchanged over the wire (P2P or Relay) contains:

```json
{
  "iv": "base64_string",
  "ciphertext": "base64_string",
  "salt": "base64_string"
}
```
*Note: Sender ID is handled by the transport layer envelope.*

## 2. Signaling Protocol (WebSocket)

Clients connect to the Relay Server to discover peers.

### Handshake
1. **Connect**: Client connects to `wss://server/ws?roomId=ABC`.
2. **Assignment**: Server assigns a unique `PeerId` (UUID) to the socket.
3. **Hello**: Client sends `HELLO { version: 1 }`.
4. **Welcome**: Server replies with `WELCOME { myId: UUID, peers: [UUID...] }`.
5. **Join**: Server notifies other peers in the room with `PEER_JOINED { peerId: UUID }`.

### P2P Setup (WebRTC)
Standard WebRTC negotiation, proxied via the Relay:
1. **Offer**: Client A -> `SIGNAL_OFFER` -> Server -> Client B.
2. **Answer**: Client B -> `SIGNAL_ANSWER` -> Server -> Client A.
3. **ICE**: `SIGNAL_ICE` candidates exchanged similarly.

## 3. Data Synchronization Protocol

### Message Format (Decrypted)
Once a client decrypts a payload, the JSON structure is:

```typescript
interface ClipboardPayload {
  id: string;          // UUID for this clip
  timestamp: number;   // UTC Timestamp
  content: string;     // The actual text content
}
```

### Sync Logic
1. **Local Change**: 
   - User copies text on Device A.
   - Device A encrypts payload (with new UUID).
   - Device A sends encrypted blob to all connected P2P Peers.
   - If a peer is not reachable via P2P, Device A sends the blob to the Relay Server (broadcast).
   
2. **Remote Receive**:
   - Device B receives blob.
   - **Decrypts** using the Shared Secret.
     - *Failure*: If decryption fails, log error and ignore.
   - **Deduplication**: Device B checks `id` against a history of processed message IDs. If already processed, ignore.
   - **Write**: Device B writes `content` to System Clipboard.
   - **Loop Prevention**: Device B sets a flag to ignore the immediate subsequent "clipboard change" event caused by this write.

## 4. Network Constraints
- **Payload Size**: Currently optimized for text. Large files are not yet supported.
- **Relay Limits**: The Relay may enforce size limits on messages.
