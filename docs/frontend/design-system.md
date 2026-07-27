# Frontend Design System

> A comprehensive design specification for the AI Game Arena UI Runtime. Inspired by the reference implementation, this defines the visual language, component library, and layout patterns.

---

## Design Philosophy

| Principle | Description |
|-----------|-------------|
| **Runtime Aesthetic** | Terminal-inspired, monospace-heavy, technical but approachable |
| **Glass Morphism** | Layered translucency with subtle borders and glow effects |
| **Data-Dense** | High information density with clear visual hierarchy |
| **Live First** | Real-time indicators, animated states, streaming data |
| **Accessible** | WCAG AA compliant, keyboard navigable, reduced motion support |

---

## Design Tokens

### Color Palette

```css
:root {
  /* Base */
  --background: 224 71% 4%;           /* #030712 - deep navy */
  --foreground: 210 40% 98%;          /* #f8fafc - near white */
  --muted: 217 33% 17%;               /* #1e293b - slate 800 */
  --muted-foreground: 215 20% 65%;    /* #94a3b8 - slate 400 */
  --border: 217 33% 17%;              /* #1e293b - same as muted */
  --ring: 189 95% 52%;                /* #06b6d4 - cyan 500 */

  /* Card surfaces */
  --card: 222 47% 11%;                /* #0f172a - slate 900 */
  --card-foreground: 210 40% 98%;

  /* Glass layers */
  --glass: 222 47% 11% / 0.6;         /* rgba(15, 23, 42, 0.6) */
  --glass-strong: 222 47% 11% / 0.85; /* rgba(15, 23, 42, 0.85) */

  /* Primary: Cyan */
  --primary: 189 95% 52%;             /* #06b6d4 - cyan 500 */
  --primary-foreground: 224 71% 4%;
  --primary-glow: 189 95% 52% / 0.45;

  /* Accent: Violet */
  --accent: 265 90% 66%;              /* #a855f7 - violet 500 */
  --accent-foreground: 210 40% 98%;
  --accent-glow: 265 90% 66% / 0.45;

  /* Success */
  --success: 142 76% 36%;             /* #22c55e - green 500 */
  --success-glow: 142 76% 36% / 0.3;

  /* Warning */
  --warning: 45 93% 47%;              /* #f59e0b - amber 500 */

  /* Destructive */
  --destructive: 0 84% 60%;           /* #ef4444 - red 500 */

  /* Category colors */
  --cat-classic: 189 95% 52%;         /* cyan */
  --cat-tournament: 265 90% 66%;      /* violet */
  --cat-streamer: 346 87% 49%;        /* pink */
  --cat-minimal: 215 20% 65%;         /* slate */

  /* Status */
  --status-running: 142 76% 36%;      /* green */
  --status-paused: 45 93% 47%;        /* amber */
  --status-finished: 215 20% 65%;     /* slate */
  --status-waiting: 189 95% 52%;      /* cyan */
  --status-aborted: 0 84% 60%;        /* red */
}
```

### Typography

```css
:root {
  /* Font families */
  --font-display: 'JetBrains Mono', 'Fira Code', monospace;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  /* Type scale */
  --text-xs: 0.625rem;    /* 10px */
  --text-sm: 0.75rem;     /* 12px */
  --text-base: 0.875rem;  /* 14px */
  --text-lg: 1rem;        /* 16px */
  --text-xl: 1.125rem;    /* 18px */
  --text-2xl: 1.25rem;    /* 20px */
  --text-3xl: 1.5rem;     /* 24px */
  --text-4xl: 2rem;       /* 32px */
}
```

**Usage Rules:**
- `--font-display` for headings, logos, emphasis
- `--font-mono` for all data, codes, scores, turn counters, technical labels
- `--font-sans` for body text, UI labels, descriptions

### Spacing & Sizing

```css
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */

  /* Border radius */
  --radius-sm: 0.375rem;   /* 6px */
  --radius-md: 0.5rem;     /* 8px */
  --radius-lg: 0.75rem;    /* 12px */
  --radius-xl: 1rem;       /* 16px */
  --radius-2xl: 1.5rem;    /* 24px */
  --radius-full: 9999px;

  /* Z-index layers */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;
  --z-toast: 800;
}
```

