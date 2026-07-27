# Replay System

> Recording, playback, determinism verification, and analysis of battles.

---

## Overview

The Replay System captures complete battle state for:

- **Deterministic replay** — Exact reproduction of any battle
- **Analysis** — Post-match review, debugging, learning
- **Spectator mode** — Live or delayed viewing
- **Benchmarking** — Consistent evaluation across runs
- **Training data** — RL/imitation learning datasets

---

## Replay Recording

### What Gets Recorded

```
Replay = {
  metadata: { battleId, seed, config, agents, startedAt, finishedAt }
  initialState: WorldState
  events: DomainEvent[]           // Complete event stream
  observations: Observation[]     // Per-agent observations (optional)
  actions: AgentAction[]          // Per-agent actions
  metrics: BattleMetrics          // Performance data
}
```

### Recording Process

```typescript
// packages/runtime/src/replay/recorder.ts
export class ReplayRecorder {
  private events: DomainEvent[] = [];
  private observations: Map<AgentId, Observation[]> = new Map();
  private actions: Map<AgentId, AgentAction[]> = new Map();
  private initialState: WorldState;
  private metadata: ReplayMetadata;

  constructor(
    private battleId: BattleId,
    config: BattleConfig,
    initialState: WorldState
  ) {
    this.initialState = initialState;
    this.metadata = {
      battleId,
      seed: config.match.seed || Date.now(),
      config,
      startedAt: new Date(),
    };
  }

  recordEvent(event: DomainEvent): void {
    this.events.push(event);
  }

  recordObservation(agentId: AgentId, observation: Observation): void {
    if (!this.observations.has(agentId)) this.observations.set(agentId, []);
    this.observations.get(agentId)!.push(observation);
  }

  recordAction(agentId: AgentId, action: AgentAction): void {
    if (!this.actions.has(agentId)) this.actions.set(agentId, []);
    this.actions.get(agentId)!.push(action);
  }

  finalize(result: BattleResult): Replay {
    this.metadata.finishedAt = new Date();
    this.metadata.result = result;

    return {
      id: this.battleId,
      metadata: this.metadata,
      initialState: this.initialState,
      events: this.events,
      observations: Object.fromEntries(this.observations),
      actions: Object.fromEntries(this.actions),
      checksum: this.computeChecksum(),
    };
  }

  private computeChecksum(): string {
    // SHA256 of all events for integrity verification
    const data = JSON.stringify(this.events);
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
```

### Event Store Schema

```sql
-- packages/storage/src/schema/replay.sql
CREATE TABLE replays (
  id TEXT PRIMARY KEY,
  battle_id TEXT NOT NULL,
  seed INTEGER NOT NULL,
  config TEXT NOT NULL,           -- JSON
  initial_state TEXT NOT NULL,    -- JSON
  events TEXT NOT NULL,           -- JSON array
  observations TEXT,              -- JSON
  actions TEXT,                   -- JSON
  metadata TEXT NOT NULL,         -- JSON
  checksum TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  verified_at INTEGER,
  deterministic BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_replays_battle ON replays(battle_id);
CREATE INDEX idx_replays_created ON replays(created_at);
```

---

## Replay Playback

### Playback Modes

```typescript
// packages/sdk/src/types/replay.ts
export type ReplayMode = 
  | 'full'           // Step through every event
  | 'turns'          // Jump between turns
  | 'highlights'     // Only significant events (actions, wins, etc.)
  | 'agent-pov'      // Single agent's perspective
  | 'timeline';      // Time-scrubbing UI

export interface ReplaySession {
  readonly replay: Replay;
  readonly currentIndex: number;
  readonly currentTurn: number;
  readonly totalEvents: number;
  readonly totalTurns: number;
  
  // Navigation
  step(): Promise<ReplayStep>;
  stepBack(): Promise<ReplayStep>;
  jumpToTurn(turn: number): Promise<ReplayStep>;
  jumpToEvent(index: number): Promise<ReplayStep>;
  jumpToTimestamp(ts: number): Promise<ReplayStep>;
  
  // State inspection
  getWorldStateAt(turn: number): WorldState;
  getAgentStateAt(agentId: AgentId, turn: number): AgentState;
  getObservationAt(agentId: AgentId, turn: number): Observation;
  
  // Playback control
  setSpeed(speed: number): void;  // 0.5x, 1x, 2x, 5x, 10x
  pause(): void;
  resume(): void;
  
  // Export
  export(format: 'json' | 'csv' | 'video'): Promise<Blob>;
}
```

### Playback Engine

