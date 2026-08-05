export interface Intent {
    readonly type: string;
    readonly parameters: Record<string, unknown>;
    readonly timestamp: number;
}
export interface CognitiveState {
    readonly perception: Record<string, unknown>;
    readonly attention: Record<string, unknown>;
    readonly memory: unknown[];
    readonly planning: string[];
    readonly reasoning: string[];
}
export interface CognitiveModule {
    readonly name: string;
    process(state: CognitiveState): Promise<CognitiveState>;
}
export interface Mind {
    readonly id: string;
    readonly modules: CognitiveModule[];
    decide(observation: unknown): Promise<Intent>;
    addModule(module: CognitiveModule): void;
    removeModule(name: string): void;
}
//# sourceMappingURL=mind.d.ts.map