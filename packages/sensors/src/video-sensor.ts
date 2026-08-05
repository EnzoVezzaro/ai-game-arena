import type { Sensor, ObservationFragment } from './sensor';

export class VideoSensor implements Sensor {
  readonly name = 'video';
  async capture(): Promise<ObservationFragment> {
    return { type: 'video', data: null, timestamp: Date.now(), agentId: '' };
  }
  async process(fragment: ObservationFragment): Promise<ObservationFragment> {
    return fragment;
  }
  async produce(fragment: ObservationFragment): Promise<unknown> {
    return fragment.data;
  }
}
