import type { ObservationFragment } from '@ai-game-arena/sdk';
export interface Sensor {
    readonly name: string;
    capture(): Promise<ObservationFragment>;
    process(fragment: ObservationFragment): Promise<ObservationFragment>;
    produce(fragment: ObservationFragment): Promise<unknown>;
}
//# sourceMappingURL=sensor.d.ts.map