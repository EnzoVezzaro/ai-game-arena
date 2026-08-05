export type ServiceIdentifier = symbol | string;
export interface ServiceRegistration<T = unknown> {
    identifier: ServiceIdentifier;
    factory: () => T;
    scope: 'singleton' | 'transient';
}
export declare class Container {
    private singletons;
    private factories;
    private scopes;
    register<T>(identifier: ServiceIdentifier, instance: T): void;
    register<T>(identifier: ServiceIdentifier, factory: () => T, scope?: 'singleton' | 'transient'): void;
    resolve<T>(identifier: ServiceIdentifier): T;
    has(identifier: ServiceIdentifier): boolean;
    clear(): void;
}
//# sourceMappingURL=container.d.ts.map