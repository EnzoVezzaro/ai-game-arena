import type { Sensor, ObservationFragment } from './sensor';

export class AudioSensor implements Sensor {
  readonly name = 'audio';
  async capture(): Promise<ObservationFragment> {
    return { type: 'audio', data: null, timestamp: Date.now(), agentId: '' };
  }
  async process(fragment: ObservationFragment): Promise<ObservationFragment> {
    return fragment;
  }
  async produce(fragment: ObservationFragment): Promise<unknown> {
    return fragment.data;
  }
}
