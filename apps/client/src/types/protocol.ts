export type PeerId = string;
export type RoomId = string;

// --- Messages from Client to Server ---
export type ClientMessage =
  | { type: "HELLO"; payload: { version: number } }
  | { type: "PING" }
  | { type: "SIGNAL_OFFER"; targetId: PeerId; sdp: unknown }
  | { type: "SIGNAL_ANSWER"; targetId: PeerId; sdp: unknown }
  | { type: "SIGNAL_ICE"; targetId: PeerId; candidate: unknown }
  | { type: "RELAY_DATA"; payload: unknown }; // Encrypted blob

// --- Messages from Server to Client ---
export type ServerMessage =
  | { type: "WELCOME"; payload: { myId: PeerId; peers: PeerId[] } }
  | { type: "PONG" }
  | { type: "PEER_JOINED"; payload: { peerId: PeerId } }
  | { type: "PEER_LEFT"; payload: { peerId: PeerId } }
  | { type: "SIGNAL_OFFER"; senderId: PeerId; sdp: unknown }
  | { type: "SIGNAL_ANSWER"; senderId: PeerId; sdp: unknown }
  | { type: "SIGNAL_ICE"; senderId: PeerId; candidate: unknown }
  | { type: "RELAY_DATA"; senderId: PeerId; payload: unknown }
  | { type: "ERROR"; payload: { code: string; message: string } };
