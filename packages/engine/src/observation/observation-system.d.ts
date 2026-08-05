export declare class ObservationSystem {
    private observations;
    capture(agentId: string, observation: Record<string, unknown>, availableActions: string[]): void;
    getObservations(agentId: string): unknown[];
    clear(agentId?: string): void;
}
//# sourceMappingURL=observation-system.d.ts.map