import type { Mind } from './mind';
import type { Controller } from './agent';

export interface Player {
  readonly id: string;
  readonly state: Record<string, unknown>;
  readonly controller: Controller;
  readonly mind: Mind;
}
