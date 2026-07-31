import { useCallback, useEffect, useState } from 'react';

export interface PollOption {
  text: string;
  votes: number;
}
export interface Poll {
  id: string;
  battleId: string;
  question: string;
  options: PollOption[];
  createdAt?: number;
}

/**
 * Talks to the plugin-polls server routes (registered by the Polls plugin).
 *   GET  /api/polls/battles/:battleId       → poll
 *   POST /api/polls/battles/:battleId/vote  { optionIndex }
 * The Polls plugin persists data in its own namespaced storage, extending the
 * platform's db core (see docs/plugins).
 */
export function useBattlePolls(battleId: string | undefined) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  const load = useCallback(async () => {
    if (!battleId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/polls/battles/${battleId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Poll;
      setPoll(data);
    } catch (err) {
      // Plugin not installed/active — keep silent, leave poll null.
      setError((err as Error).message);
      setPoll(null);
    } finally {
      setLoading(false);
    }
  }, [battleId]);

  useEffect(() => {
    void load();
    // Polls delivered via REST without WS push; refresh occasionally is enough
    // to surface others' votes to spectators.
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  const vote = useCallback(
    async (optionIndex: number) => {
      if (!battleId) return;
      setVoting(true);
      try {
        const res = await fetch(`/api/polls/battles/${battleId}/vote`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ optionIndex }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Poll;
        setPoll(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setVoting(false);
      }
    },
    [battleId],
  );

  return { poll, loading, error, voting, vote, reload: load };
}

export default useBattlePolls;
