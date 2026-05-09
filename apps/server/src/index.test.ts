import { env } from "cloudflare:workers";
import { describe, afterEach, expect, it, vi } from "vitest";

import { MockedRoom } from "./do/Room.mock";
import { MockedLogger } from "./utils/logger.mock";

import app from "./index";

describe("app", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return welcome message on /", async () => {
    const response = await app.request("/", {}, env);

    const loggerInstance = MockedLogger.mock.instances[0];

    expect(response.status).toEqual(200);
    expect(await response.text()).toEqual(
      "Clipboard Sync Signaling and Relay Server",
    );
    expect(loggerInstance).toBeDefined();
  });

  it("should return 400 on /ws without roomId", async () => {
    const response = await app.request("/ws", {}, env);

    const loggerInstance = MockedLogger.mock.instances[0];
    const roomInstance = MockedRoom.mock.instances[0];

    expect(response.status).toEqual(400);
    expect(await response.text()).toEqual(
      expect.stringContaining("expected string, received undefined"),
    );
    expect(loggerInstance.debug).toHaveBeenCalledWith(
      "New WebSocket connection attempt",
    );
    expect(loggerInstance.error).toHaveBeenCalledWith("Invalid roomId", {
      rawRoomId: undefined,
      error: expect.anything(),
    });
    expect(roomInstance).not.toBeDefined();
  });

  it("should return 400 on /ws with invalid roomId", async () => {
    const response = await app.request("/ws?roomId=short", {}, env);

    const loggerInstance = MockedLogger.mock.instances[0];
    const roomInstance = MockedRoom.mock.instances[0];

    expect(response.status).toEqual(400);
    expect(await response.text()).toEqual(
      expect.stringContaining("Room ID must be at least 6 characters"),
    );
    expect(loggerInstance.debug).toHaveBeenCalledWith(
      "New WebSocket connection attempt",
    );
    expect(loggerInstance.error).toHaveBeenCalledWith("Invalid roomId", {
      rawRoomId: "short",
      error: expect.anything(),
    });
    expect(roomInstance).not.toBeDefined();
  });

  it("should delegate to Room DO on /ws with valid roomId", async () => {
    MockedRoom.mockImplementationOnce(
      class {
        fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      } as unknown as typeof MockedRoom,
    );

    const response = await app.request(
      "/ws?roomId=valid-room-id",
      {
        headers: { Upgrade: "websocket" },
      },
      env,
    );

    const loggerInstance = MockedLogger.mock.instances[0];
    const roomInstance = MockedRoom.mock.instances[0];

    expect(roomInstance.fetch).toHaveBeenCalledTimes(1);
    expect(response.status).toEqual(200);
    expect(loggerInstance.debug).toHaveBeenCalledWith(
      "New WebSocket connection attempt",
    );
    expect(loggerInstance.error).not.toHaveBeenCalled();
  });
});
