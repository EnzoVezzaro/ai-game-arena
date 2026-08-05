export interface ReplayEntry {
  readonly frame: number;
  readonly port: number;
  readonly event: unknown;
}

export interface Recording {
  readonly meta: Record<string, unknown>;
  readonly entries: ReplayEntry[];
  readonly length: number;
  push(entry: ReplayEntry): void;
  toJSON(): unknown;
}

export interface Replayer {
  readonly recording: Recording;
  readonly currentFrame: number;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  step(): Promise<void>;
  seek(frame: number): Promise<void>;
}
