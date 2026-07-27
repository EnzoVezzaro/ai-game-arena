import type { Observation } from './observation';

export interface AgentRuntime {
  initialize(agent: AgentConfig): Promise<void>;
  connectToController(controller: Controller): Promise<void>;
  observe(observation: Observation): Promise<void>;
  decide(): Promise<AgentAction>;
  communicate(message: AgentMessage): Promise<void>;
  getMemory(): AgentMemory;
  shutdown(): Promise<void>;
}

export interface AgentAction {
  readonly agentId: string;
  readonly type: string;
  readonly parameters: Record<string, unknown>;
  readonly timestamp: number;
}

export interface AgentMessage {
  readonly from: string;
  readonly to: string | 'all' | 'spectators';
  readonly content: string;
  readonly timestamp: number;
}

export interface AgentMemory {
  readonly shortTerm: MemoryEntry[];
  readonly longTerm: MemoryEntry[];
  readonly social: MemoryEntry[];
  readonly strategic: MemoryEntry[];
}

export interface MemoryEntry {
  readonly id: string;
  readonly content: string;
  readonly timestamp: number;
  readonly importance: number;
  readonly tags: string[];
}

export interface AgentSession {
  readonly agentId: string;
  readonly battleId: string;
  readonly joinedAt: Date;
  readonly leftAt?: Date;
}

// Import the types we need
import type { AgentConfig } from './battle';

// Forward declare Controller to avoid circular deps
export interface Controller {
  readonly id: string;
  readonly name: string;
  initialize(): Promise<void>;
  getCapabilities(): Capability[];
  execute(action: ControllerAction): Promise<ActionResult>;
  shutdown(): Promise<void>;
}

export interface ControllerAction {
  readonly agentId: string;
  readonly device: string;
  readonly action: string;
  readonly parameters: Record<string, unknown>;
}

export interface ActionResult {
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
}

export interface Capability {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, ParameterDefinition>;
  readonly mandatory: boolean;
}

export interface ParameterDefinition {
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly description: string;
  readonly required: boolean;
  readonly default?: unknown;
}
