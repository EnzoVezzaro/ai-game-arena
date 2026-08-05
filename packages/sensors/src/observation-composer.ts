import type { ObservationFragment } from './observation-fragment';

export class ObservationComposer {
  private fragments: ObservationFragment[] = [];

  addFragment(fragment: ObservationFragment): void {
    this.fragments.push(fragment);
  }

  compose(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const fragment of this.fragments) {
      result[fragment.type] = fragment.data;
    }
    return result;
  }

  clear(): void {
    this.fragments = [];
  }
}
