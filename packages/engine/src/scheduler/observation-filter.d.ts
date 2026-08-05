import type { Observation } from '@ai-game-arena/sdk';
export type VisibilityMode = 'perfect' | 'filtered' | 'private';
export interface ObservationFilterConfig {
    visibility: VisibilityMode;
    filterFn?: (observation: Observation, agentId: string) => Observation;
}
export declare function createObservationFilter(config: ObservationFilterConfig): {
    filter(observation: Observation, agentId: string): Observation;
    getVisibility(): VisibilityMode;
};
export type ObservationFilter = ReturnType<typeof createObservationFilter>;
//# sourceMappingURL=observation-filter.d.ts.map