import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../lib/Icon';
import { useBattleChat } from '../../hooks/useBattleChat';
import { cn } from '../../lib/utils';

export interface SpectatorChatProps {
  battleId: string;
  className?: string;
}

export function SpectatorChat({ battleId, className }: SpectatorChatProps) {
  const { messages, loading, sending, send, error } = useBattleChat(battleId);
  const [text, setText] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);

  const onSubmit = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    await send(t);
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Icon name="MessageSquare" size={13} className="text-accent" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Spectator Chat
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {messages.length} msgs
        </span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
        {loading && messages.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">Loading chat…</div>
        )}
        {!loading && messages.length === 0 && !error && (
          <div className="text-center text-xs text-muted-foreground py-8">
            No messages yet. Say something to the spectators!
          </div>
        )}
        {error && (
          <div className="text-center text-xs text-destructive py-6">
            Chat unavailable ({error}). Is the Chat plugin enabled?
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className="text-[11px] leading-snug animate-fade-in">
            <span className="font-mono font-semibold" style={{ color: m.color || '#38bdf8' }}>
              {m.from}
            </span>
            <span className="text-border mx-1">:</span>
            <span className={cn('text-foreground/80', m.role === 'system' && 'italic text-muted-foreground')}>
              {m.content}
            </span>
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-border flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !sending && onSubmit()}
          disabled={sending}
          placeholder="Send a message…"
          className="flex-1 bg-muted/40 rounded-lg px-2.5 py-1.5 text-xs outline-none border border-transparent focus:border-primary/40 placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          onClick={onSubmit}
          disabled={sending || !text.trim()}
          className="rounded-lg bg-primary/15 border border-primary/40 p-1.5 text-primary hover:bg-primary/25 transition-colors disabled:opacity-40"
          aria-label="Send"
        >
          <Icon name="Send" size={14} />
        </button>
      </div>
    </div>
  );
}

export default SpectatorChat;
