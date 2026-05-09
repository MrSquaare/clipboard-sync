// eslint-disable-next-line import/order
import { MockedLogger } from "../utils/logger.mock";

import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createMockedWebSocket } from "../test/mocks/websocket";

import { Room } from "./Room";

const FIXED_UUID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SENDER_ID = "11111111-1111-4111-8111-111111111111";
const TARGET_ID = "22222222-2222-4222-8222-222222222222";
const TARGET_ID_2 = "33333333-3333-4333-8333-333333333333";
const SENDER_NAME = "Sender";
const TARGET_NAME = "Target";
const TARGET_NAME_2 = "Target 2";

const ENCRYPTED_PAYLOAD = {
  ciphertext: "encrypted-data",
  iv: "iv-value",
  salt: "salt-value",
} as const;

describe("Room", () => {
  let id: DurableObjectId;
  let stub: DurableObjectStub<Room>;

  beforeEach(() => {
    id = env.ROOM.newUniqueId();
    stub = env.ROOM.get(id);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize logger in constructor", async () => {
    await runInDurableObject(stub, async () => {
      expect(MockedLogger).toHaveBeenCalledTimes(1);
      expect(MockedLogger).toHaveBeenCalledWith(env.LOG_LEVEL, "Room");
    });
  });

  describe("fetch", () => {
    it("should return 426 when the Upgrade header is missing", async () => {
      const response = await stub.fetch(new Request("http://localhost/"));

      expect(response.status).toEqual(426);
      await expect(response.text()).resolves.toEqual(
        "Expected Upgrade: websocket",
      );
    });

    it("should return 400 when roomId query param is missing", async () => {
      const response = await stub.fetch(
        new Request("http://localhost/", {
          headers: { Upgrade: "websocket" },
        }),
      );

      expect(response.status).toEqual(400);
      await expect(response.text()).resolves.toEqual(
        expect.stringContaining("expected string, received null"),
      );
    });

    it("should return 400 when roomId is too short", async () => {
      const response = await stub.fetch(
        new Request("http://localhost/?roomId=short", {
          headers: { Upgrade: "websocket" },
        }),
      );

      expect(response.status).toEqual(400);
      await expect(response.text()).resolves.toEqual(
        expect.stringContaining("Room ID must be at least 6 characters"),
      );
    });

    it("should return 101 and call acceptWebSocket for a valid upgrade", async () => {
      await runInDurableObject(
        stub,
        async (instance: Room, state: DurableObjectState) => {
          const acceptWebSocketSpy = vi.spyOn(state, "acceptWebSocket");

          const response = await instance.fetch(
            new Request("http://localhost/?roomId=valid-room-id", {
              headers: { Upgrade: "websocket" },
            }),
          );

          expect(response.status).toEqual(101);
          expect(response.webSocket).toBeDefined();
          expect(acceptWebSocketSpy).toHaveBeenCalledTimes(1);
        },
      );
    });
  });

  describe("webSocketMessage", () => {
    describe("HELLO", () => {
      it("should send WELCOME with clientId and empty client list, then broadcast CLIENT_JOINED for a new session", async () => {
        await runInDurableObject(
          stub,
          async (instance: Room, state: DurableObjectState) => {
            vi.spyOn(crypto, "randomUUID").mockReturnValueOnce(FIXED_UUID);

            const senderWS = createMockedWebSocket();

            vi.spyOn(state, "getWebSockets").mockReturnValueOnce([senderWS]);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sendSpy = vi.spyOn(instance as any, "send");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const broadcastSpy = vi.spyOn(instance as any, "broadcast");

            await instance.webSocketMessage(
              senderWS,
              JSON.stringify({
                type: "HELLO",
                payload: { version: 1, clientName: SENDER_NAME },
              }),
            );

            expect(senderWS.serializeAttachment).toHaveBeenCalledTimes(1);
            expect(senderWS.serializeAttachment).toHaveBeenCalledWith({
              id: FIXED_UUID,
              name: SENDER_NAME,
            });
            expect(sendSpy).toHaveBeenCalledTimes(1);
            expect(sendSpy).toHaveBeenCalledWith(
              {
                ws: senderWS,
                attachment: { id: FIXED_UUID, name: SENDER_NAME },
              },
              {
                type: "WELCOME",
                payload: { clientId: FIXED_UUID, clients: [] },
              },
            );
            expect(broadcastSpy).toHaveBeenCalledTimes(1);
            expect(broadcastSpy).toHaveBeenCalledWith([], {
              type: "CLIENT_JOINED",
              payload: { id: FIXED_UUID, name: SENDER_NAME },
            });
          },
        );
      });

      it("should send WELCOME and skip CLIENT_JOINED broadcast for an existing session", async () => {
        await runInDurableObject(
          stub,
          async (instance: Room, state: DurableObjectState) => {
            const senderWS = createMockedWebSocket();

            senderWS.deserializeAttachment.mockReturnValueOnce({
              id: SENDER_ID,
              name: SENDER_NAME,
            });

            vi.spyOn(state, "getWebSockets").mockReturnValueOnce([senderWS]);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const broadcastSpy = vi.spyOn(instance as any, "broadcast");

            await instance.webSocketMessage(
              senderWS,
              JSON.stringify({
                type: "HELLO",
                payload: { version: 1, clientName: SENDER_NAME },
              }),
            );

            expect(senderWS.serializeAttachment).toHaveBeenCalledTimes(1);
            expect(senderWS.serializeAttachment).toHaveBeenCalledWith({
              id: SENDER_ID,
              name: SENDER_NAME,
            });
            expect(broadcastSpy).toHaveBeenCalledTimes(0);
          },
        );
      });
    });

    describe("PING", () => {
      it("should dispatch to handleHeartbeat", async () => {
        await runInDurableObject(stub, async (instance: Room) => {
          const senderWS = createMockedWebSocket();

          senderWS.deserializeAttachment.mockReturnValueOnce({
            id: SENDER_ID,
            name: SENDER_NAME,
          });

          const handleHeartbeatSpy = vi
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .spyOn(instance as any, "handleHeartbeat")
            .mockImplementationOnce(() => {});

          await instance.webSocketMessage(
            senderWS,
            JSON.stringify({ type: "PING" }),
          );

          expect(handleHeartbeatSpy).toHaveBeenCalledTimes(1);
          expect(handleHeartbeatSpy).toHaveBeenCalledWith({
            ws: senderWS,
            attachment: { id: SENDER_ID, name: SENDER_NAME },
          });
        });
      });
    });

    describe("LEAVE", () => {
      it("should dispatch to handleLeave", async () => {
        await runInDurableObject(stub, async (instance: Room) => {
          const senderWS = createMockedWebSocket();

          senderWS.deserializeAttachment.mockReturnValueOnce({
            id: SENDER_ID,
            name: SENDER_NAME,
          });

          const handleLeaveSpy = vi
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .spyOn(instance as any, "handleLeave")
            .mockImplementationOnce(() => {});

          await instance.webSocketMessage(
            senderWS,
            JSON.stringify({ type: "LEAVE" }),
          );

          expect(handleLeaveSpy).toHaveBeenCalledTimes(1);
          expect(handleLeaveSpy).toHaveBeenCalledWith({
            ws: senderWS,
            attachment: { id: SENDER_ID, name: SENDER_NAME },
          });
        });
      });
    });

    describe("RELAY_BROADCAST", () => {
      it("should dispatch to handleRelayBroadcast with no targetIds", async () => {
        await runInDurableObject(stub, async (instance: Room) => {
          const senderWS = createMockedWebSocket();

          senderWS.deserializeAttachment.mockReturnValueOnce({
            id: SENDER_ID,
            name: SENDER_NAME,
          });

          const handleRelayBroadcastSpy = vi
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .spyOn(instance as any, "handleRelayBroadcast")
            .mockImplementationOnce(() => {});

          await instance.webSocketMessage(
            senderWS,
            JSON.stringify({
              type: "RELAY_BROADCAST",
              payload: ENCRYPTED_PAYLOAD,
            }),
          );

          expect(handleRelayBroadcastSpy).toHaveBeenCalledTimes(1);
          expect(handleRelayBroadcastSpy).toHaveBeenCalledWith(
            {
              ws: senderWS,
              attachment: { id: SENDER_ID, name: SENDER_NAME },
            },
            undefined,
            ENCRYPTED_PAYLOAD,
          );
        });
      });

      it("should dispatch to handleRelayBroadcast with targetIds when provided", async () => {
        await runInDurableObject(stub, async (instance: Room) => {
          const senderWS = createMockedWebSocket();

          senderWS.deserializeAttachment.mockReturnValueOnce({
            id: SENDER_ID,
            name: SENDER_NAME,
          });

          const handleRelayBroadcastSpy = vi
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .spyOn(instance as any, "handleRelayBroadcast")
            .mockImplementationOnce(() => {});

          await instance.webSocketMessage(
            senderWS,
            JSON.stringify({
              type: "RELAY_BROADCAST",
              targetIds: [TARGET_ID],
              payload: ENCRYPTED_PAYLOAD,
            }),
          );

          expect(handleRelayBroadcastSpy).toHaveBeenCalledTimes(1);
          expect(handleRelayBroadcastSpy).toHaveBeenCalledWith(
            {
              ws: senderWS,
              attachment: { id: SENDER_ID, name: SENDER_NAME },
            },
            [TARGET_ID],
            ENCRYPTED_PAYLOAD,
          );
        });
      });
    });

    describe("RELAY_SEND", () => {
      it("should dispatch to handleRelaySend with targetId and payload", async () => {
        await runInDurableObject(stub, async (instance: Room) => {
          const senderWS = createMockedWebSocket();

          senderWS.deserializeAttachment.mockReturnValueOnce({
            id: SENDER_ID,
            name: SENDER_NAME,
          });

          const handleRelaySendSpy = vi
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .spyOn(instance as any, "handleRelaySend")
            .mockImplementationOnce(() => {});

          await instance.webSocketMessage(
            senderWS,
            JSON.stringify({
              type: "RELAY_SEND",
              targetId: TARGET_ID,
              payload: ENCRYPTED_PAYLOAD,
            }),
          );

          expect(handleRelaySendSpy).toHaveBeenCalledTimes(1);
          expect(handleRelaySendSpy).toHaveBeenCalledWith(
            {
              ws: senderWS,
              attachment: { id: SENDER_ID, name: SENDER_NAME },
            },
            TARGET_ID,
            ENCRYPTED_PAYLOAD,
          );
        });
      });
    });

    describe("ArrayBuffer", () => {
      it("should decode and dispatch an ArrayBuffer message identically to a string", async () => {
        await runInDurableObject(stub, async (instance: Room) => {
          const senderWS = createMockedWebSocket();

          senderWS.deserializeAttachment.mockReturnValueOnce({
            id: SENDER_ID,
            name: SENDER_NAME,
          });

          const handleHeartbeatSpy = vi
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .spyOn(instance as any, "handleHeartbeat")
            .mockImplementationOnce(() => {});
          const message = new TextEncoder().encode(
            JSON.stringify({ type: "PING" }),
          );

          await instance.webSocketMessage(
            senderWS,
            message.buffer as ArrayBuffer,
          );

          expect(handleHeartbeatSpy).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe("error cases", () => {
      it("should send ERROR when the message is invalid JSON", async () => {
        await runInDurableObject(stub, async (instance: Room) => {
          const senderWS = createMockedWebSocket();

          await instance.webSocketMessage(senderWS, "not-json");

          expect(senderWS.send).toHaveBeenCalledTimes(1);
          expect(senderWS.send).toHaveBeenCalledWith(
            JSON.stringify({
              type: "ERROR",
              payload: { message: "Error handling message" },
            }),
          );
        });
      });

      it("should send ERROR when the message has an unknown type", async () => {
        await runInDurableObject(stub, async (instance: Room) => {
          const senderWS = createMockedWebSocket();

          await instance.webSocketMessage(
            senderWS,
            JSON.stringify({ type: "UNKNOWN" }),
          );

          expect(senderWS.send).toHaveBeenCalledTimes(1);
          expect(senderWS.send).toHaveBeenCalledWith(
            JSON.stringify({
              type: "ERROR",
              payload: { message: "Invalid message received" },
            }),
          );
        });
      });

      it("should send ERROR when a non-HELLO message is received before HELLO", async () => {
        await runInDurableObject(stub, async (instance: Room) => {
          const senderWS = createMockedWebSocket();

          await instance.webSocketMessage(
            senderWS,
            JSON.stringify({ type: "PING" }),
          );

          expect(senderWS.send).toHaveBeenCalledTimes(1);
          expect(senderWS.send).toHaveBeenCalledWith(
            JSON.stringify({
              type: "ERROR",
              payload: { message: "Message received before HELLO" },
            }),
          );
        });
      });

      it("should not throw when send itself throws during error delivery", async () => {
        await runInDurableObject(stub, async (instance: Room) => {
          const senderWS = createMockedWebSocket();

          senderWS.send.mockImplementationOnce(() => {
            throw new Error("Send failed");
          });

          await expect(
            instance.webSocketMessage(senderWS, "not-json"),
          ).resolves.not.toThrow();
        });
      });
    });
  });

  describe("webSocketClose", () => {
    it("should broadcast CLIENT_LEFT to all other connected clients", async () => {
      await runInDurableObject(
        stub,
        async (instance: Room, state: DurableObjectState) => {
          const closingWS = createMockedWebSocket();

          closingWS.deserializeAttachment.mockReturnValueOnce({
            id: SENDER_ID,
            name: SENDER_NAME,
          });

          const otherWS = createMockedWebSocket();

          otherWS.deserializeAttachment.mockReturnValueOnce({
            id: TARGET_ID,
            name: TARGET_NAME,
          });

          vi.spyOn(state, "getWebSockets").mockReturnValueOnce([
            closingWS,
            otherWS,
          ]);

          await instance.webSocketClose(closingWS, 1000, "Closed", true);

          expect(otherWS.send).toHaveBeenCalledTimes(1);
          expect(otherWS.send).toHaveBeenCalledWith(
            JSON.stringify({
              type: "CLIENT_LEFT",
              payload: { id: SENDER_ID, name: SENDER_NAME },
            }),
          );
        },
      );
    });

    it("should do nothing when the closing socket has no established session", async () => {
      await runInDurableObject(stub, async (instance: Room) => {
        const senderWS = createMockedWebSocket();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const broadcastSpy = vi.spyOn(instance as any, "broadcast");

        await instance.webSocketClose(senderWS, 1000, "Closed", true);

        expect(broadcastSpy).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe("webSocketError", () => {
    it("should call webSocketClose with code 1006 and the error string", async () => {
      await runInDurableObject(stub, async (instance: Room) => {
        const senderWS = createMockedWebSocket();
        const webSocketCloseSpy = vi
          .spyOn(instance, "webSocketClose")
          .mockImplementationOnce(async () => {});

        await instance.webSocketError(senderWS, new Error("Test Error"));

        expect(webSocketCloseSpy).toHaveBeenCalledTimes(1);
        expect(webSocketCloseSpy).toHaveBeenCalledWith(
          senderWS,
          1006,
          "Error: Error: Test Error",
          false,
        );
      });
    });
  });

  describe("handleHeartbeat", () => {
    it("should send PONG to the session", async () => {
      await runInDurableObject(stub, async (instance: Room) => {
        const senderWS = createMockedWebSocket();
        const session = {
          ws: senderWS,
          attachment: { id: SENDER_ID, name: SENDER_NAME },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).handleHeartbeat(session);

        expect(senderWS.send).toHaveBeenCalledTimes(1);
        expect(senderWS.send).toHaveBeenCalledWith(
          JSON.stringify({ type: "PONG" }),
        );
      });
    });
  });

  describe("handleLeave", () => {
    it("should close the WebSocket with code 1000", async () => {
      await runInDurableObject(stub, async (instance: Room) => {
        const senderWS = createMockedWebSocket();
        const session = {
          ws: senderWS,
          attachment: { id: SENDER_ID, name: SENDER_NAME },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (instance as any).handleLeave(session);

        expect(senderWS.close).toHaveBeenCalledTimes(1);
        expect(senderWS.close).toHaveBeenCalledWith(1000, "Left by user");
      });
    });
  });

  describe("handleRelayBroadcast", () => {
    it("should send to all peers except the sender when no targetIds given", async () => {
      await runInDurableObject(
        stub,
        async (instance: Room, state: DurableObjectState) => {
          const senderWS = createMockedWebSocket();

          senderWS.deserializeAttachment.mockReturnValueOnce({
            id: SENDER_ID,
            name: SENDER_NAME,
          });

          const targetWS = createMockedWebSocket();

          targetWS.deserializeAttachment.mockReturnValueOnce({
            id: TARGET_ID,
            name: TARGET_NAME,
          });

          vi.spyOn(state, "getWebSockets").mockReturnValueOnce([
            senderWS,
            targetWS,
          ]);

          const session = {
            ws: senderWS,
            attachment: { id: SENDER_ID, name: SENDER_NAME },
          };

          instance["handleRelayBroadcast"](
            session,
            undefined,
            ENCRYPTED_PAYLOAD,
          );

          expect(targetWS.send).toHaveBeenCalledTimes(1);
          expect(targetWS.send).toHaveBeenCalledWith(
            JSON.stringify({
              type: "RELAY_BROADCAST",
              senderId: SENDER_ID,
              payload: ENCRYPTED_PAYLOAD,
            }),
          );
          expect(senderWS.send).toHaveBeenCalledTimes(0);
        },
      );
    });

    it("should only send to listed targetIds when provided", async () => {
      await runInDurableObject(
        stub,
        async (instance: Room, state: DurableObjectState) => {
          const senderWS = createMockedWebSocket();

          senderWS.deserializeAttachment.mockReturnValueOnce({
            id: SENDER_ID,
            name: SENDER_NAME,
          });

          const targetWS1 = createMockedWebSocket();

          targetWS1.deserializeAttachment.mockReturnValueOnce({
            id: TARGET_ID,
            name: TARGET_NAME,
          });

          const targetWS2 = createMockedWebSocket();

          targetWS2.deserializeAttachment.mockReturnValueOnce({
            id: TARGET_ID_2,
            name: TARGET_NAME_2,
          });

          vi.spyOn(state, "getWebSockets").mockReturnValueOnce([
            senderWS,
            targetWS1,
            targetWS2,
          ]);

          const session = {
            ws: senderWS,
            attachment: { id: SENDER_ID, name: SENDER_NAME },
          };

          instance["handleRelayBroadcast"](
            session,
            [TARGET_ID],
            ENCRYPTED_PAYLOAD,
          );

          expect(targetWS1.send).toHaveBeenCalledTimes(1);
          expect(targetWS1.send).toHaveBeenCalledWith(
            JSON.stringify({
              type: "RELAY_BROADCAST",
              senderId: SENDER_ID,
              payload: ENCRYPTED_PAYLOAD,
            }),
          );
          expect(targetWS2.send).toHaveBeenCalledTimes(0);
          expect(senderWS.send).toHaveBeenCalledTimes(0);
        },
      );
    });

    it("should continue delivering to remaining peers when one send fails", async () => {
      await runInDurableObject(
        stub,
        async (instance: Room, state: DurableObjectState) => {
          const senderWS = createMockedWebSocket();

          senderWS.deserializeAttachment.mockReturnValueOnce({
            id: SENDER_ID,
            name: SENDER_NAME,
          });

          const targetWS1 = createMockedWebSocket();

          targetWS1.deserializeAttachment.mockReturnValueOnce({
            id: TARGET_ID,
            name: TARGET_NAME,
          });
          targetWS1.send.mockImplementationOnce(() => {
            throw new Error("Send failed");
          });

          const targetWS2 = createMockedWebSocket();

          targetWS2.deserializeAttachment.mockReturnValueOnce({
            id: TARGET_ID_2,
            name: TARGET_NAME_2,
          });

          vi.spyOn(state, "getWebSockets").mockReturnValueOnce([
            senderWS,
            targetWS1,
            targetWS2,
          ]);

          const session = {
            ws: senderWS,
            attachment: { id: SENDER_ID, name: SENDER_NAME },
          };

          instance["handleRelayBroadcast"](
            session,
            undefined,
            ENCRYPTED_PAYLOAD,
          );

          expect(targetWS1.send).toHaveBeenCalledTimes(1);
          expect(targetWS2.send).toHaveBeenCalledTimes(1);
          expect(targetWS2.send).toHaveBeenCalledWith(
            JSON.stringify({
              type: "RELAY_BROADCAST",
              senderId: SENDER_ID,
              payload: ENCRYPTED_PAYLOAD,
            }),
          );
        },
      );
    });
  });

  describe("handleRelaySend", () => {
    it("should forward the message to the target client", async () => {
      await runInDurableObject(
        stub,
        async (instance: Room, state: DurableObjectState) => {
          const senderWS = createMockedWebSocket();

          senderWS.deserializeAttachment.mockReturnValueOnce({
            id: SENDER_ID,
            name: SENDER_NAME,
          });

          const targetWS = createMockedWebSocket();

          targetWS.deserializeAttachment.mockReturnValueOnce({
            id: TARGET_ID,
            name: TARGET_NAME,
          });

          vi.spyOn(state, "getWebSockets").mockReturnValueOnce([
            senderWS,
            targetWS,
          ]);

          const session = {
            ws: senderWS,
            attachment: { id: SENDER_ID, name: SENDER_NAME },
          };

          instance["handleRelaySend"](session, TARGET_ID, ENCRYPTED_PAYLOAD);

          expect(targetWS.send).toHaveBeenCalledTimes(1);
          expect(targetWS.send).toHaveBeenCalledWith(
            JSON.stringify({
              type: "RELAY_SEND",
              senderId: SENDER_ID,
              payload: ENCRYPTED_PAYLOAD,
            }),
          );
        },
      );
    });

    it("should send ERROR to sender when target client is not found", async () => {
      await runInDurableObject(
        stub,
        async (instance: Room, state: DurableObjectState) => {
          const senderWS = createMockedWebSocket();

          senderWS.deserializeAttachment.mockReturnValueOnce({
            id: SENDER_ID,
            name: SENDER_NAME,
          });

          vi.spyOn(state, "getWebSockets").mockReturnValueOnce([senderWS]);

          const session = {
            ws: senderWS,
            attachment: { id: SENDER_ID, name: SENDER_NAME },
          };

          instance["handleRelaySend"](session, TARGET_ID, ENCRYPTED_PAYLOAD);

          expect(senderWS.send).toHaveBeenCalledTimes(1);
          expect(senderWS.send).toHaveBeenCalledWith(
            JSON.stringify({
              type: "ERROR",
              payload: { message: "Target client not found" },
            }),
          );
        },
      );
    });

    it("should not crash when the send to target throws", async () => {
      await runInDurableObject(
        stub,
        async (instance: Room, state: DurableObjectState) => {
          const senderWS = createMockedWebSocket();

          senderWS.deserializeAttachment.mockReturnValueOnce({
            id: SENDER_ID,
            name: SENDER_NAME,
          });

          const targetWS = createMockedWebSocket();

          targetWS.deserializeAttachment.mockReturnValueOnce({
            id: TARGET_ID,
            name: TARGET_NAME,
          });
          targetWS.send.mockImplementationOnce(() => {
            throw new Error("Send failed");
          });

          vi.spyOn(state, "getWebSockets").mockReturnValueOnce([
            senderWS,
            targetWS,
          ]);

          const session = {
            ws: senderWS,
            attachment: { id: SENDER_ID, name: SENDER_NAME },
          };

          expect(() =>
            instance["handleRelaySend"](session, TARGET_ID, ENCRYPTED_PAYLOAD),
          ).not.toThrow();
        },
      );
    });
  });
});
