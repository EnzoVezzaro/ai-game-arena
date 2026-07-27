import type { Observation as ObservationType } from '@ai-game-arena/sdk';

export class ObservationSystem {
  private observationHistory: ObservationType[] = [];

  capture(
    agentId: string,
    gameState: Record<string, unknown>,
    availableActions: string[],
  ): ObservationType {
    const observation: ObservationType = {
      timestamp: Date.now(),
      agentId,
      type: 'board-state',
      data: {
        content: gameState,
        format: 'json',
      },
      metadata: {
        turnNumber: (gameState.turn as number) ?? 0,
        gameState: (gameState.phase as string) ?? 'unknown',
        availableActions,
      },
    };

    this.observationHistory.push(observation);
    return observation;
  }

  captureSemantic(agentId: string, semanticData: string, turnNumber: number): ObservationType {
    const observation: ObservationType = {
      timestamp: Date.now(),
      agentId,
      type: 'semantic',
      data: {
        content: semanticData,
        format: 'text',
      },
      metadata: {
        turnNumber,
        gameState: 'running',
        availableActions: [],
      },
    };

    this.observationHistory.push(observation);
    return observation;
  }

  getObservationHistory(): ObservationType[] {
    return [...this.observationHistory];
  }

  clearHistory(): void {
    this.observationHistory = [];
  }
}
