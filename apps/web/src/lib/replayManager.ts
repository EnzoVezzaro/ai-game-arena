/**
 * ReplayManager — deterministic playback for finished/aborted battles.
 *
 * Live battles run at their own pace (the AI decides when it acts), so there is
 * no playback speed in live mode. SPEED is a replay-only concept, owned here.
 *
 * Backed by the existing server endpoint `GET /api/battles/:id/replay`, which
 * returns the recorded event stream for the battle.
 *
 * See `docs/battles/replay.md` for the full ReplaySession contract this mirrors.
 */
export type ReplaySpeed = 0.5 | 1 | 2 | 4 | 8;

export interface ReplayEvent {
  type: string;
  timestamp: number;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ReplayData {
  id: string;
  arenaId: string;
  agents: Array<{ id: string; name?: string }>;
  events: ReplayEvent[];
}

export interface ReplayStep {
  readonly index: number;
  readonly event: ReplayEvent | null;
  readonly turn: number;
  readonly done: boolean;
}

export interface InitOptions {
  initialSpeed?: ReplaySpeed;
}

export class ReplayManager {
  private speed: ReplaySpeed = 1;
  private playing = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private index = 0;
  private data: ReplayData | null = null;
  /** Embedder-supplied callback: emit each applied step to the UI. */
  private onStep: (step: ReplayStep) => void = () => {};

  constructor(opts: InitOptions = {}) {
    if (opts.initialSpeed) this.speed = opts.initialSpeed;
  }

  async load(battleId: string): Promise<ReplayData> {
    const res = await fetch(`/api/battles/${battleId}/replay`);
    if (!res.ok) throw new Error(`Failed to load replay (${res.status})`);
    const data = (await res.json()) as ReplayData;
    this.resetTo(data);
    return data;
  }

  private resetTo(data: ReplayData): void {
    this.stop();
    this.data = data;
    this.index = 0;
  }

  get current(): ReplayData | null {
    return this.data;
  }

  get currentIndex(): number {
    return this.index;
  }

  get totalEvents(): number {
    return this.data?.events.length ?? 0;
  }

  get currentTurn(): number {
    return this.peekTurn(this.index);
  }

  get totalTurns(): number {
    if (!this.data) return 0;
    // last event's turn (or metadata result.turns) is the best upper bound
    const evs = this.data.events;
    for (let i = evs.length - 1; i >= 0; i--) {
      const t = readTurn(evs[i]);
      if (typeof t === 'number') return t;
    }
    return 0;
  }

  /** Turn number for the event at the given index, looking back if missing. */
  turnAt(index: number): number {
    return this.peekTurn(index);
  }

  setOnStep(fn: (step: ReplayStep) => void): void {
    this.onStep = fn;
  }

  // ---------------- playback control ----------------

  play(): void {
    if (this.playing || !this.data || this.index >= this.data.events.length) return;
    this.playing = true;
    this.schedule();
  }

  pause(): void {
    this.playing = false;
    this.clearTimer();
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  stop(): void {
    this.pause();
    this.index = 0;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getSpeed(): ReplaySpeed {
    return this.speed;
  }

  setSpeed(s: ReplaySpeed): void {
    this.speed = s;
    if (this.playing) {
      this.clearTimer();
      this.schedule();
    }
  }

  // ---------------- navigation ----------------

  async step(): Promise<ReplayStep> {
    const s = this.advance(1);
    this.onStep(s);
    return s;
  }

  async stepBack(): Promise<ReplayStep> {
    const s = this.advance(-1);
    this.onStep(s);
    return s;
  }

  jumpToEvent(index: number): ReplayStep {
    if (!this.data) return doneStep;
    const clamped = Math.max(0, Math.min(index, this.data.events.length - 1));
    this.index = clamped;
    const s = this.currentStep();
    this.onStep(s);
    return s;
  }

  jumpToTurn(turn: number): ReplayStep {
    if (!this.data) return doneStep;
    const idx = this.findTurnIndex(turn);
    return this.jumpToEvent(idx);
  }

  reset(): void {
    this.stop();
    if (this.data) this.onStep(this.currentStep());
  }

  // ---------------- internals ----------------

  private schedule(): void {
    this.clearTimer();
    // timer tick applies one event, then waits 1/speed seconds
    const intervalMs = 1000 / this.speed;
    this.timer = setInterval(() => {
      if (!this.playing || !this.data) return;
      if (this.index >= this.data.events.length) {
        this.pause();
        return;
      }
      const s = this.advance(1);
      this.onStep(s);
      if (s.done) this.pause();
    }, intervalMs);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private advance(delta: number): ReplayStep {
    if (!this.data) return doneStep;
    this.index = Math.max(0, Math.min(this.index + delta, this.data.events.length));
    return this.currentStep();
  }

  private currentStep(): ReplayStep {
    if (!this.data) return doneStep;
    if (this.index >= this.data.events.length) {
      return {
        index: this.index,
        event: null,
        turn: this.peekTurn(this.index - 1),
        done: true,
      };
    }
    const event = this.data.events[this.index];
    return {
      index: this.index,
      event: event ?? null,
      turn: readTurn(event) ?? this.peekTurn(this.index - 1),
      done: false,
    };
  }

  private peekTurn(index: number): number {
    if (!this.data) return 0;
    if (index < 0) return 0;
    for (let i = index; i >= 0; i--) {
      const t = readTurn(this.data.events[i]);
      if (typeof t === 'number') return t;
    }
    return 0;
  }

  private findTurnIndex(turn: number): number {
    if (!this.data) return 0;
    const evs = this.data.events;
    for (let i = 0; i < evs.length; i++) {
      const t = readTurn(evs[i]);
      if (typeof t === 'number' && t === turn) return i;
    }
    // closest upper bound
    for (let i = 0; i < evs.length; i++) {
      const t = readTurn(evs[i]);
      if (typeof t === 'number' && t > turn) return i;
    }
    return evs.length - 1;
  }

  dispose(): void {
    this.stop();
    this.data = null;
    this.onStep = () => {};
  }
}

function readTurn(event: ReplayEvent | undefined): number | undefined {
  if (!event) return undefined;
  const p = event.payload as { turn?: number; turnNumber?: number } | undefined;
  if (typeof p?.turn === 'number') return p.turn;
  if (typeof p?.turnNumber === 'number') return p.turnNumber;
  return undefined;
}

const doneStep: ReplayStep = { index: 0, event: null, turn: 0, done: true };

export const replayManager = new ReplayManager();
