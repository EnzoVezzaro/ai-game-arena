export interface ObservationFragment {
  readonly type: string;
  readonly data: unknown;
  readonly timestamp: number;
  readonly agentId: string;
}

export interface SensorCapability {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
}

export interface Sensor {
  readonly name: string;
  capture(): Promise<ObservationFragment>;
  process(fragment: ObservationFragment): Promise<ObservationFragment>;
  produce(fragment: ObservationFragment): Promise<unknown>;
}