### Effects & Animations

```css
/* Glass utilities */
.glass {
  background: hsl(var(--glass));
  backdrop-filter: blur(16px);
  border: 1px solid hsl(var(--border));
}
.glass-strong {
  background: hsl(var(--glass-strong));
  backdrop-filter: blur(24px);
  border: 1px solid hsl(222 34% 18%);
}

/* Glow effects */
.glow-primary {
  box-shadow: 0 0 0 1px hsl(var(--primary) / 0.3), 0 0 28px -4px hsl(var(--primary) / 0.45);
}
.glow-accent {
  box-shadow: 0 0 0 1px hsl(var(--accent) / 0.3), 0 0 28px -4px hsl(var(--accent) / 0.45);
}
.glow-success { box-shadow: 0 0 0 1px hsl(var(--success) / 0.3), 0 0 24px -4px hsl(var(--success) / 0.4); }
.glow-destructive { box-shadow: 0 0 0 1px hsl(var(--destructive) / 0.3), 0 0 24px -4px hsl(var(--destructive) / 0.4); }

/* Animations */
@keyframes ticker {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-ticker { animation: ticker 20s linear infinite; }

@keyframes scan {
  0% { transform: translateY(-100%); opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { transform: translateY(100%); opacity: 0; }
}
.animate-scan { animation: scan 3s ease-in-out infinite; }

@keyframes pulse-glow {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
.animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }

@keyframes ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}
.animate-ping { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }

@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fade-in 0.2s ease-out; }

/* Scanline overlay */
.scanline::after {
  content: "";
  position: absolute; inset: 0;
  background: repeating-linear-gradient(
    0deg, hsl(189 95% 52% / 0.04) 0px, hsl(189 95% 52% / 0.04) 1px,
    transparent 1px, transparent 3px
  );
  pointer-events: none;
}

/* Arena grid background */
.arena-grid-bg {
  background-image:
    linear-gradient(hsl(189 95% 52% / 0.06) 1px, transparent 1px),
    linear-gradient(90deg, hsl(189 95% 52% / 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* Scrollbar */
.scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: hsl(222 34% 22%); border-radius: 999px; }
.scrollbar-thin::-webkit-scrollbar-thumb:hover { background: hsl(189 95% 52% / 0.5); }
```

---

## Component Library

All components follow **shadcn/ui** patterns with custom styling.

### Base Components

| Component | Variants | Key Props |
|-----------|----------|-----------|
| `Button` | default, outline, ghost, destructive, link, glass | `size: sm|md|lg|icon` |
| `Input` | default, error | `placeholder`, `disabled` |
| `Textarea` | default | `rows` |
| `Card` | default, glass, glass-strong | `padding` |
| `Badge` | default, outline, success, warning, destructive | `dot?: boolean` |
| `Avatar` | default | `size: sm|md|lg|xl`, `fallback` |
| `Tabs` | default, underline | `defaultValue`, `onValueChange` |
| `DropdownMenu` | default | `trigger`, `content` |
| `Dialog` | default, alert | `open`, `onOpenChange` |
| `Sheet` | default | `side: left|right|top|bottom` |
| `Popover` | default | `open`, `onOpenChange` |
| `Tooltip` | default | `content`, `side` |
| `HoverCard` | default | `trigger`, `content` |
| `ScrollArea` | default | `type: always|hover|scroll` |
| `Separator` | default, vertical | `decorative` |
| `Label` | default | `htmlFor` |
| `Checkbox` | default | `checked`, `onCheckedChange` |
| `Switch` | default | `checked`, `onCheckedChange` |
| `RadioGroup` | default | `value`, `onValueChange` |
| `Select` | default | `value`, `onValueChange` |
| `Toggle` | default, outline | `pressed`, `onPressedChange` |
| `ToggleGroup` | default | `value`, `onValueChange` |
| `Progress` | default | `value`, `max` |
| `Slider` | default | `value`, `onValueChange`, `min`, `max`, `step` |
| `Pagination` | default | `pageCount`, `onPageChange` |
| `Table` | default | `columns`, `data` |
| `Command` | default | `placeholder`, `filter` |
| `Sonner` (toast) | default, success, error, loading | `action`, `duration` |

