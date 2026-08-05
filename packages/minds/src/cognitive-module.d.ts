import type { CognitiveState } from '@ai-game-arena/sdk';
export interface CognitiveModule {
    readonly name: string;
    process(state: CognitiveState): Promise<CognitiveState>;
}
//# sourceMappingURL=cognitive-module.d.ts.map