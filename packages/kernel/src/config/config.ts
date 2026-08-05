import type { ConfigReader } from '@ai-game-arena/sdk';

export class Config implements ConfigReader {
  private data: Map<string, unknown>;

  constructor(initial: Record<string, unknown> = {}) {
    this.data = new Map(Object.entries(initial));
  }

  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  getOrThrow<T>(key: string): T {
    const value = this.data.get(key);
    if (value === undefined) {
      throw new Error(`Config key "${key}" not found`);
    }
    return value as T;
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.data);
  }

  set(key: string, value: unknown): void {
    this.data.set(key, value);
  }

  merge(other: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(other)) {
      this.data.set(key, value);
    }
  }
}