### Domain Components

| Component | Description | Location |
|-----------|-------------|----------|
| `ArenaGrid` | Battle grid with units, HP bars, scan beam | `components/battle/ArenaGrid.tsx` |
| `EventLog` | Streaming event feed with icons, colors, auto-scroll | `components/battle/EventLog.tsx` |
| `AgentRoster` | Agent cards with avatar, strategy, HP bar, score | `components/battle/AgentRoster.tsx` |
| `TurnTimeline` | Progress bar with turn counter | `components/battle/TurnTimeline.tsx` |
| `BattleControls` | Play/pause/step/reset/speed controls | `components/battle/BattleControls.tsx` |
| `SpectatorChat` | Real-time chat with channels | `components/battle/SpectatorChat.tsx` |
| `PollPanel` | Spectator voting widget | `components/battle/PollPanel.tsx` |
| `Scoreboard` | Ranked agent scores with winner highlight | `components/battle/Scoreboard.tsx` |
| `AgentAvatar` | Colored icon with status indicator | `components/AgentAvatar.tsx` |
| `AgentCard` | Full agent profile card | `components/AgentCard.tsx` |
| `ArenaCard` | Arena listing card with category badge | `components/ArenaCard.tsx` |
| `GameCard` | Game listing card | `components/GameCard.tsx` |
| `PluginCard` | Plugin listing with install button | `components/PluginCard.tsx` |
| `PackageCard` | Package listing | `components/PackageCard.tsx` |
| `LiveBadge` | Animated status indicator | `components/LiveBadge.tsx` |
| `LiveTicker` | Scrolling live battle marquee | `components/LiveTicker.tsx` |
| `PageLoader` | Skeleton loading state | `components/PageLoader.tsx` |
| `Icon` | Lucide icon wrapper | `components/Icon.tsx` |
| `Modal` | Accessible dialog wrapper | `components/Modal.tsx` |
| `Chip` | Compact label with icon | `components/Chip.tsx` |
| `StatCard` | Metric display card | `components/StatCard.tsx` |
| `GameBadge` | Category-colored game label | `components/GameBadge.tsx` |

---

## Layout System

### Main Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Header (sticky)                                                 │
│ ┌──────────────┬───────────────────────────┬────────────────┐  │
│ │ Burger Menu  │ Terminal Path             │ Search + LIVE  │  │
│ └──────────────┴───────────────────────────┴────────────────┘  │
│ LiveTicker (scrolling marquee of active battles)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐                                                  │
│  │ Sidebar  │  Main Content (Outlet)                           │
│  │ (lg:sticky)                                                 │
│  │          │  ┌────────────────────────────────────────────┐  │
│  │  Logo    │  │ Page Content                               │  │
│  │  Nav     │  │                                            │  │
│  │  Status  │  │                                            │  │
│  │          │  │                                            │  │
│  └──────────┘  └────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Sidebar Navigation

```typescript
const NAV = [
  { to: '/', label: 'Overview', icon: 'LayoutGrid' },
  { to: '/arenas', label: 'Arenas', icon: 'Swords' },
  { to: '/games', label: 'Games', icon: 'Gamepad2' },
  { to: '/battles', label: 'Battles', icon: 'Radio' },
  { to: '/leaderboard', label: 'Leaderboard', icon: 'Trophy' },
  { to: '/agents', label: 'Agents', icon: 'Bot' },
  { to: '/plugins', label: 'Plugins', icon: 'Puzzle' },
  { to: '/packages', label: 'Packages', icon: 'Package' },
];
```

**States:**
- Active: `bg-primary/10 text-primary border-primary/30 glow-primary` + pulsing dot
- Inactive: `text-muted-foreground hover:text-foreground hover:bg-muted/50`

### Header

