import { useCallback, useEffect, useRef, useState } from 'react';

export interface ChatMessage {
  id: string;
  battleId: string;
  from: string;
  content: string;
  role: 'spectator' | 'agent' | 'system';
  color?: string;
  timestamp: number;
}

/**
 * Talks to the plugin-chat server routes (registered by the Chat plugin):
 *   GET  /api/chat/battles/:battleId  → recent messages
 *   POST /api/chat/battles/:battleId  body { from, content } → send
 * Backed by the Chat plugin's namespaced storage (extends db core).
 */
export function useBattleChat(battleId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fromRef = useRef<string>('you');

  const load = useCallback(async () => {
    if (!battleId) return;
    try {
      const res = await fetch(`/api/chat/battles/${battleId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ChatMessage[];
      setMessages(data);
    } catch (err) {
      setError((err as Error).message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [battleId]);

  useEffect(() => {
    setLoading(true);
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [load]);

  const send = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!battleId || !text) return;
      setSending(true);
      try {
        const res = await fetch(`/api/chat/battles/${battleId}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ from: fromRef.current, content: text }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const msg = (await res.json()) as ChatMessage;
        setMessages((prev) => [...prev, msg].slice(-200));
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSending(false);
      }
    },
    [battleId],
  );

  const setIdentity = useCallback((name: string) => {
    fromRef.current = name || 'spectator';
  }, []);

  return { messages, loading, error, sending, send, setIdentity, reload: load };
}

export default useBattleChat;