```typescript
// packages/runtime/src/replay/player.ts
export class ReplayPlayer {
  private replay: Replay;
  private currentIndex = 0;
  private currentState: WorldState;
  private speed = 1;
  private playing = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(replay: Replay) {
    this.replay = replay;
    this.currentState = this.cloneState(replay.initialState);
  }

  async step(): Promise<ReplayStep> {
    if (this.currentIndex >= this.replay.events.length) {
      return { done: true, state: this.currentState };
    }

    const event = this.replay.events[this.currentIndex];
    this.applyEvent(event);
    this.currentIndex++;

    return {
      done: false,
      event,
      state: this.currentState,
      turn: this.getCurrentTurn(),
      progress: this.currentIndex / this.replay.events.length,
    };
  }

  async jumpToTurn(turn: number): Promise<ReplayStep> {
    // Fast-forward by applying events until target turn
    const targetIndex = this.findTurnIndex(turn);
    
    for (let i = this.currentIndex; i < targetIndex; i++) {
      this.applyEvent(this.replay.events[i]);
    }
    
    this.currentIndex = targetIndex;
    return this.getCurrentStep();
  }

  private applyEvent(event: DomainEvent): void {
    switch (event.type) {
      case 'ActionExecuted':
        this.currentState = this.arena.executeAction(event.payload.action, this.currentState).newState;
        break;
      case 'StateChanged':
        for (const change of event.payload.changes) {
          this.applyStateChange(change);
        }
        break;
      case 'TurnAdvanced':
        this.currentState.turn = event.payload.turn;
        break;
      // ... other events
    }
  }

  private findTurnIndex(turn: number): number {
    // Binary search on turn events
    let low = 0, high = this.replay.events.length - 1;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const event = this.replay.events[mid];
      const eventTurn = this.getEventTurn(event);
      
      if (eventTurn < turn) low = mid + 1;
      else if (eventTurn > turn) high = mid - 1;
      else return mid;
    }
    
    return low;
  }
}
```

---

## Determinism Verification

### Verification Process

```typescript
// packages/runtime/src/replay/verifier.ts
export class DeterminismVerifier {
  async verify(battleId: BattleId): Promise<DeterminismReport> {
    const original = await this.replayManager.getReplay(battleId);
    if (!original) throw new Error('Replay not found');

    // Replay with same seed
    const replayed = await this.replayBattle(original.metadata);

    // Compare event streams
    const comparison = this.compareEventStreams(original.events, replayed.events);
    
    // Compare final state
    const stateMatch = this.compareStates(original.finalState, replayed.finalState);

    return {
      battleId,
      deterministic: comparison.identical && stateMatch,
      eventComparison: comparison,
      stateMatch,
      verifiedAt: new Date(),
      seed: original.metadata.seed,
    };
  }

  private async replayBattle(metadata: ReplayMetadata): Promise<Replay> {
    // Create new battle with same config and seed
    const battle = await this.battleOrchestrator.createBattle({
      ...metadata.config,
      match: { ...metadata.config.match, seed: metadata.seed },
    });
    
    await battle.start();
    return battle.replay;
  }

  private compareEventStreams(original: DomainEvent[], replayed: DomainEvent[]): EventComparison {
    if (original.length !== replayed.length) {
      return { identical: false, lengthMismatch: true, originalLength: original.length, replayedLength: replayed.length };
    }

    const differences: EventDifference[] = [];
    
    for (let i = 0; i < original.length; i++) {
      const diff = this.compareEvents(original[i], replayed[i]);
      if (diff) differences.push({ index: i, ...diff });
    }

    return {
      identical: differences.length === 0,
      differences,
      totalEvents: original.length,
    };
  }
}

export interface DeterminismReport {
  readonly battleId: BattleId;
  readonly deterministic: boolean;
  readonly eventComparison: EventComparison;
  readonly stateMatch: boolean;
  readonly verifiedAt: Date;
  readonly seed: number;
}

export interface EventComparison {
  readonly identical: boolean;
  readonly lengthMismatch?: boolean;
  readonly originalLength?: number;
  readonly replayedLength?: number;
  readonly differences: EventDifference[];
  readonly totalEvents: number;
}

export interface EventDifference {
  readonly index: number;
  readonly type: 'field' | 'missing' | 'extra' | 'order';
  readonly field?: string;
  readonly original?: unknown;
  readonly replayed?: unknown;
}
```

### Common Non-Determinism Sources

| Source | Prevention |
|--------|------------|
| `Math.random()` | Use seeded RNG everywhere |
| `Date.now()` | Use game tick time |
| `Set/Map` iteration order | Use arrays or sorted structures |
| Floating point differences | Use fixed-point or deterministic libraries |
| Async timing | Avoid `await` in deterministic paths |
| External API calls | Mock in deterministic mode |
| Unordered object keys | Use `Object.keys().sort()` |

---

## Replay Analysis

### Analysis Tools

