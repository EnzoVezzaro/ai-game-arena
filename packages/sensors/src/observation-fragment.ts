export interface ObservationFragment {
  readonly type: string;
  readonly data: unknown;
  readonly timestamp: number;
  readonly agentId: string;
}
