import { Recording } from './recording';
export declare class Replayer {
    readonly recording: Recording;
    constructor(recording: Recording);
    get currentFrame(): number;
    play(): Promise<void>;
    pause(): Promise<void>;
    stop(): Promise<void>;
    step(): Promise<void>;
    seek(frame: number): Promise<void>;
}
//# sourceMappingURL=replayer.d.ts.map