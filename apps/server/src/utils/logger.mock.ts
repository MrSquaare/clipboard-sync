import { vi } from "vitest";

import { Logger } from "./logger";

vi.mock(import("./logger"), async (importOriginal) => {
  const originalModule = await importOriginal();

  return {
    ...originalModule,
    Logger: vi.fn<typeof Logger>(
      class {
        debug = vi.fn();
        info = vi.fn();
        warn = vi.fn();
        error = vi.fn();
      } as unknown as typeof Logger,
    ),
  };
});

export const MockedLogger = vi.mocked(Logger);
