import { Recording } from './recording';
export declare class EventRecorder {
    readonly recording: Recording;
    constructor(recording?: Recording);
    push(entry: {
        frame: number;
        port: number;
        event: unknown;
    }): void;
}
//# sourceMappingURL=event-recorder.d.ts.map