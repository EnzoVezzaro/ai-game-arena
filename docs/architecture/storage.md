# Data Layer

> Extensible persistence abstraction. Every artifact type adds its own tables/schemas through the base storage layer.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      STORAGE MANAGER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Event Store  │ │ Match Store  │ │ Agent Store  │   ← Built-in │
│  │ (append-only)│ │ (battle state)│ │ (profiles)   │             │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Cache      │ │   Assets     │ │  Plugin NS   │   ← Extensible│
│  │ (ephemeral)  │ │ (files)      │ │ (per-plugin) │             │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE ADAPTERS                              │
│  ┌───────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────┐   │
│  │  SQLite   │ │PostgreSQL  │ │  Memory    │ │  Object     │   │
│  │  (dev)    │ │  (prod)    │ │  (test)    │ │  Store (S3) │   │
│  └───────────┘ └────────────┘ └────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Interface

```typescript
// packages/sdk/src/storage/storage.ts
export interface StorageAdapter {
  // Key-value
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;

  // Query
  query<T>(table: string, filter: QueryFilter): Promise<T[]>;
  insert<T>(table: string, data: T): Promise<void>;
  update<T>(table: string, filter: QueryFilter, data: Partial<T>): Promise<void>;
  deleteWhere(table: string, filter: QueryFilter): Promise<void>;

  // Transactions
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  // Raw SQL (migrations)
  run(sql: string, params?: unknown[]): Promise<void>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T>(sql: string, params?: unknown[]): Promise<T | null>;
}

export interface QueryFilter {
  where?: Record<string, unknown>;
  orderBy?: string;
  limit?: number;
  offset?: number;
}
```

---

## Built-in Stores

### Event Store

```sql
-- packages/storage/src/schema/events.sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  version INTEGER NOT NULL,
  payload TEXT NOT NULL,        -- JSON
  metadata TEXT NOT NULL,       -- JSON
  correlation_id TEXT,
  causation_id TEXT
);

CREATE INDEX idx_events_aggregate ON events(aggregate_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_timestamp ON events(timestamp);
```

```typescript
// packages/storage/src/event-store.ts
export class EventStore {
  constructor(private storage: StorageAdapter) {}

  async append(event: DomainEvent): Promise<void> {
    await this.storage.insert('events', {
      id: event.id,
      type: event.type,
      aggregate_id: event.aggregateId,
      aggregate_type: event.aggregateType,
      timestamp: event.timestamp.getTime(),
      version: event.version,
      payload: JSON.stringify(event.payload),
      metadata: JSON.stringify(event.metadata),
      correlation_id: event.metadata.correlationId,
      causation_id: event.metadata.causationId,
    });
  }

  async getEvents(aggregateId: string, fromVersion = 0): Promise<DomainEvent[]> {
    const rows = await this.storage.query('events', {
      where: { aggregate_id: aggregateId, version: { $gt: fromVersion } },
      orderBy: 'version ASC',
    });
    return rows.map(this.deserializeEvent);
  }

  async getEventsByType(type: string, from: Date, to: Date): Promise<DomainEvent[]> {
    return this.storage.query('events', {
      where: { 
        type, 
        timestamp: { $gte: from.getTime(), $lte: to.getTime() } 
      },
      orderBy: 'timestamp ASC',
    });
  }
}
```

### Match Store

```sql
CREATE TABLE battles (
  id TEXT PRIMARY KEY,
  arena_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  status TEXT NOT NULL,
  config TEXT NOT NULL,           -- JSON BattleConfig
  state TEXT,                     -- JSON BattleState
  current_turn INTEGER DEFAULT 0,
  seed INTEGER,
  winner TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  metadata TEXT                   -- JSON
);

CREATE TABLE battle_agents (
  battle_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  strategy TEXT NOT NULL,
  profile_id TEXT,
  score INTEGER DEFAULT 0,
  state TEXT,                     -- JSON AgentState
  PRIMARY KEY (battle_id, agent_id)
);

CREATE TABLE battle_plugins (
  battle_id TEXT NOT NULL,
  plugin_id TEXT NOT NULL,
  PRIMARY KEY (battle_id, plugin_id)
);
```

### Agent Store

```sql
CREATE TABLE agent_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  strategy TEXT NOT NULL,
  custom_strategy TEXT,
  capabilities TEXT NOT NULL,      -- JSON CapabilitySelection
  memory TEXT NOT NULL,            -- JSON MemoryConfig
  personality TEXT NOT NULL,       -- JSON PersonalityConfig
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  strategy TEXT NOT NULL,
  custom_strategy TEXT,
  profile_id TEXT REFERENCES agent_profiles(id),
  model TEXT,
  api_key TEXT,                    -- Encrypted
  created_at INTEGER NOT NULL
);
```

---

## Plugin Storage Namespaces

Each plugin gets isolated storage:

