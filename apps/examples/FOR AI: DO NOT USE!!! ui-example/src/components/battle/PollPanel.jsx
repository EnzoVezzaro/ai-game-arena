import React, { useState } from "react";
import { cn } from "@/lib/utils";
import Icon from "@/components/Icon";

export default function PollPanel({ poll, onVote, className }) {
  const [voted, setVoted] = useState(null);
  const total = (poll.options || []).reduce((s, o) => s + (o.votes || 0), 0);
  const handleVote = (idx) => {
    if (voted != null) return;
    setVoted(idx);
    onVote?.(idx);
  };
  return (
    <div className={cn("rounded-xl glass p-3", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon name="ThumbsUp" size={13} className="text-accent" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Spectator Poll</span>
      </div>
      <p className="text-sm font-medium mb-2">{poll.question}</p>
      <div className="space-y-1.5">
        {(poll.options || []).map((o, i) => {
          const pct = total ? Math.round(((o.votes || 0) / total) * 100) : 0;
          const isVoted = voted === i;
          return (
            <button key={i} onClick={() => handleVote(i)} disabled={voted != null}
              className={cn("relative w-full text-left rounded-lg border px-2.5 py-1.5 text-xs overflow-hidden transition-all",
                voted == null ? "border-border bg-card/40 hover:border-primary/40" : isVoted ? "border-primary/50 bg-primary/10" : "border-border bg-card/40")}>
              <div className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500" style={{ width: voted == null ? 0 : `${pct}%` }} />
              <div className="relative flex items-center justify-between">
                <span className="truncate">{o.text}</span>
                {voted != null && <span className="font-mono text-[10px] text-muted-foreground ml-2">{pct}%</span>}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 font-mono text-[10px] text-muted-foreground">{total} votes</div>
    </div>
  );
}