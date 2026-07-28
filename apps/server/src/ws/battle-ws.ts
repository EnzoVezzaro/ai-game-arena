import type { EventBus, DomainEvent } from '@ai-game-arena/sdk';

interface WsClient {
  send(data: string): void;
  readyState: number;
}

interface WebSocketClient {
  id: string;
  ws: WsClient;
  battleId?: string;
}

export class BattleWebSocketServer {
  private clients = new Map<string, WebSocketClient>();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
    const battleEventTypes = [
      'BattleCreated',
      'BattleStarted',
      'BattleFinished',
      'BattleAborted',
      'TurnStarted',
      'TurnFinished',
      'ActionExecuted',
      'ActionRejected',
      'ObservationCaptured',
      'WinConditionMet',
      'ScoreUpdated',
    ] as const;

    for (const eventType of battleEventTypes) {
      this.eventBus.subscribe(eventType, async (event: DomainEvent) => {
        this.forwardEvent(event);
      });
    }
  }

  private forwardEvent(event: DomainEvent): void {
    const message = JSON.stringify({
      type: 'event',
      eventType: event.type,
      payload: event.payload,
      timestamp: event.timestamp,
      aggregateId: event.aggregateId,
    });

    const deadClients: string[] = [];

    for (const [id, client] of this.clients) {
      try {
        if (client.ws.readyState === 1) {
          if (client.battleId) {
            if (event.aggregateId === client.battleId) {
              client.ws.send(message);
            }
          } else {
            client.ws.send(message);
          }
        } else {
          deadClients.push(id);
        }
      } catch {
        deadClients.push(id);
      }
    }

    for (const id of deadClients) {
      this.clients.delete(id);
    }
  }

  onOpen(ws: WsClient, clientId: string): void {
    this.clients.set(clientId, { id: clientId, ws });

    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      message: 'Connected to battle stream',
    }));
  }

  onMessage(ws: WsClient, message: string, clientId: string): void {
    try {
      const data = JSON.parse(message);

      if (data.type === 'subscribe') {
        const client = this.clients.get(clientId);
        if (client) {
          client.battleId = data.battleId;
          ws.send(JSON.stringify({
            type: 'subscribed',
            battleId: data.battleId,
          }));
        }
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  }

  onClose(_ws: WsClient, clientId: string): void {
    this.clients.delete(clientId);
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
