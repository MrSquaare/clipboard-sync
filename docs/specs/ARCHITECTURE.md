# Project Architecture

## Overview
"Clipboard Sync" is a browser extension designed to synchronize the clipboard content between two devices using a peer-to-peer (P2P) connection. It eliminates the need for a central server by leveraging Web Real-Time Communication (WebRTC) for data transport and a manual "serverless" signaling process.

## Core Components

### 1. Background Service Worker
- **Role**: The central hub of the extension.
- **Responsibilities**:
  - Manages the `RTCPeerConnection` state.
  - Listen for clipboard changes (when the browser is focused or via content scripts if necessary).
  - Handles incoming data from the WebRTC Data Channel.
  - Updates the system clipboard when new data is received.

### 2. Popup UI
- **Role**: The user interface for the manual signaling process.
- **Responsibilities**:
  - **Initiator View**: Generate and display the connection "Offer" (Session Description Protocol (SDP)). Input field to receive the "Answer".
  - **Receiver View**: Input field to receive the "Offer". Generate and display the connection "Answer".
  - Status indicators (Connected, Disconnected, Syncing).

### 3. WebRTC (P2P)
- **Data Channel**: Uses `RTCDataChannel` to send clipboard text strings directly between peers.
- **Security**: All traffic is encrypted end-to-end via WebRTC's standard Datagram Transport Layer Security (DTLS)/Secure Real-time Transport Protocol (SRTP) protocols.

## Data Flow
1.  **Local Copy**: User copies text on Device A.
2.  **Detection**: Extension detects the change.
3.  **Transmission**: Text is sent via the active WebRTC Data Channel.
4.  **Reception**: Device B receives the message.
5.  **Update**: Device B writes the text to its local clipboard.

## Serverless Signaling
To avoid hosting a signaling server, the connection setup is manual:
- The "signaling data" (SDP Offers/Answers and Interactive Connectivity Establishment (ICE) candidates) is serialized into a text string.
- The user manually acts as the transport layer by copying this string from one screen and pasting it into the other.
