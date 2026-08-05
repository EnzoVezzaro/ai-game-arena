import type { MemoryEntry } from './agent';

export interface MemoryProvider {
  store(entry: MemoryEntry): Promise<void>;
  retrieve(query: string): Promise<MemoryEntry[]>;
  search(query: string): Promise<MemoryEntry[]>;
  forget(id: string): Promise<void>;
}

export interface Identity {
  readonly id: string;
  readonly name: string;
  readonly traits: Record<string, unknown>;
  readonly relationships: Record<string, unknown>;
  readonly inventory: Record<string, unknown>;
  readonly knowledge: Record<string, unknown>;
  readonly memories: MemoryEntry[];
  readonly goals: string[];
  readonly statistics: Record<string, unknown>;
}

export interface IdentityState {
  readonly identity: Identity;
  readonly cognitiveState: Record<string, unknown>;
  readonly updatedAt: number;
}
