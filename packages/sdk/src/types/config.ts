export interface ConfigReader {
  get<T>(key: string): T | undefined;
  getOrThrow<T>(key: string): T;
  has(key: string): boolean;
  getAll(): Record<string, unknown>;
}
