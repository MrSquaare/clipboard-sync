import { getErrorMessage } from "../errors/helpers";

export type EventHandler<TArgs extends unknown[]> = (...args: TArgs) => void;

export class EventEmitter<TEventMap extends Record<string, unknown[]>> {
  private readonly eventHandlers = new Map<
    keyof TEventMap,
    Set<EventHandler<TEventMap[keyof TEventMap]>>
  >();
  on<TEvent extends keyof TEventMap>(
    event: TEvent,
    handler: EventHandler<TEventMap[TEvent]>,
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers
      .get(event)
      ?.add(handler as EventHandler<TEventMap[keyof TEventMap]>);

    return () => {
      return this.eventHandlers
        .get(event)
        ?.delete(handler as EventHandler<TEventMap[keyof TEventMap]>);
    };
  }

  emit<TEvent extends keyof TEventMap>(
    event: TEvent,
    ...args: TEventMap[TEvent]
  ): void {
    this.eventHandlers.get(event)?.forEach((handler) => {
      try {
        handler(...args);
      } catch (error) {
        console.error(
          `Event handler failed for "${String(event)}": ${getErrorMessage(error)}`,
        );
      }
    });
  }

  clear(event: keyof TEventMap): void {
    this.eventHandlers.delete(event);
  }

  clearAll(): void {
    this.eventHandlers.clear();
  }
}
