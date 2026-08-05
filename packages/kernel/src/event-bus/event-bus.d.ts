import type { DomainEvent, EventHandler, Subscription, EventBus } from '@ai-game-arena/sdk';
export declare class InProcessEventBus implements EventBus {
    private subscriptions;
    private subscriptionCounter;
    publish<T extends DomainEvent>(event: T): Promise<void>;
    subscribe<T extends DomainEvent>(eventType: T['type'], handler: EventHandler<T>): Subscription;
    subscribeAll(handlers: Array<{
        eventType: DomainEvent['type'];
        handler: EventHandler;
    }>): void;
    unsubscribe(subscription: Subscription): void;
    clear(): void;
}
//# sourceMappingURL=event-bus.d.ts.map