```tsx
<header className="sticky top-0 z-20 glass-strong border-b border-border">
  <div className="flex items-center gap-3 px-4 lg:px-6 h-14">
    {/* Mobile menu button */}
    <button className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted/60">
      <Icon name="Layers" size={18} />
    </button>
    
    {/* Terminal path */}
    <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground">
      <Icon name="Terminal" size={13} className="text-primary" />
      <span>spectator://arena</span>
      <span className="text-border">/</span>
      <span className="text-foreground/70">{currentPath}</span>
    </div>
    
    {/* Search + Live indicator */}
    <div className="ml-auto flex items-center gap-2">
      <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-1.5 w-56">
        <Icon name="Search" size={14} className="text-muted-foreground" />
        <input placeholder="Search arenas…" className="bg-transparent text-xs outline-none flex-1 placeholder:text-muted-foreground" />
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-2.5 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
        <span className="font-mono text-[10px] font-semibold text-success">LIVE</span>
      </div>
    </div>
  </div>
  
  {/* Live ticker */}
  <LiveTicker />
</header>
```

### Live Ticker

```tsx
function LiveTicker() {
  const [battles, setBattles] = useState<Battle[]>([]);
  
  // Poll for running battles
  useEffect(() => {
    const interval = setInterval(async () => {
      const running = await api.battles.list({ status: 'running', limit: 8 });
      setBattles(running);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!battles.length) return null;

  const items = [...battles, ...battles]; // Duplicate for seamless loop
  
  return (
    <div className="relative overflow-hidden border-t border-border bg-card/40">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <LiveBadge status="running" />
        <div className="overflow-hidden flex-1">
          <div className="flex gap-6 animate-ticker whitespace-nowrap">
            {items.map((b, i) => (
              <Link key={i} to={`/battle/${b.id}`} className="font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors">
                <span className="text-foreground/80">{b.name}</span>
                <span className="mx-2 text-border">·</span>
                <span>T{b.turn || 0}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Key Pages

### Battle Page (`/battle/:id`)

```
┌─────────────────────────────────────────────────────────────────┐
│ Top Bar: Battle name, status badges, arena/game chips, controls │
├─────────────────────────────────────────────────────────────────┤
│ Turn Timeline (progress bar + turn/max)                         │
├──────────────┬──────────────────────────┬───────────────────────┤
│ Agent Roster │        Arena Grid        │ Events / Chat Tabs    │
│ + Poll Panel │                          │                       │
│              │  ┌────────────────────┐  │  ┌────────────────┐  │
│              │  │                    │  │  │ Event Log      │  │
│              │  │   Grid Renderer    │  │  │ (auto-scroll)  │  │
│              │  │                    │  │  └────────────────┘  │
│              │  └────────────────────┘  │  ┌────────────────┐  │
│              │                          │  │ Spectator Chat │  │
│              │                          │  └────────────────┘  │
├──────────────┴──────────────────────────┴───────────────────────┤
│ Scoreboard (bottom of center or separate)                       │
└─────────────────────────────────────────────────────────────────┘
```

**Layout CSS:**
```css
.grid-cols-1 lg:grid-cols-[260px_1fr_340px] gap-3
```

**Key Components:**
- `ArenaGrid` - center, glass card, aspect-square, max-w-[560px]
- `AgentRoster` + `PollPanel` - left sidebar
- `EventLog` / `SpectatorChat` - right sidebar with tabs
- `BattleControls` - play, pause, step, reset, speed (1x/2x/4x)
- `TurnTimeline` - top of center panel
- `Scoreboard` - bottom of center panel

### Arena Grid Component

```tsx
interface ArenaGridProps {
  state: BattleEngineState;  // { grid_size, units[], turn }
  accent?: string;           // Hex color for theme
}

