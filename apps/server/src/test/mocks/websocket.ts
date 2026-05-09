import { vi, type Mocked } from "vitest";

export const createMockedWebSocket = () => {
  return {
    send: vi.fn(),
    close: vi.fn(),
    serializeAttachment: vi.fn(),
    deserializeAttachment: vi.fn().mockReturnValue(null),
  } as unknown as Mocked<WebSocket>;
};
