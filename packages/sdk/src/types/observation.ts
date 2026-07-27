export type ObservationType =
  'screenshot' | 'accessibility-tree' | 'dom' | 'board-state' | 'metadata' | 'semantic';

export interface Observation {
  readonly timestamp: number;
  readonly agentId: string;
  readonly type: ObservationType;
  readonly data: ObservationData;
  readonly metadata: ObservationMetadata;
}

export interface ObservationData {
  readonly content: unknown;
  readonly format: string;
}

export interface ObservationMetadata {
  readonly turnNumber: number;
  readonly gameState: string;
  readonly availableActions: string[];
}
