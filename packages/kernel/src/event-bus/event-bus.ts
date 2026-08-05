import type { DomainEvent, EventHandler, Subscription, EventBus } from '@ai-game-arena/sdk';

export class InProcessEventBus implements EventBus {
  private subscriptions = new Map<string, Map<string, EventHandler>>();
  private subscriptionCounter = 0;

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const handlers = this.subscriptions.get(event.type);
    if (!handlers) return;

    const promises: Promise<void>[] = [];
    for (const handler of handlers.values()) {
      promises.push(handler(event as DomainEvent));
    }
    await Promise.allSettled(promises);
  }

  subscribe<T extends DomainEvent>(eventType: T['type'], handler: EventHandler<T>): Subscription {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Map());
    }

    const id = `sub-${++this.subscriptionCounter}`;
    this.subscriptions.get(eventType)!.set(id, handler as EventHandler);

    return {
      id,
      unsubscribe: () => {
        this.subscriptions.get(eventType)?.delete(id);
      },
    };
  }

  subscribeAll(handlers: Array<{ eventType: DomainEvent['type']; handler: EventHandler }>): void {
    for (const { eventType, handler } of handlers) {
      this.subscribe(eventType, handler);
    }
  }

  unsubscribe(subscription: Subscription): void {
    subscription.unsubscribe();
  }

  clear(): void {
    this.subscriptions.clear();
  }
}
