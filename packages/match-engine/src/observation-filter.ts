import type { Observation } from '@ai-game-arena/sdk';

export type VisibilityMode = 'perfect' | 'filtered' | 'private';

export interface ObservationFilterConfig {
  visibility: VisibilityMode;
  filterFn?: (observation: Observation, agentId: string) => Observation;
}

export function createObservationFilter(config: ObservationFilterConfig) {
  return {
    filter(observation: Observation, agentId: string): Observation {
      if (config.visibility === 'perfect') {
        return observation;
      }

      if (config.visibility === 'private') {
        return {
          ...observation,
          data: {
            content: `[redacted - only visible to ${observation.agentId}]`,
            format: 'text',
          },
        };
      }

      if (config.filterFn) {
        return config.filterFn(observation, agentId);
      }

      return observation;
    },

    getVisibility(): VisibilityMode {
      return config.visibility;
    },
  };
}

export type ObservationFilter = ReturnType<typeof createObservationFilter>;
