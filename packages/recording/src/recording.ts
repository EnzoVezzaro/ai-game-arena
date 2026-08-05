export interface ReplayEntry {
  readonly frame: number;
  readonly port: number;
  readonly event: unknown;
}

export class Recording {
  constructor(public readonly meta: Record<string, unknown> = {}) {}
  readonly entries: ReplayEntry[] = [];

  push(entry: ReplayEntry): void {
    if (!entry || typeof entry.frame !== 'number' || typeof entry.port !== 'number') return;
    if (!entry.event) return;
    this.entries.push(Object.freeze({ frame: entry.frame, port: entry.port, event: entry.event }));
  }

  get length(): number {
    return this.entries.length;
  }

  toJSON(): unknown {
    return { meta: this.meta, entries: this.entries };
  }
}
