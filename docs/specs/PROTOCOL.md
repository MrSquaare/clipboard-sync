# Communication Protocol

This document outlines the protocol used for establishing connections and exchanging data between peers.

## 1. Connection Establishment (Manual Signaling)

Since there is no central signaling server, the peers must exchange Session Description Protocol (SDP) objects manually.

### Roles
- **Initiator**: The peer starting the connection (Device A).
- **Receiver**: The peer accepting the connection (Device B).

### The Handshake Flow
1.  **Offer Generation (Initiator)**:
    - Initiator creates an `RTCPeerConnection`.
    - Creates a Data Channel (label: `clipboard-sync`).
    - Generates an SDP Offer.
    - *Note*: Interactive Connectivity Establishment (ICE) candidates are gathered. To simplify the manual copy-paste, the application waits for "ICE Gathering Complete" (or a timeout) before presenting the full SDP blob (containing candidates) to the user.
    - **Output**: A JavaScript Object Notation (JSON) string (Base64 encoded for easier copying) containing the Offer and ICE candidates.

2.  **Transfer 1 (User Action)**:
    - User copies the **Offer String** from Device A.
    - User pastes the **Offer String** into Device B.

3.  **Answer Generation (Receiver)**:
    - Receiver accepts the Offer (setting Remote Description).
    - Generates an SDP Answer.
    - Waits for its own ICE candidates to be gathered.
    - **Output**: A JSON string (Base64 encoded) containing the Answer and ICE candidates.

4.  **Transfer 2 (User Action)**:
    - User copies the **Answer String** from Device B.
    - User pastes the **Answer String** into Device A.

5.  **Finalization (Initiator)**:
    - Initiator accepts the Answer (setting Remote Description).
    - Connection transitions to `connected` state.

## 2. Data Exchange Format

Once the WebRTC Data Channel is open, messages are exchanged as JSON strings.

### Message Structure
```typescript
interface ClipboardMessage {
  type: 'CLIPBOARD_UPDATE';
  payload: {
    content: string; // The clipboard text
    timestamp: number; // Unix timestamp to prevent echo loops or out-of-order updates
  };
}
```

### Sync Logic
1.  **Send**: When the background script detects a local clipboard change (that didn't originate from the extension itself), it constructs a `CLIPBOARD_UPDATE` message and sends it.
2.  **Receive**: Upon receiving a `CLIPBOARD_UPDATE`:
    - The extension verifies the timestamp (optional, for ordering).
    - The extension writes `payload.content` to the local system clipboard.
    - A flag is temporarily set to ignore the immediate "change" event triggered by this write operation to prevent an infinite sync loop.
