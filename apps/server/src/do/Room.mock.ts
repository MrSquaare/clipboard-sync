import { vi } from "vitest";

import { Room } from "./Room";

vi.mock(import("./Room"), async (importOriginal) => {
  const originalModule = await importOriginal();

  return {
    ...originalModule,
    Room: vi.fn<typeof Room>(
      class {
        fetch = vi.fn();
      } as unknown as typeof Room,
    ),
  };
});

export const MockedRoom = vi.mocked(Room);
