import type { Sensor, ObservationFragment } from './sensor';
export declare class VideoSensor implements Sensor {
    readonly name = "video";
    capture(): Promise<ObservationFragment>;
    process(fragment: ObservationFragment): Promise<ObservationFragment>;
    produce(fragment: ObservationFragment): Promise<unknown>;
}
//# sourceMappingURL=video-sensor.d.ts.map