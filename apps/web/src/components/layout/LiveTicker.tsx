import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LiveBadge } from '../common/LiveBadge';

interface Battle {
  id: string;
  name?: string;
  state?: { phase?: string; turn?: number };
  turn?: number;
  max_turns?: number;
}

export function LiveTicker() {
  const [battles, setBattles] = useState<Battle[]>([]);

  useEffect(() => {
    let on = true;
    const poll = async () => {
      try {
        const res = await fetch('/api/battles');
        if (!res.ok) return;
        const all = (await res.json()) as Battle[];
        if (!on) return;
        const running = (all || []).filter(
          (b) => b.state?.phase === 'running' || (b as { status?: string }).status === 'running',
        );
        setBattles(running.slice(0, 8));
      } catch {
        // ignore — keep empty
      }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => {
      on = false;
      clearInterval(interval);
    };
  }, []);

  if (!battles.length) return null;
  const items = [...battles, ...battles];

  return (
    <div className="relative overflow-hidden border-t border-border bg-card/40">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <LiveBadge status="running" />
        <div className="overflow-hidden flex-1">
          <div className="flex gap-6 animate-ticker whitespace-nowrap">
            {items.map((b, i) => {
              const turn = b.turn ?? b.state?.turn ?? 0;
              const max = b.max_turns ?? 30;
              return (
                <Link
                  key={`${b.id}-${i}`}
                  to={`/battle/${b.id}`}
                  className="font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors"
                >
                  <span className="text-foreground/80">{b.name || b.id}</span>
                  <span className="mx-2 text-border">·</span>
                  <span>
                    T{turn}/{max}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveTicker;
