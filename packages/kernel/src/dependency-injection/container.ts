export type ServiceIdentifier = symbol | string;

export interface ServiceRegistration<T = unknown> {
  identifier: ServiceIdentifier;
  factory: () => T;
  scope: 'singleton' | 'transient';
}

export class Container {
  private singletons = new Map<ServiceIdentifier, unknown>();
  private factories = new Map<ServiceIdentifier, () => unknown>();
  private scopes = new Map<ServiceIdentifier, 'singleton' | 'transient'>();

  register<T>(identifier: ServiceIdentifier, instance: T): void;
  register<T>(
    identifier: ServiceIdentifier,
    factory: () => T,
    scope?: 'singleton' | 'transient',
  ): void;
  register<T>(
    identifier: ServiceIdentifier,
    instanceOrFactory: T | (() => T),
    scope: 'singleton' | 'transient' = 'singleton',
  ): void {
    if (typeof instanceOrFactory === 'function') {
      this.factories.set(identifier, instanceOrFactory as () => unknown);
      this.scopes.set(identifier, scope);
    } else {
      this.singletons.set(identifier, instanceOrFactory);
    }
  }

  resolve<T>(identifier: ServiceIdentifier): T {
    if (this.singletons.has(identifier)) {
      return this.singletons.get(identifier) as T;
    }

    const factory = this.factories.get(identifier);
    if (!factory) {
      throw new Error(`Service "${String(identifier)}" not registered`);
    }

    const scope = this.scopes.get(identifier) ?? 'singleton';
    const instance = factory() as T;

    if (scope === 'singleton') {
      this.singletons.set(identifier, instance);
    }

    return instance;
  }

  has(identifier: ServiceIdentifier): boolean {
    return this.singletons.has(identifier) || this.factories.has(identifier);
  }

  clear(): void {
    this.singletons.clear();
    this.factories.clear();
    this.scopes.clear();
  }
}
