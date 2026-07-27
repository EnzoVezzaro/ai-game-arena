import type { AgentConfig, AgentAction, Logger, Observation } from '@ai-game-arena/sdk';
import type { Controller } from '@ai-game-arena/sdk';
import type { AgentRuntime } from '@ai-game-arena/agent-runtime';
import type { ObservationFilter } from './observation-filter';
import { createObservationFilter } from './observation-filter';

export interface AgentSandboxOptions {
  logger: Logger;
  controller: Controller;
  runtime: AgentRuntime;
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
    this.controller = options.controller;
    this.runtime = options.runtime;

    this.runtime.initialize(agentConfig);
    this.runtime.connectToController(this.controller);

    this.controller.onAction((action) => {
      this._actions.push(action);
      options.onAction?.(action);
    });

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
