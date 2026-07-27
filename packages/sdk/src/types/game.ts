import type { ObservationType } from './observation';

export interface GameConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
}

export interface GameAdapter {
  initialize(config: GameConfig): Promise<void>;
  launch(): Promise<void>;
  attachController(adapter: ControllerAdapter): Promise<void>;
  attachObservation(adapter: ObservationAdapter): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  dispose(): Promise<void>;
}

export interface ControllerAdapter {
  sendInput(input: NativeInput): Promise<void>;
  getAvailableInputs(): NativeInputType[];
}

export interface ObservationAdapter {
  capture(): Promise<GameState>;
  getAvailableObservationTypes(): ObservationType[];
}

export interface GameState {
  readonly timestamp: number;
  readonly data: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
}

export type NativeInputType =
  'keyboard' | 'mouse' | 'pointer' | 'touch' | 'gamepad' | 'wheel' | 'pen';

export interface NativeInput {
  readonly type: NativeInputType;
  readonly action: string;
  readonly parameters: Record<string, unknown>;
}