```typescript
// packages/plugin-manager/src/namespaced-storage.ts
export class NamespacedStorage implements StorageAdapter {
  constructor(
    private baseStorage: StorageAdapter,
    private namespace: string  // e.g., "plugin:chat"
  ) {}

  private prefix(key: string): string {
    return `${this.namespace}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.baseStorage.get(this.prefix(key));
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.baseStorage.set(this.prefix(key), value);
  }

  async query<T>(table: string, filter: QueryFilter): Promise<T[]> {
    return this.baseStorage.query(`${this.namespace}:${table}`, filter);
  }

  // ... all methods prefix table names
}
```

### Plugin Tables (Auto-created)

```sql
-- plugin:chat creates these tables
CREATE TABLE "plugin:chat:messages" (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL,
  sender TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  battle_id TEXT
);

CREATE INDEX idx_chat_messages_channel ON "plugin:chat:messages"(channel);
CREATE INDEX idx_chat_messages_battle ON "plugin:chat:messages"(battle_id);

CREATE TABLE "plugin:chat:channels" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  battle_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

---

## Extension Points

### 1. Custom Tables via Manifest

```json
{
  "contributions": {
    "storage": ["my-plugin:leaderboards", "my-plugin:matches"]
  }
}
```

```typescript
// packages/storage/src/plugin-migrator.ts
export async function migratePluginStorage(
  storage: StorageAdapter,
  pluginId: string,
  tables: StorageTable[]
): Promise<void> {
  for (const table of tables) {
    await storage.run(table.ddl);
  }
}
```

### 2. Custom Storage Adapters

```typescript
// plugins/my-plugin/src/postgres-adapter.ts
export class PostgresAdapter implements StorageAdapter {
  constructor(private pool: Pool) {}

  async query<T>(table: string, filter: QueryFilter): Promise<T[]> {
    const { where, orderBy, limit, offset } = filter;
    const conditions = Object.entries(where || {}).map(([k, v], i) => 
      `${k} = $${i + 1}`
    );
    const params = Object.values(where || {});
    
    const sql = `
      SELECT * FROM ${table}
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      ${orderBy ? `ORDER BY ${orderBy}` : ''}
      ${limit ? `LIMIT ${limit}` : ''}
      ${offset ? `OFFSET ${offset}` : ''}
    `;
    
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }

  // ... implement all methods
}
```

### 3. Vector Storage for Embeddings

```typescript
// packages/storage/src/vector-store.ts
export interface VectorStore {
  upsert(records: VectorRecord[]): Promise<void>;
  query(vector: number[], topK: number, filter?: Record<string, unknown>): Promise<VectorResult[]>;
  delete(ids: string[]): Promise<void>;
}

export interface VectorRecord {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

export interface VectorResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}
```

---

## Migrations

```typescript
// packages/storage/src/migrator.ts
export interface Migration {
  version: number;
  name: string;
  up: (storage: StorageAdapter) => Promise<void>;
  down?: (storage: StorageAdapter) => Promise<void>;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: async (storage) => {
      await storage.run(EVENTS_SCHEMA);
      await storage.run(BATTLES_SCHEMA);
      await storage.run(AGENTS_SCHEMA);
    },
  },
  {
    version: 2,
    name: 'add_battle_metadata',
    up: async (storage) => {
      await storage.run('ALTER TABLE battles ADD COLUMN metadata TEXT');
    },
  },
  {
    version: 3,
    name: 'plugin_storage_namespaces',
    up: async (storage) => {
      await storage.run('CREATE TABLE IF NOT EXISTS plugin_manifests (id TEXT PRIMARY KEY, schema TEXT)');
    },
  },
];
```

---

## Testing

```typescript
// packages/storage/tests/adapter.test.ts
import { createTestStorage } from './test-utils';

describe('StorageAdapter', () => {
  let storage: StorageAdapter;

  beforeEach(() => {
    storage = createTestStorage(); // In-memory SQLite
  });

  it('persists and retrieves events', async () => {
    const event = createTestEvent();
    await storage.insert('events', event);
    const results = await storage.query('events', { where: { aggregate_id: event.aggregate_id } });
    expect(results).toHaveLength(1);
  });

  it('supports transactions', async () => {
    await storage.transaction(async () => {
      await storage.insert('battles', { id: '1', status: 'created' });
      await storage.insert('battle_agents', { battle_id: '1', agent_id: 'a1' });
    });
    
    const battles = await storage.query('battles', {});
    expect(battles).toHaveLength(1);
  });
});
```

---

## Configuration

```json
{
  "storage": {
    "type": "sqlite",
    "path": "~/.aga/data/arena.db",
    "options": {
      "wal": true,
      "busyTimeout": 5000
    },
    "migrations": {
      "autoRun": true,
      "tableName": "migrations"
    },
    "pool": {
      "maxConnections": 10
    }
  }
}
```

---

## Forbidden Patterns

| Pattern | Forbidden | Correct |
|---------|-----------|---------|
| Direct SQL in plugins | `storage.run('CREATE TABLE...')` | Declare in manifest, migrator runs it |
| Cross-plugin queries | `storage.query('plugin:other:table')` | Use events for cross-plugin data |
| Raw table names | `events`, `battles` | Use constants: `TABLES.EVENTS` |
| Sync operations | `storage.getSync(key)` | Always async |
| Global connections | `new Pool()` in plugin | Use injected `StorageAdapter` |