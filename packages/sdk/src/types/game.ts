import type { ObservationType } from './observation';

// ---------------------------------------------------------------------------
// Bridge contract (GAME_ENGINE.md)
//
// The Engine never talks to a game implementation directly. It communicates
// exclusively through a Bridge, which exposes the same runtime API for every
// platform (HTML, Canvas, Unity, Godot, ...). A Bridge is responsible for
// exactly four things: Lifecycle, Input, Observation, Events.
// ---------------------------------------------------------------------------

export interface BridgeConfig {
  readonly id: string;
  readonly seed?: number;
  readonly agentIds?: string[];
  readonly agentNames?: Record<string, string>;
  [key: string]: unknown;
}

export interface BridgeAction {
  readonly type: string;
  readonly payload: unknown;
}

export interface BridgeObservation {
  readonly timestamp: number;
  readonly data: unknown;
}

export interface BridgeGameState {
  readonly phase: string;
  readonly running: boolean;
}

export interface BridgeCapabilities {
  readonly keyboard: boolean;
  readonly mouse: boolean;
  readonly gamepad: boolean;
  readonly touch: boolean;
  readonly screenshot: boolean;
  readonly structuredState: boolean;
  readonly audio: boolean;
}

export type BridgeEventType =
  | 'ready'
  | 'started'
  | 'paused'
  | 'resumed'
  | 'reset'
  | 'disposed'
  | 'error';

export interface BridgeEvent {
  readonly type: string;
  readonly timestamp: number;
  readonly data?: unknown;
}

export interface GameBridge {
  readonly platform: string;
  readonly capabilities: BridgeCapabilities;

  // Lifecycle
  initialize(config: BridgeConfig): Promise<void>;
  reset(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  dispose(): Promise<void>;

  // Input
  applyActions(playerId: string, actions: BridgeAction[]): Promise<void>;

  // Observation
  observe(playerId: string): Promise<BridgeObservation>;

  // State
  getState(): Promise<BridgeGameState>;

  // Events
  onEvent(handler: (event: BridgeEvent) => void): void;
}

export interface GameConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
}

export interface GameAdapter {
  initialize(config: GameConfig): Promise<void>;
  launch(): Promise<void>;
  attachController(adapter: ControllerAdapter): Promise<void>;
  attachObservation(adapter: ObservationAdapter): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  dispose(): Promise<void>;
}

export interface ControllerAdapter {
  sendInput(input: NativeInput): Promise<void>;
  getAvailableInputs(): NativeInputType[];
}

export interface ObservationAdapter {
  capture(): Promise<GameState>;
  getAvailableObservationTypes(): ObservationType[];
}

export interface GameState {
  readonly timestamp: number;
  readonly data: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
}

export type NativeInputType =
  'keyboard' | 'mouse' | 'pointer' | 'touch' | 'gamepad' | 'wheel' | 'pen';

export interface NativeInput {
  readonly type: NativeInputType;
  readonly action: string;
  readonly parameters: Record<string, unknown>;
}

