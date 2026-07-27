import { useState, useEffect, useCallback, useRef } from 'react';

interface BattleEvent {
  type: 'event' | 'connected' | 'subscribed' | 'error';
  eventType?: string;
  payload?: unknown;
  timestamp?: Date;
  aggregateId?: string;
  clientId?: string;
  message?: string;
  battleId?: string;
}

interface UseBattleWebSocketReturn {
  connected: boolean;
  events: BattleEvent[];
  subscribe: (battleId: string) => void;
  clearEvents: () => void;
}

export function useBattleWebSocket(): UseBattleWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/battles`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as BattleEvent;
        setEvents((prev) => [...prev.slice(-100), data]);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((battleId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', battleId }));
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { connected, events, subscribe, clearEvents };
}
