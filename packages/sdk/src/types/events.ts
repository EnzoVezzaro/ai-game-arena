import type { Subscription } from './plugin';

export type DomainEvent =
  | BattleCreated
  | BattleStarted
  | BattleFinished
  | BattleAborted
  | BattlePaused
  | BattleResumed
  | AgentJoinedBattle
  | AgentLeftBattle
  | TurnStarted
  | TurnFinished
  | ObservationCaptured
  | ToolRequested
  | ToolExecuted
  | ActionExecuted
  | ActionRejected
  | MessageSent
  | MessageReceived
  | StateChanged
  | ScoreUpdated
  | WinConditionMet
  | PluginActivated
  | PluginDeactivated
  | ThinkingStarted
  | ThinkingFinished
  | ToolCalled
  | AgentError;

export interface EventMetadata {
  readonly correlationId: string;
  readonly causationId?: string;
  readonly version: number;
}

export interface BattleCreated {
  readonly type: 'BattleCreated';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly config: Record<string, unknown> };
  readonly metadata: EventMetadata;
}

export interface BattleStarted {
  readonly type: 'BattleStarted';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: Record<string, never>;
  readonly metadata: EventMetadata;
}

export interface BattleFinished {
  readonly type: 'BattleFinished';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: {
    readonly winner?: string;
    readonly reason: string;
    readonly scores?: Record<string, number>;
  };
  readonly metadata: EventMetadata;
}

export interface BattleAborted {
  readonly type: 'BattleAborted';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly reason: string };
  readonly metadata: EventMetadata;
}

export interface BattlePaused {
  readonly type: 'BattlePaused';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly reason: string; readonly errors: ReadonlyArray<{ readonly agentId: string; readonly error: string }> };
  readonly metadata: EventMetadata;
}

export interface BattleResumed {
  readonly type: 'BattleResumed';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: Record<string, never>;
  readonly metadata: EventMetadata;
}

export interface AgentJoinedBattle {
  readonly type: 'AgentJoinedBattle';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly agentId: string; readonly name: string };
  readonly metadata: EventMetadata;
}

export interface AgentLeftBattle {
  readonly type: 'AgentLeftBattle';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly agentId: string; readonly reason: string };
  readonly metadata: EventMetadata;
}

export interface TurnStarted {
  readonly type: 'TurnStarted';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly turnNumber: number };
  readonly metadata: EventMetadata;
}

export interface TurnFinished {
  readonly type: 'TurnFinished';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly turnNumber: number; readonly duration: number };
  readonly metadata: EventMetadata;
}

export interface ObservationCaptured {
  readonly type: 'ObservationCaptured';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly agentId: string; readonly observationType: string };
  readonly metadata: EventMetadata;
}

export interface ToolRequested {
  readonly type: 'ToolRequested';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: {
    readonly agentId: string;
    readonly toolName: string;
    readonly parameters: Record<string, unknown>;
  };
  readonly metadata: EventMetadata;
}

export interface ToolExecuted {
  readonly type: 'ToolExecuted';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: {
    readonly agentId: string;
    readonly toolName: string;
    readonly success: boolean;
    readonly duration: number;
  };
  readonly metadata: EventMetadata;
}

export interface ActionExecuted {
  readonly type: 'ActionExecuted';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: {
    readonly agentId: string;
    readonly action: Record<string, unknown>;
    readonly success: boolean;
  };
  readonly metadata: EventMetadata;
}

export interface ActionRejected {
  readonly type: 'ActionRejected';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: {
    readonly agentId: string;
    readonly action: Record<string, unknown>;
    readonly reason: string;
  };
  readonly metadata: EventMetadata;
}

export interface MessageSent {
  readonly type: 'MessageSent';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly from: string; readonly to: string; readonly content: string };
  readonly metadata: EventMetadata;
}

export interface MessageReceived {
  readonly type: 'MessageReceived';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly from: string; readonly to: string; readonly content: string };
  readonly metadata: EventMetadata;
}

export interface StateChanged {
  readonly type: 'StateChanged';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: {
    readonly field: string;
    readonly oldValue: unknown;
    readonly newValue: unknown;
  };
  readonly metadata: EventMetadata;
}

export interface ScoreUpdated {
  readonly type: 'ScoreUpdated';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly agentId: string; readonly score: number; readonly delta: number };
  readonly metadata: EventMetadata;
}

export interface WinConditionMet {
  readonly type: 'WinConditionMet';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly winner: string; readonly reason: string };
  readonly metadata: EventMetadata;
}

export interface PluginActivated {
  readonly type: 'PluginActivated';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly pluginId: string };
  readonly metadata: EventMetadata;
}

export interface PluginDeactivated {
  readonly type: 'PluginDeactivated';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly pluginId: string };
  readonly metadata: EventMetadata;
}

export interface ThinkingStarted {
  readonly type: 'ThinkingStarted';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly agentId: string; readonly turnNumber: number };
  readonly metadata: EventMetadata;
}

export interface ThinkingFinished {
  readonly type: 'ThinkingFinished';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly agentId: string; readonly turnNumber: number; readonly actionType: string };
  readonly metadata: EventMetadata;
}

export interface ToolCalled {
  readonly type: 'ToolCalled';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly agentId: string; readonly tool: string; readonly parameters: Record<string, unknown> };
  readonly metadata: EventMetadata;
}

export interface AgentError {
  readonly type: 'AgentError';
  readonly aggregateId: string;
  readonly timestamp: Date;
  readonly payload: { readonly agentId: string; readonly turnNumber: number; readonly error: string };
  readonly metadata: EventMetadata;
}

export interface EventHandler<T extends DomainEvent = DomainEvent> {
  (event: T): Promise<void>;
}

export interface EventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(eventType: T['type'], handler: EventHandler<T>): Subscription;
  subscribeAll(handlers: Array<{ eventType: string; handler: EventHandler }>): void;
  unsubscribe(subscription: Subscription): void;
}
