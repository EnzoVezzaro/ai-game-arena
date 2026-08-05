import type { Sensor, ObservationFragment } from './sensor';
export declare class AudioSensor implements Sensor {
    readonly name = "audio";
    capture(): Promise<ObservationFragment>;
    process(fragment: ObservationFragment): Promise<ObservationFragment>;
    produce(fragment: ObservationFragment): Promise<unknown>;
}
//# sourceMappingURL=audio-sensor.d.ts.map