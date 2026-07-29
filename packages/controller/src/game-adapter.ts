import type { Controller } from '@ai-game-arena/sdk';
import type { AgentAction, InputAction, WorldState } from '@ai-game-arena/sdk';

export interface GameAdapter {
  onTurnStart(agentId: string, worldState: WorldState): void;
  registerTools(controller: Controller): void;
  processInput(action: InputAction): void;
  extractAction(): AgentAction | null;
}
