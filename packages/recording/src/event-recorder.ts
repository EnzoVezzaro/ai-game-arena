import { Recording } from './recording';

export class EventRecorder {
  constructor(public readonly recording: Recording = new Recording()) {}

  push(entry: { frame: number; port: number; event: unknown }): void {
    this.recording.push(entry);
  }
}
