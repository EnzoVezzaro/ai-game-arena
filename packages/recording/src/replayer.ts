import { Recording } from './recording';

export class Replayer {
  constructor(public readonly recording: Recording) {}

  get currentFrame(): number {
    return this.recording.entries.length > 0
      ? this.recording.entries[this.recording.entries.length - 1].frame
      : 0;
  }

  async play(): Promise<void> {
    // Replay all entries in order
    for (const entry of this.recording.entries) {
      // Entry would be fed to the platform
    }
  }

  async pause(): Promise<void> {}
  async stop(): Promise<void> {}
  async step(): Promise<void> {}
  async seek(frame: number): Promise<void> {}
}
