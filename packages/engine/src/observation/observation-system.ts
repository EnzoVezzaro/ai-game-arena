export class ObservationSystem {
  private observations: Map<string, unknown[]> = new Map();

  capture(agentId: string, observation: Record<string, unknown>, availableActions: string[]): void {
    const entry = { observation, availableActions, timestamp: Date.now() };
    const list = this.observations.get(agentId) ?? [];
    list.push(entry);
    this.observations.set(agentId, list);
  }

  getObservations(agentId: string): unknown[] {
    return this.observations.get(agentId) ?? [];
  }

  clear(agentId?: string): void {
    if (agentId) {
      this.observations.delete(agentId);
    } else {
      this.observations.clear();
    }
  }
}
