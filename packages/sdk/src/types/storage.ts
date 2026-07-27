export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;

  query<T>(table: string, filter: QueryFilter): Promise<T[]>;
  insert<T>(table: string, data: T): Promise<void>;
  update<T>(table: string, filter: QueryFilter, data: Partial<T>): Promise<void>;
  deleteWhere(table: string, filter: QueryFilter): Promise<void>;

  transaction<T>(fn: () => Promise<T>): Promise<T>;

  run(sql: string, params?: unknown[]): Promise<void>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getOne<T>(sql: string, params?: unknown[]): Promise<T | null>;
}

export interface QueryFilter {
  readonly field: string;
  readonly operator: QueryOperator;
  readonly value: unknown;
}

export type QueryOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'contains';
