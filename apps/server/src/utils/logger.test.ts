import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { Logger, LOG_LEVEL_PRIORITY } from "./logger";

describe("Logger", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with correct level and context", () => {
      const logger = new Logger("debug", "TestContext");

      expect(logger["level"]).toEqual(LOG_LEVEL_PRIORITY.debug);
      expect(logger["context"]).toEqual("TestContext");
    });

    it("should initialize with info level", () => {
      const logger = new Logger("info", "TestContext");

      expect(logger["level"]).toEqual(LOG_LEVEL_PRIORITY.info);
    });

    it("should initialize with warn level", () => {
      const logger = new Logger("warn", "TestContext");

      expect(logger["level"]).toEqual(LOG_LEVEL_PRIORITY.warn);
    });

    it("should initialize with error level", () => {
      const logger = new Logger("error", "TestContext");

      expect(logger["level"]).toEqual(LOG_LEVEL_PRIORITY.error);
    });
  });

  describe("format", () => {
    it("should format message without meta", () => {
      const logger = new Logger("info", "TestContext");

      expect(logger["format"]("info", "Hello world")).toEqual(
        "[2025-01-01T12:00:00.000Z] [TestContext] INFO: Hello world",
      );
    });

    it("should format message with meta", () => {
      const logger = new Logger("info", "TestContext");

      expect(
        logger["format"]("info", "Hello world", { foo: "bar", num: 123 }),
      ).toEqual(
        '[2025-01-01T12:00:00.000Z] [TestContext] INFO: Hello world {"foo":"bar","num":123}',
      );
    });

    it("should handle circular references in meta", () => {
      const logger = new Logger("info", "TestContext");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta: any = { a: 1 };
      meta.self = meta;

      expect(logger["format"]("info", "Circular", meta)).toEqual(
        "[2025-01-01T12:00:00.000Z] [TestContext] INFO: Circular [Circular or Unserializable]",
      );
    });
  });

  describe("debug", () => {
    it("should call format and console.debug when level is debug", () => {
      const logger = new Logger("debug", "TestContext");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatSpy = vi.spyOn(logger as any, "format");
      const consoleSpy = vi.spyOn(console, "debug").mockReturnValueOnce();

      logger.debug("Debug message", { key: "val" });

      expect(formatSpy).toHaveBeenCalledTimes(1);
      expect(formatSpy).toHaveBeenNthCalledWith(1, "debug", "Debug message", {
        key: "val",
      });
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        '[2025-01-01T12:00:00.000Z] [TestContext] DEBUG: Debug message {"key":"val"}',
      );
    });

    it("should not log when level is info", () => {
      const logger = new Logger("info", "TestContext");
      const consoleSpy = vi.spyOn(console, "debug").mockReturnValueOnce();

      logger.debug("Debug message");

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe("info", () => {
    it("should call format and console.info when level is info", () => {
      const logger = new Logger("info", "TestContext");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatSpy = vi.spyOn(logger as any, "format");
      const consoleSpy = vi.spyOn(console, "info").mockReturnValueOnce();

      logger.info("Info message", { key: "val" });

      expect(formatSpy).toHaveBeenCalledTimes(1);
      expect(formatSpy).toHaveBeenNthCalledWith(1, "info", "Info message", {
        key: "val",
      });
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        '[2025-01-01T12:00:00.000Z] [TestContext] INFO: Info message {"key":"val"}',
      );
    });

    it("should log when level is debug", () => {
      const logger = new Logger("debug", "TestContext");
      const consoleSpy = vi.spyOn(console, "info").mockReturnValueOnce();

      logger.info("Info message");

      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it("should not log when level is warn", () => {
      const logger = new Logger("warn", "TestContext");
      const consoleSpy = vi.spyOn(console, "info").mockReturnValueOnce();

      logger.info("Info message");

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe("warn", () => {
    it("should call format and console.warn when level is warn", () => {
      const logger = new Logger("warn", "TestContext");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatSpy = vi.spyOn(logger as any, "format");
      const consoleSpy = vi.spyOn(console, "warn").mockReturnValueOnce();

      logger.warn("Warn message", { key: "val" });

      expect(formatSpy).toHaveBeenCalledTimes(1);
      expect(formatSpy).toHaveBeenNthCalledWith(1, "warn", "Warn message", {
        key: "val",
      });
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        '[2025-01-01T12:00:00.000Z] [TestContext] WARN: Warn message {"key":"val"}',
      );
    });

    it("should log when level is info", () => {
      const logger = new Logger("info", "TestContext");
      const consoleSpy = vi.spyOn(console, "warn").mockReturnValueOnce();

      logger.warn("Warn message");

      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it("should not log when level is error", () => {
      const logger = new Logger("error", "TestContext");
      const consoleSpy = vi.spyOn(console, "warn").mockReturnValueOnce();

      logger.warn("Warn message");

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe("error", () => {
    it("should call format and console.error when level is error", () => {
      const logger = new Logger("error", "TestContext");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatSpy = vi.spyOn(logger as any, "format");
      const consoleSpy = vi.spyOn(console, "error").mockReturnValueOnce();

      logger.error("Error message", { key: "val" });

      expect(formatSpy).toHaveBeenCalledTimes(1);
      expect(formatSpy).toHaveBeenNthCalledWith(1, "error", "Error message", {
        key: "val",
      });
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenNthCalledWith(
        1,
        '[2025-01-01T12:00:00.000Z] [TestContext] ERROR: Error message {"key":"val"}',
      );
    });

    it("should log when level is warn", () => {
      const logger = new Logger("warn", "TestContext");
      const consoleSpy = vi.spyOn(console, "error").mockReturnValueOnce();

      logger.error("Error message");

      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });
  });
});
