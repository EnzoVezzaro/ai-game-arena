import type { AgentAction } from './agent';
import type { Observation } from './observation';

export interface ArenaConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
}

export interface ArenaPlugin {
  readonly config: ArenaConfig;
  initialize(seed?: number, agentIds?: string[]): WorldState;
  validateAction(action: AgentAction, state: WorldState): ValidationResult;
  executeAction(action: AgentAction, state: WorldState): ActionOutcome;
  getObservation(agentId: string, state: WorldState): Observation;
  checkWinCondition(state: WorldState): WinCondition | null;
  getScores(state: WorldState): Record<string, number>;
  getRenderState(state: WorldState): RenderState;
}

export interface ArenaContainer {
  readonly plugins: string[];
  readonly game: string;
  readonly defaultStrategies: string[];
  readonly mandatoryCapabilities: string[];
  readonly ui: UiElement[];
}

export interface UiElement {
  readonly id: string;
  readonly type: UiElementType;
  readonly component: string;
  readonly label: string;
  readonly position: UiPosition;
}

export type UiElementType =
  | 'panel'
  | 'sidebar'
  | 'event-log'
  | 'chat'
  | 'scoreboard'
  | 'header'
  | 'footer'
  | 'overlay'
  | 'custom';

export type UiPosition = 'center' | 'left' | 'right' | 'bottom' | 'header' | 'footer' | 'overlay';

export interface DisplayConfig {
  readonly arena: ArenaContainer;
}

export interface WorldState {
  readonly turn: number;
  readonly phase: string;
  readonly data: Record<string, unknown>;
  readonly seed?: number;
}

export interface RenderState {
  readonly type: string;
  readonly data: Record<string, unknown>;
}

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: ToolParameter[];
  readonly mandatory: boolean;
}

export interface ToolParameter {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly description: string;
  readonly required: boolean;
  readonly default?: unknown;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly warnings?: string[];
}

export interface ActionOutcome {
  readonly success: boolean;
  readonly events: GameEvent[];
  readonly state?: Record<string, unknown>;
  readonly error?: string;
}

export interface GameEvent {
  readonly type: string;
  readonly timestamp: number;
  readonly data: Record<string, unknown>;
}

export interface WinCondition {
  readonly winner: string;
  readonly reason: string;
}

export type ScoreMap = Record<string, number>;
