import { Database } from 'bun:sqlite';
import type { StorageAdapter, QueryFilter } from '@ai-game-arena/sdk';

export class SqliteStorage implements StorageAdapter {
  private db: Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        aggregate_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        version INTEGER NOT NULL,
        payload TEXT NOT NULL,
        metadata TEXT NOT NULL,
        correlation_id TEXT,
        causation_id TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_events_aggregate ON events(aggregate_id);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

      CREATE TABLE IF NOT EXISTS battles (
        id TEXT PRIMARY KEY,
        config TEXT NOT NULL,
        state TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        manifest TEXT NOT NULL,
        status TEXT NOT NULL,
        path TEXT NOT NULL,
        description TEXT,
        published_at INTEGER,
        published_by TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
      CREATE INDEX IF NOT EXISTS idx_artifacts_status ON artifacts(status);
      CREATE INDEX IF NOT EXISTS idx_artifacts_slug ON artifacts(slug);
    `);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private execRun(stmt: ReturnType<Database['prepare']>, ...args: any[]): void {
    stmt.run(...args);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private execGet(stmt: ReturnType<Database['prepare']>, ...args: any[]): unknown {
    return stmt.get(...args);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private execAll(stmt: ReturnType<Database['prepare']>, ...args: any[]): unknown[] {
    return stmt.all(...args);
  }

  async get<T>(key: string): Promise<T | null> {
    const row = this.execGet(this.db.prepare('SELECT value FROM kv_store WHERE key = ?'), key) as {
      value: string;
    } | null;
    return row ? (JSON.parse(row.value) as T) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.execRun(
      this.db.prepare('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)'),
      key,
      JSON.stringify(value),
    );
  }

  async delete(key: string): Promise<void> {
    this.execRun(this.db.prepare('DELETE FROM kv_store WHERE key = ?'), key);
  }

  async has(key: string): Promise<boolean> {
    return this.execGet(this.db.prepare('SELECT 1 FROM kv_store WHERE key = ?'), key) !== null;
  }

  async query<T>(table: string, filter: QueryFilter): Promise<T[]> {
    const { sql, params } = this.buildQuery(table, filter);
    return this.execAll(this.db.prepare(sql), ...params) as T[];
  }

  async insert<T>(table: string, data: T): Promise<void> {
    const entries = Object.entries(data as Record<string, unknown>);
    const columns = entries.map(([k]) => k).join(', ');
    const placeholders = entries.map(() => '?').join(', ');
    const values = entries.map(([, v]) => (typeof v === 'object' ? JSON.stringify(v) : v));
    this.execRun(
      this.db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`),
      ...values,
    );
  }

  async update<T>(table: string, filter: QueryFilter, data: Partial<T>): Promise<void> {
    const setClauses = Object.keys(data).map((k) => `${k} = ?`);
    const setValues = Object.values(data).map((v) =>
      typeof v === 'object' ? JSON.stringify(v) : v,
    );
    const { whereClause, params: whereParams } = this.buildWhereClause(filter);
    this.execRun(
      this.db.prepare(`UPDATE ${table} SET ${setClauses.join(', ')} ${whereClause}`),
      ...setValues,
      ...whereParams,
    );
  }

  async deleteWhere(table: string, filter: QueryFilter): Promise<void> {
    const { whereClause, params } = this.buildWhereClause(filter);
    this.execRun(this.db.prepare(`DELETE FROM ${table} ${whereClause}`), ...params);
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.db.transaction(fn)();
  }

  async run(sql: string, params?: unknown[]): Promise<void> {
    this.execRun(this.db.prepare(sql), ...(params ?? []));
  }

  async all<T>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.execAll(this.db.prepare(sql), ...(params ?? [])) as T[];
  }

  async getOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    return (this.execGet(this.db.prepare(sql), ...(params ?? [])) as T) ?? null;
  }

  close(): void {
    this.db.close();
  }

  private buildQuery(table: string, filter: QueryFilter): { sql: string; params: unknown[] } {
    const { whereClause, params } = this.buildWhereClause(filter);
    return {
      sql: `SELECT * FROM ${table} ${whereClause}`,
      params,
    };
  }

  private buildWhereClause(filter: QueryFilter): { whereClause: string; params: unknown[] } {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'eq':
        return { whereClause: `WHERE ${field} = ?`, params: [value] };
      case 'neq':
        return { whereClause: `WHERE ${field} != ?`, params: [value] };
      case 'gt':
        return { whereClause: `WHERE ${field} > ?`, params: [value] };
      case 'gte':
        return { whereClause: `WHERE ${field} >= ?`, params: [value] };
      case 'lt':
        return { whereClause: `WHERE ${field} < ?`, params: [value] };
      case 'lte':
        return { whereClause: `WHERE ${field} <= ?`, params: [value] };
      case 'in': {
        const arr = value as unknown[];
        return { whereClause: `WHERE ${field} IN (${arr.map(() => '?').join(',')})`, params: arr };
      }
      case 'like':
        return { whereClause: `WHERE ${field} LIKE ?`, params: [value] };
      case 'contains':
        return { whereClause: `WHERE ${field} LIKE ?`, params: [`%${value}%`] };
      default:
        return { whereClause: '', params: [] };
    }
  }
}
