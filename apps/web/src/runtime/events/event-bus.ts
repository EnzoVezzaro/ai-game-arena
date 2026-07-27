type EventHandler<T = unknown> = (event: T) => void;

export interface EventBus {
  on<T>(event: string, handler: EventHandler<T>): () => void;
  emit<T>(event: string, data: T): void;
  off(event: string, handler: EventHandler): void;
}

export function createEventBus(): EventBus {
  const listeners = new Map<string, Set<EventHandler>>();

  return {
    on<T>(event: string, handler: EventHandler<T>): () => void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler as EventHandler);
      return () => {
        listeners.get(event)?.delete(handler as EventHandler);
      };
    },

    emit<T>(event: string, data: T): void {
      listeners.get(event)?.forEach((handler) => handler(data));
    },

    off(event: string, handler: EventHandler): void {
      listeners.get(event)?.delete(handler);
    },
  };
}
