export type BattlePhase =
  'created' | 'initializing' | 'running' | 'paused' | 'completed' | 'aborted';

export type AgentStrategy = 'aggressive' | 'defensive' | 'scout' | 'custom';

export interface BattleConfig {
  readonly maxAgents: number;
  readonly turnTimeout: number;
  readonly maxTurns: number;
  readonly seed: number;
  readonly gameId?: string;
}

export interface BattleState {
  readonly phase: BattlePhase;
  readonly config: BattleConfig;
  readonly currentTurn: number;
  readonly startedAt?: Date;
  readonly finishedAt?: Date;
}

export interface AgentConfig {
  readonly id: string;
  readonly name: string;
  readonly strategy: AgentStrategy;
  readonly customStrategy?: string;
  readonly profileId?: string;
  readonly provider?: ProviderConfig;
  readonly model?: string;
  readonly apiKey?: string;
  readonly specialCapabilities?: string[];
}

export interface AgentProfile {
  readonly id: string;
  readonly name: string;
  readonly strategy: AgentStrategy;
  readonly backstory?: string;
  readonly provider?: ProviderConfig;
  readonly model?: string;
  readonly apiKey?: string;
}

export interface ProviderConfig {
  readonly type:
    | 'openai'
    | 'ollama'
    | 'lmstudio'
    | 'vllm'
    | 'anthropic'
    | 'google'
    | 'mistral'
    | 'groq'
    | 'openrouter'
    | 'nvidia'
    | 'custom';
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly model: string;
}

export interface MatchConfig {
  readonly maxTurns: number;
  readonly timeout: number;
  readonly seed: number;
}
