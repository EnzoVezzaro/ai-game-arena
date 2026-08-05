import type { Mind } from '@ai-game-arena/sdk';
import type { Controller } from '@ai-game-arena/sdk';

export interface Player {
  readonly id: string;
  readonly state: Record<string, unknown>;
  readonly controller: Controller;
  readonly mind: Mind;
}

export function createPlayer(id: string, mind: Mind, controller: Controller): Player {
  return { id, state: {}, controller, mind };
}
