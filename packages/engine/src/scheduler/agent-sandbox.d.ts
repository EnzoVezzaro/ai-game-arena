import type { AgentConfig, AgentAction, Logger, Observation } from '@ai-game-arena/sdk';
import type { Controller } from '@ai-game-arena/sdk';
import type { AgentRuntime } from '@ai-game-arena/ai-runtime';
export interface AgentSandboxOptions {
    logger: Logger;
    controller: Controller;
    runtime: AgentRuntime;
    visibility?: 'perfect' | 'filtered' | 'private';
    filterFn?: (observation: Observation, agentId: string) => Observation;
    onAction?: (action: {
        device: string;
        action: string;
        parameters: Record<string, unknown>;
        timestamp: number;
    }) => void;
}
export declare class AgentSandbox {
    readonly agentId: string;
    readonly agentName: string;
    private controller;
    private runtime;
    private filter;
    private logger;
    private _actions;
    constructor(agentConfig: AgentConfig, options: AgentSandboxOptions);
    receiveObservation(observation: Observation): Promise<void>;
    decide(): Promise<AgentAction>;
    getActions(): Array<{
        device: string;
        action: string;
        parameters: Record<string, unknown>;
        timestamp: number;
    }>;
    getLastObservation(): Observation | null;
    getController(): Controller;
    getRuntime(): AgentRuntime;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=agent-sandbox.d.ts.map