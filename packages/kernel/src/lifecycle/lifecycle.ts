import type { Logger } from '@ai-game-arena/sdk';

export type LifecyclePhase = 'created' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error';

export interface LifecycleHook {
  onStart?(): Promise<void>;
  onStop?(): Promise<void>;
  onHealthCheck?(): Promise<HealthStatus>;
}

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

export class LifecycleManager {
  private phase: LifecyclePhase = 'created';
  private hooks: LifecycleHook[] = [];
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  addHook(hook: LifecycleHook): void {
    this.hooks.push(hook);
  }

  getPhase(): LifecyclePhase {
    return this.phase;
  }

  async start(): Promise<void> {
    if (this.phase !== 'created') {
      throw new Error(`Cannot start from phase "${this.phase}"`);
    }

    this.phase = 'starting';
    this.logger.info('Lifecycle: starting');

    try {
      for (const hook of this.hooks) {
        if (hook.onStart) {
          await hook.onStart();
        }
      }
      this.phase = 'running';
      this.logger.info('Lifecycle: running');
    } catch (error) {
      this.phase = 'error';
      this.logger.error('Lifecycle: error during start', undefined, error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.phase !== 'running') {
      this.logger.warn(`Cannot stop from phase "${this.phase}"`);
      return;
    }

    this.phase = 'stopping';
    this.logger.info('Lifecycle: stopping');

    try {
      for (const hook of this.hooks.reverse()) {
        if (hook.onStop) {
          await hook.onStop();
        }
      }
      this.phase = 'stopped';
      this.logger.info('Lifecycle: stopped');
    } catch (error) {
      this.phase = 'error';
      this.logger.error('Lifecycle: error during stop', undefined, error as Error);
      throw error;
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const results: HealthStatus[] = [];

    for (const hook of this.hooks) {
      if (hook.onHealthCheck) {
        results.push(await hook.onHealthCheck());
      }
    }

    const unhealthy = results.filter((r) => !r.healthy);
    return {
      healthy: unhealthy.length === 0,
      message:
        unhealthy.length > 0
          ? `${unhealthy.length} unhealthy components`
          : 'All systems operational',
      details: {
        phase: this.phase,
        components: results.length,
        unhealthy: unhealthy.length,
      },
    };
  }
}