function ArenaGrid({ state, accent = '#38bdf8' }: ArenaGridProps) {
  const n = state.grid_size || 8;
  const cells = Array.from({ length: n * n }, (_, i) => ({
    x: i % n, y: Math.floor(i / n)
  }));
  const units = state.units || [];

  return (
    <div className="relative w-full">
      <div className="relative aspect-square w-full max-w-[560px] mx-auto rounded-2xl border border-border bg-background/60 overflow-hidden scanline">
        {/* Grid background */}
        <div className="absolute inset-0 arena-grid-bg opacity-60" />
        {/* Radial glow */}
        <div className="absolute inset-0" style={{ background: `radial-gradient(40rem 40rem at 50% 50%, ${accent}10, transparent 60%)` }} />
        {/* Scan beam */}
        <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-primary/10 to-transparent animate-scan pointer-events-none" />
        
        {/* Grid cells */}
        <div className="relative grid h-full w-full p-3" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}>
          {cells.map(c => {
            const unit = units.find(u => u.alive && u.x === c.x && u.y === c.y);
            return (
              <div key={`${c.x}-${c.y}`} className="relative flex items-center justify-center">
                {unit && <UnitToken unit={unit} />}
              </div>
            );
          })}
        </div>

        {/* Corner HUD */}
        <div className="absolute top-2 left-2 font-mono text-[9px] text-muted-foreground tracking-wider">GRID {n}×{n}</div>
        <div className="absolute top-2 right-2 font-mono text-[9px] text-primary tracking-wider">TURN {state.turn || 0}</div>
      </div>
    </div>
  );
}
```

**UnitToken:**
```tsx
function UnitToken({ unit }) {
  return (
    <div className="relative group flex items-center justify-center" style={{ width: '82%', height: '82%' }}>
      {/* Attack ping */}
      {unit.lastAction?.kind === 'attack' && (
        <span className="absolute inset-0 rounded-full animate-ping" style={{ background: `${unit.color}40` }} />
      )}
      
      <div
        className={cn(
          'relative h-full w-full rounded-lg flex items-center justify-center font-mono font-bold text-sm transition-all duration-300',
          unit.lastAction?.kind === 'hit' && 'animate-pulse-glow'
        )}
        style={{
          background: `linear-gradient(140deg, ${unit.color}40, ${unit.color}15)`,
          border: `1.5px solid ${unit.color}`,
          color: unit.color,
          boxShadow: `0 0 16px -2px ${unit.color}aa`,
          opacity: unit.alive ? 1 : 0.3
        }}
      >
        {unit.symbol}
      </div>
      
      {/* HP bar */}
      <div className="absolute -bottom-1.5 left-1 right-1 h-1 rounded-full bg-black/50 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ 
          width: `${unit.hp}%`, 
          background: unit.hp > 50 ? '#34d399' : unit.hp > 25 ? '#fbbf24' : '#f43f5e' 
        }} />
      </div>
    </div>
  );
}
```

### Event Log Component

```tsx
function EventLog({ events, agents = [] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [events]);

  const agentName = (id) => agents.find(a => a.id === id)?.name;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Icon name="ListTree" size={13} className="text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Event Stream</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{events.length}</span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {events.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground">Awaiting match events…</div>
        )}
        {events.map((e, i) => {
          const meta = eventMeta(e.type);
          return (
            <div key={i} className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40 animate-fade-in">
              <Icon name={meta.icon} size={12} className="mt-0.5 shrink-0" style={{ color: meta.color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: meta.color }}>{meta.label}</span>
                  {e.turn != null && <span className="font-mono text-[9px] text-muted-foreground">T{e.turn}</span>}
                </div>
                <div className="text-[11px] text-foreground/80 leading-snug break-words">{e.summary}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Event Metadata:**
```ts
function eventMeta(type: string) {
  const meta: Record<string, { icon: string; label: string; color: string }> = {
    MATCH_STARTED: { icon: 'Radio', label: 'MATCH STARTED', color: 'hsl(var(--primary))' },
    MATCH_ENDED: { icon: 'Flag', label: 'MATCH ENDED', color: 'hsl(var(--success))' },
    TURN_START: { icon: 'RotateCcw', label: 'TURN', color: 'hsl(var(--accent))' },
    AGENT_JOINED: { icon: 'UserPlus', label: 'AGENT JOINED', color: 'hsl(var(--primary))' },
    AGENT_ACTION: { icon: 'MousePointerClick', label: 'ACTION', color: 'hsl(var(--warning))' },
    UNIT_MOVED: { icon: 'ArrowRight', label: 'MOVE', color: 'hsl(var(--primary))' },
    UNIT_ATTACKED: { icon: 'Target', label: 'ATTACK', color: 'hsl(var(--destructive))' },
    UNIT_DAMAGED: { icon: 'Zap', label: 'DAMAGE', color: 'hsl(var(--destructive))' },
    UNIT_DESTROYED: { icon: 'Skull', label: 'ELIMINATED', color: 'hsl(var(--destructive))' },
    SCORE_CHANGE: { icon: 'TrendingUp', label: 'SCORE', color: 'hsl(var(--success))' },
    CHAT_MESSAGE: { icon: 'MessageCircle', label: 'CHAT', color: 'hsl(var(--accent))' },
  };
  return meta[type] || { icon: 'Circle', label: type, color: 'hsl(var(--muted-foreground))' };
}
```

---

## Battle Controls

```tsx
function BattleControls({ 
  status, speed, onPlay, onPause, onStep, onReset, onSpeedChange 
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {status === 'running' ? (
          <button onClick={onPause} className="p-1.5 rounded-md hover:bg-muted" aria-label="Pause">
            <Icon name="Pause" size={14} />
          </button>
        ) : (
          <button onClick={onPlay} className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90" aria-label="Play">
            <Icon name="Play" size={14} />
          </button>
        )}
        {status !== 'running' && (
          <button onClick={onStep} className="p-1.5 rounded-md hover:bg-muted" aria-label="Step">
            <Icon name="StepForward" size={14} />
          </button>
        )}
        <button onClick={onReset} className="p-1.5 rounded-md hover:bg-muted" aria-label="Reset">
          <Icon name="RotateCcw" size={14} />
        </button>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <span className="font-mono text-[10px] text-muted-foreground">SPEED</span>
        <select value={speed} onChange={e => onSpeedChange(Number(e.target.value))} className="bg-muted/50 border border-border rounded px-2 py-1 text-xs font-mono outline-none">
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>
    </div>
  );
}
```

---

## Agent Roster

```tsx
function AgentRoster({ agents, units = [], scores = [] }) {
  const scoreFor = (id) => scores.find(s => s.agent_id === id)?.score ?? units.find(u => u.agent_id === id)?.score ?? 0;

  return (
    <div className="space-y-2">
      {agents.map(agent => {
        const unit = units.find(u => u.agent_id === agent.id) || { hp: 100, alive: true };
        const strat = strategyMeta(agent.strategy);
        const alive = unit.alive !== false;
        const score = scoreFor(agent.id);

        return (
          <div key={agent.id} className={cn('rounded-xl border p-3 transition-all', alive ? 'glass border-border' : 'border-border/40 bg-muted/20 opacity-50')}>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <AgentAvatar agent={agent} size="sm" />
                {!alive && (
                  <div className="absolute inset-0 rounded-xl bg-background/60 flex items-center justify-center">
                    <Icon name="Octagon" size={14} className="text-destructive" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate">{agent.name}</div>
                <div className="flex items-center gap-1 font-mono text-[9px]" style={{ color: strat.color }}>
                  <Icon name={strat.icon} size={9} />{strat.label}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-sm font-bold text-primary">{score}</div>
                <div className="font-mono text-[8px] text-muted-foreground uppercase">pts</div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-[9px] text-muted-foreground w-7">HP</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${unit.hp}%`, background: unit.hp > 50 ? '#34d399' : unit.hp > 25 ? '#fbbf24' : '#f43f5e' }} />
              </div>
              <span className="font-mono text-[9px] text-muted-foreground w-8 text-right">{unit.hp}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## Spectator Chat

```tsx
function SpectatorChat({ battleId }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [channel, setChannel] = useState('general');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to WebSocket, subscribe to battle chat
    const ws = new WebSocket(`/ws/chat/${battleId}`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      setMessages(prev => [...prev, msg]);
    };
    return () => ws.close();
  }, [battleId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    ws.send(JSON.stringify({ type: 'chat:send', channel, message: input }));
    setInput('');
  };

  return (
    <form onSubmit={send} className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Icon name="MessageSquare" size={13} className="text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Spectator Chat</span>
        <div className="ml-auto flex items-center gap-1">
          {['general', 'tactical', 'social'].map(c => (
            <button key={c} onClick={() => setChannel(c)} className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${channel === c ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className="flex gap-2">
            <span className="font-mono text-[9px] text-muted-foreground shrink-0">{msg.time}</span>
            <span className="font-medium text-[11px] text-primary">{msg.sender}:</span>
            <span className="text-[11px] text-foreground/80">{msg.content}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message spectators…"
          className="w-full bg-muted/50 border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
      </div>
    </form>
  );
}
```

---

## Pages Overview

### Overview (`/`)

```tsx
function Home() {
  return (
    <div className="px-3 lg:px-6 py-4 max-w-[1500px] mx-auto space-y-6">
      {/* Hero */}
      <section className="glass-strong rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="Zap" size={14} className="text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Runtime Status</span>
            </div>
            <h1 className="font-display font-bold text-2xl lg:text-3xl">AI Game Arena</h1>
            <p className="mt-2 text-muted-foreground max-w-xl">The operating system for AI environments. Run battles, test agents, build arenas.</p>
          </div>
          <div className="flex items-center gap-3">
            <StatCard label="Active Battles" value="12" icon="Radio" trend="+3" />
            <StatCard label="Registered Agents" value="247" icon="Bot" trend="+18" />
            <StatCard label="Available Arenas" value="8" icon="Swords" />
            <StatCard label="Plugins Installed" value="14" icon="Puzzle" />
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionCard icon="Plus" label="New Battle" desc="Start a match instantly" href="/battle/new" />
          <ActionCard icon="Swords" label="Browse Arenas" desc="Explore environments" href="/arenas" />
          <ActionCard icon="Bot" label="Manage Agents" desc="Configure AI agents" href="/agents" />
          <ActionCard icon="Puzzle" label="Install Plugins" desc="Extend capabilities" href="/plugins" />
        </div>
      </section>

      {/* Live Battles */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">Live Battles</h2>
          <LiveBadge status="running" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {liveBattles.map(b => <BattleCard key={b.id} battle={b} />)}
        </div>
      </section>

      {/* Featured Arenas */}
      <section>
        <h2 className="font-display font-bold text-lg mb-4">Featured Arenas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {featuredArenas.map(a => <ArenaCard key={a.id} arena={a} />)}
        </div>
      </section>
    </div>
  );
}
```

### Arenas Page (`/arenas`)

```tsx
function Arenas() {
  return (
    <div className="px-3 lg:px-6 py-4 max-w-[1500px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl">Arenas</h1>
          <p className="text-muted-foreground text-sm">Environments where battles take place</p>
        </div>
        <button className="btn-primary"><Icon name="Plus" size={14} /> New Arena</button>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-3 mb-4 flex flex-wrap gap-2">
        <Select placeholder="All Categories" className="w-40">
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="classic">Classic</SelectItem>
            <SelectItem value="tournament">Tournament</SelectItem>
            <SelectItem value="streamer">Streamer</SelectItem>
            <SelectItem value="minimal">Minimal</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Search arenas…" className="flex-1 max-w-md" />
        <Select placeholder="Sort">
          <SelectTrigger className="w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most Played</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {arenas.map(a => <ArenaCard key={a.id} arena={a} />)}
      </div>
    </div>
  );
}
```

### Arena Card

```tsx
function ArenaCard({ arena }) {
  const cat = categoryMeta(arena.category);
  return (
    <Link to={`/arenas/${arena.slug}`} className="glass rounded-2xl p-4 transition-all hover:border-primary/30 hover:glow-primary group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="h-12 w-12 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${arena.accent_color || cat.color}22`, border: `1px solid ${arena.accent_color || cat.color}55` }}>
          {arena.icon || <Icon name={cat.icon} size={20} style={{ color: arena.accent_color || cat.color }} />}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <Badge variant="outline" className="text-[9px]">{cat.label}</Badge>
          {arena.is_featured && <Badge variant="secondary" className="text-[9px]"><Icon name="Star" size={9} /> Featured</Badge>}
        </div>
      </div>
      <h3 className="font-display font-bold text-base truncate group-hover:text-primary transition-colors">{arena.name}</h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{arena.tagline}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {arena.game_slugs?.slice(0, 3).map(g => (
          <Badge key={g} variant="outline" className="text-[9px] font-mono">{g}</Badge>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span>{arena.capacity} agents max</span>
        <span className="text-primary font-semibold">{arena.battle_count || 0} battles</span>
      </div>
    </Link>
  );
}
```

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| `mobile` | < 640px | Sidebar drawer, stacked battle layout, bottom tabs |
| `sm` | 640px | Two-column grids, sidebar collapses |
| `md` | 768px | Terminal path visible, three-column battle layout |
| `lg` | 1024px | Full sidebar sticky, three-panel battle view |
| `xl` | 1280px | Max-width container 1500px |
| `2xl` | 1536px | Wider grids, more breathing room |

---

## Accessibility

- All interactive elements: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background`
- Semantic HTML: `<nav>`, `<main>`, `<aside>`, `<header>`, `<section>`, `<article>`
- ARIA labels on icon-only buttons
- Live regions for battle status changes
- Reduced motion: `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }`
- Color contrast: All text meets WCAG AA (4.5:1)
- Keyboard navigation: Tab order follows visual layout

---

## Theming

```css
/* Light mode (optional) */
@media (prefers-color-scheme: light) {
  :root {
    --background: 0 0% 100%;
    --foreground: 224 71% 4%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --border: 214 32% 91%;
    --card: 0 0% 100%;
    --glass: 255 255 255 / 0.7;
    --glass-strong: 255 255 255 / 0.9;
  }
}
```

---

## Performance

- Code-split by route (`React.lazy` + `Suspense`)
- Virtualize long lists (`@tanstack/react-virtual`)
- Memoize heavy components (`React.memo`, `useMemo`, `useCallback`)
- Debounce search inputs (300ms)
- WebSocket connection pooling
- Image optimization (WebP, lazy load)

---

## File Structure

```
apps/web/src/
├── components/
│   ├── ui/                    # Base components (shadcn)
│   ├── battle/                # Battle-specific components
│   │   ├── ArenaGrid.tsx
│   │   ├── EventLog.tsx
│   │   ├── AgentRoster.tsx
│   │   ├── TurnTimeline.tsx
│   │   ├── BattleControls.tsx
│   │   ├── SpectatorChat.tsx
│   │   ├── PollPanel.tsx
│   │   ├── Scoreboard.tsx
│   │   └── AgentRoster.tsx
│   ├── layout/                # Layout components
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── LiveTicker.tsx
│   │   └── Footer.tsx
│   ├── common/                # Shared components
│   │   ├── Icon.tsx
│   │   ├── AgentAvatar.tsx
│   │   ├── AgentCard.tsx
│   │   ├── ArenaCard.tsx
│   │   ├── GameCard.tsx
│   │   ├── PluginCard.tsx
│   │   ├── BattleCard.tsx
│   │   ├── LiveBadge.tsx
│   │   ├── PageLoader.tsx
│   │   ├── Modal.tsx
│   │   ├── Chip.tsx
│   │   ├── StatCard.tsx
│   │   └── GameBadge.tsx
│   └── forms/                 # Form components
├── pages/
│   ├── Battle.tsx
│   ├── Arenas.tsx
│   ├── ArenaDetail.tsx
│   ├── Games.tsx
│   ├── Agents.tsx
│   ├── AgentDetail.tsx
│   ├── Plugins.tsx
│   ├── Packages.tsx
│   ├── Leaderboard.tsx
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   └── Register.tsx
├── hooks/
│   ├── use-mobile.tsx
│   ├── use-size.tsx
│   └── use-battle-ws.ts
├── lib/
│   ├── utils.ts               # cn(), helpers
│   ├── arena.ts               # categoryMeta, eventMeta
│   ├── battle-engine.ts       # Client-side simulation
│   ├── query-client.ts        # TanStack Query
│   └── api.ts                 # API client
├── styles/
│   └── globals.css            # Design tokens, utilities
├── App.tsx
└── main.tsx
```

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^19",
    "react-dom": "^19",
    "react-router-dom": "^7",
    "lucide-react": "^0.400",
    "clsx": "^2.1",
    "tailwind-merge": "^2.4",
    "@tanstack/react-query": "^5",
    "@radix-ui/react-*": "latest",
    "sonner": "^1.5",
    "zustand": "^4"
  },
  "devDependencies": {
    "typescript": "^5",
    "vite": "^6",
    "tailwindcss": "^4",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

---

*This design system is the single source of truth for the AI Game Arena frontend. All new components must follow these patterns and use these tokens.*