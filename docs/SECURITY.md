# Security

## Encryption

Clipboard Sync ensures data privacy through encryption at multiple layers:

### P2P Transport
WebRTC connections use built-in security protocols:
- **DTLS** (Datagram Transport Layer Security) for key exchange
- **SRTP** (Secure Real-time Transport Protocol) for data channel encryption

The server is only involved in initial signaling and never sees the actual data.

### Relay Transport
When using the relay server, all clipboard data is end-to-end encrypted before transmission:
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key derivation**: Argon2 from user-provided shared secret
- Encryption and decryption happen on the client
- The server only forwards encrypted payloads
- Only clients with the correct shared secret can decrypt messages

## Trust Model

### Client Authentication
- Clients connect to a room using a `roomId` (public identifier)
- Message authenticity is verified through successful decryption
- Invalid messages (wrong secret) are silently discarded

### Server Trust
- Cannot decrypt relay messages (no access to shared secret)
- Cannot modify encrypted payloads
- Cannot inject valid messages (lacks encryption key)
- Can only route messages between clients in the same room

### Attack Mitigation
- **Man-in-the-Middle**: Transport layer security (WSS/TLS) + E2EE for relay
- **Replay attacks**: Message deduplication prevents reprocessing
- **Room enumeration**: Rooms are ephemeral with no persistent state
- **DoS protection**: Cloudflare Workers platform protections
