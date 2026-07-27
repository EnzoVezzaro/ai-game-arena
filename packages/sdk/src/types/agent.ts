import type { Observation } from './observation';
import type { AgentConfig } from './battle';

export interface AgentRuntime {
  initialize(agent: AgentConfig): Promise<void>;
  connectToController(controller: Controller): Promise<void>;
  observe(observation: Observation): Promise<void>;
  decide(): Promise<AgentAction>;
  communicate(message: AgentMessage, to?: string): Promise<void>;
  getMemory(): AgentMemory;
  getLastObservation(): Observation | null;
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

export interface InputAction {
  readonly device: string;
  readonly action: string;
  readonly parameters: Record<string, unknown>;
  readonly timestamp: number;
}

export interface Controller {
  readonly id: string;
  readonly name: string;
  registerTool(
    name: string,
    description: string,
    inputSchema: Record<string, unknown>,
    handler: (args: Record<string, unknown>) => Promise<unknown>,
  ): void;
  onAction(callback: (action: InputAction) => void): void;
  getMcpServer(): unknown;
  getCapabilities(): Capability[];
  getInputHistory(): InputAction[];
  clearHistory(): void;
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
