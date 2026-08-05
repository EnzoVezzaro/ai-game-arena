export interface CognitiveState {
  readonly perception: Record<string, unknown>;
  readonly attention: Record<string, unknown>;
  readonly memory: unknown[];
  readonly planning: string[];
  readonly reasoning: string[];
}