```typescript
// packages/runtime/src/replay/analyzer.ts
export class ReplayAnalyzer {
  analyze(replay: Replay): ReplayAnalysis {
    return {
      summary: this.generateSummary(replay),
      agentPerformance: this.analyzeAgents(replay),
      actionAnalysis: this.analyzeActions(replay),
      strategyAnalysis: this.analyzeStrategies(replay),
      timeline: this.buildTimeline(replay),
      anomalies: this.detectAnomalies(replay),
    };
  }

  private generateSummary(replay: Replay): BattleSummary {
    return {
      battleId: replay.id,
      duration: replay.metadata.finishedAt!.getTime() - replay.metadata.startedAt.getTime(),
      turns: replay.metadata.result?.turns || 0,
      winner: replay.metadata.result?.winner,
      winReason: replay.metadata.result?.reason,
      agents: replay.metadata.config.agents.map(a => ({ id: a.id, name: a.name })),
      seed: replay.metadata.seed,
    };
  }

  private analyzeAgents(replay: Replay): AgentAnalysis[] {
    return replay.metadata.config.agents.map(agentConfig => {
      const actions = replay.actions[agentConfig.id] || [];
      const observations = replay.observations[agentConfig.id] || [];
      
      return {
        agentId: agentConfig.id,
        name: agentConfig.name,
        strategy: agentConfig.strategy,
        totalActions: actions.length,
        actionTypes: this.countActionTypes(actions),
        avgActionTime: this.avgActionTime(actions),
        timeouts: actions.filter(a => a.timeout).length,
        errors: actions.filter(a => a.error).length,
        tokensUsed: this.estimateTokens(observations, actions),
        estimatedCost: this.estimateCost(observations, actions),
      };
    });
  }

  private analyzeActions(replay: Replay): ActionAnalysis {
    const allActions = Object.values(replay.actions).flat();
    
    return {
      total: allActions.length,
      byType: this.countActionTypes(allActions),
      successRate: allActions.filter(a => a.success).length / allActions.length,
      avgLatency: this.avgLatency(allActions),
      toolUsage: this.countToolUsage(allActions),
      patterns: this.detectPatterns(allActions),
    };
  }

  private detectAnomalies(replay: Replay): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Check for impossible actions
    for (const [agentId, actions] of Object.entries(replay.actions)) {
      for (let i = 0; i < actions.length; i++) {
        if (actions[i].timestamp < (actions[i-1]?.timestamp || 0)) {
          anomalies.push({ type: 'time-travel', agentId, turn: i, details: 'Action timestamp before previous' });
        }
      }
    }
    
    // Check for missing observations
    for (const [agentId, observations] of Object.entries(replay.observations)) {
      if (observations.length === 0) {
        anomalies.push({ type: 'no-observations', agentId });
      }
    }
    
    return anomalies;
  }
}
```

---

## Export Formats

```typescript
// packages/runtime/src/replay/exporters.ts
export interface ReplayExporter {
  export(replay: Replay, options: ExportOptions): Promise<Blob>;
}

export class JSONExporter implements ReplayExporter {
  async export(replay: Replay): Promise<Blob> {
    return new Blob([JSON.stringify(replay, null, 2)], { type: 'application/json' });
  }
}

export class CSVExporter implements ReplayExporter {
  async export(replay: Replay, options: ExportOptions): Promise<Blob> {
    const rows = replay.events.map((event, i) => ({
      index: i,
      type: event.type,
      timestamp: event.timestamp.toISOString(),
      aggregateId: event.aggregateId,
      payload: JSON.stringify(event.payload),
    }));
    
    const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
    return new Blob([csv], { type: 'text/csv' });
  }
}

export class VideoExporter implements ReplayExporter {
  async export(replay: Replay, options: ExportOptions): Promise<Blob> {
    // Render frames and encode to video
    // Uses WebCodecs API or ffmpeg.wasm
    const frames = await this.renderFrames(replay, options);
    return this.encodeVideo(frames, options);
  }
}
```

---

## Spectator Mode

```typescript
// packages/runtime/src/replay/spectator.ts
export class SpectatorManager {
  private spectators = new Map<BattleId, SpectatorSession[]>();

  async joinBattle(spectatorId: string, battleId: BattleId, mode: SpectatorMode): Promise<SpectatorSession> {
    const battle = await this.battleManager.getBattle(battleId);
    
    const session: SpectatorSession = {
      id: crypto.randomUUID(),
      spectatorId,
      battleId,
      mode,
      joinedAt: new Date(),
      currentTurn: battle.turn,
      lastEventIndex: battle.replay.events.length,
    };

    if (!this.spectators.has(battleId)) this.spectators.set(battleId, []);
    this.spectators.get(battleId)!.push(session);

    // Send current state
    await this.sendState(session, battle);

    return session;
  }

  async broadcastEvent(battleId: BattleId, event: DomainEvent): Promise<void> {
    const spectators = this.spectators.get(battleId) || [];
    
    for (const session of spectators) {
      if (session.mode === 'live') {
        await this.sendEvent(session, event);
      }
    }
  }

  async leaveBattle(sessionId: string): Promise<void> {
    for (const [battleId, sessions] of this.spectators) {
      const idx = sessions.findIndex(s => s.id === sessionId);
      if (idx >= 0) sessions.splice(idx, 1);
    }
  }
}

export type SpectatorMode = 'live' | 'delayed' | 'replay';
```