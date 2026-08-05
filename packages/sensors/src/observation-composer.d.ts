import type { ObservationFragment } from './observation-fragment';
export declare class ObservationComposer {
    private fragments;
    addFragment(fragment: ObservationFragment): void;
    compose(): Record<string, unknown>;
    clear(): void;
}
//# sourceMappingURL=observation-composer.d.ts.map