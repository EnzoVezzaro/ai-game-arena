import { useEffect, useRef } from 'react';
import { Icon } from '../../lib/Icon';
import { eventMeta } from '../../lib/arena';

export interface BattleEventItem {
  type?: string;
  eventType?: string;
  turn?: number;
  timestamp?: number | string;
  summary?: string;
  payload?: unknown;
  aggregateId?: string;
}

interface EventLogProps {
  events: BattleEventItem[];
  className?: string;
}

export function EventLog({ events, className }: EventLogProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [events]);

  return (
    <div className={`flex flex-col h-full ${className ?? ''}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Icon name="ListTree" size={13} className="text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Event Stream
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{events.length}</span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {events.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground">
            Awaiting match events…
          </div>
        )}
        {events.map((e, i) => {
          const eventType = e.type || e.eventType || 'EVENT';
          const meta = eventMeta(eventType);
          const summary =
            e.summary || (typeof e.payload === 'object' ? '' : String(e.payload ?? ''));
          return (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40 animate-fade-in"
            >
              <Icon
                name={meta.icon}
                size={12}
                className="mt-0.5 shrink-0"
                style={{ color: meta.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-[9px] uppercase tracking-wider"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  {e.turn != null && (
                    <span className="font-mono text-[9px] text-muted-foreground">T{e.turn}</span>
                  )}
                </div>
                {summary && (
                  <div className="text-[11px] text-foreground/80 leading-snug break-words">
                    {summary}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
