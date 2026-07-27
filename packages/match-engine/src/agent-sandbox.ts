import type { AgentConfig, AgentAction, Logger, Observation } from '@ai-game-arena/sdk';
import { Controller } from '@ai-game-arena/controller';
import { AgentRuntime } from '@ai-game-arena/agent-runtime';
import type { ObservationFilter } from './observation-filter';
import { createObservationFilter } from './observation-filter';

export interface AgentSandboxOptions {
  logger: Logger;
  visibility?: 'perfect' | 'filtered' | 'private';
  filterFn?: (observation: Observation, agentId: string) => Observation;
  onAction?: (action: { device: string; action: string; parameters: Record<string, unknown>; timestamp: number }) => void;
}

export class AgentSandbox {
  readonly agentId: string;
  readonly agentName: string;
  private controller: Controller;
  private runtime: AgentRuntime;
  private filter: ObservationFilter;
  private logger: Logger;
  private _actions: Array<{ device: string; action: string; parameters: Record<string, unknown>; timestamp: number }> = [];

  constructor(agentConfig: AgentConfig, options: AgentSandboxOptions) {
    this.agentId = agentConfig.id;
    this.agentName = agentConfig.name;
    this.logger = options.logger;

    // Each agent gets its own isolated controller (private input history)
    this.controller = new Controller({
      id: `controller-${agentConfig.id}`,
      name: `Controller for ${agentConfig.name}`,
    });

    // Wire action callback to capture actions for the match engine
    this.controller.onAction((action) => {
      this._actions.push(action);
      options.onAction?.(action);
    });

    // Each agent gets its own isolated runtime (private memory)
    this.runtime = new AgentRuntime({ logger: options.logger.child({ component: 'agent-runtime', agentId: agentConfig.id }) });
    this.runtime.initialize(agentConfig);

    // Connect runtime to its private controller via MCP
    this.runtime.connectToController(this.controller);

    // Observation filter controls what this agent can see
    this.filter = createObservationFilter({
      visibility: options.visibility ?? 'perfect',
      filterFn: options.filterFn,
    });

    this.logger.info(`Agent sandbox created: ${agentConfig.name}`, {
      component: 'agent-sandbox',
      agentId: agentConfig.id,
    });
  }

  async receiveObservation(observation: Observation): Promise<void> {
    const filtered = this.filter.filter(observation, this.agentId);
    await this.runtime.observe(filtered);
  }

  async decide(): Promise<AgentAction> {
    return this.runtime.decide();
  }

  getActions(): Array<{ device: string; action: string; parameters: Record<string, unknown>; timestamp: number }> {
    return [...this._actions];
  }

  getLastObservation(): Observation | null {
    return this.runtime.getLastObservation();
  }

  getController(): Controller {
    return this.controller;
  }

  getRuntime(): AgentRuntime {
    return this.runtime;
  }

  async shutdown(): Promise<void> {
    await this.runtime.shutdown();
    this._actions = [];
    this.logger.info(`Agent sandbox shut down: ${this.agentName}`, {
      component: 'agent-sandbox',
      agentId: this.agentId,
    });
  }
}
