import type { CognitiveModule, Intent } from '@ai-game-arena/sdk';
export declare class Mind {
    readonly id: string;
    readonly modules: CognitiveModule[];
    constructor(id: string);
    addModule(module: CognitiveModule): void;
    removeModule(name: string): void;
    decide(observation: unknown): Promise<Intent>;
}
//# sourceMappingURL=mind.d.ts.map