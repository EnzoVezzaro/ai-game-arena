import type { CognitiveModule, CognitiveState, Intent } from '@ai-game-arena/sdk';

export class Mind {
  readonly id: string;
  readonly modules: CognitiveModule[];

  constructor(id: string) {
    this.id = id;
    this.modules = [];
  }

  addModule(module: CognitiveModule): void {
    this.modules.push(module);
  }

  removeModule(name: string): void {
    this.modules = this.modules.filter((m) => m.name !== name);
  }

  async decide(observation: unknown): Promise<Intent> {
    let state: CognitiveState = {
      perception: {},
      attention: {},
      memory: [],
      planning: [],
      reasoning: [],
    };

    for (const module of this.modules) {
      state = await module.process(state);
    }

    return { type: 'idle', parameters: {}, timestamp: Date.now() };
  }
}
