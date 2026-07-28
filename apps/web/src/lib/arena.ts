import { cn } from './utils';

/** System-mandatory capabilities every arena must support. */
export const SYSTEM_MANDATORY_CAPABILITIES = [
  {
    name: 'observe',
    description: 'Perceive the environment state — observations are pushed each turn.',
  },
  { name: 'communicate', description: 'Send and receive messages with agents and spectators.' },
  { name: 'pass', description: 'Skip a turn — take no action.' },
  { name: 'yield', description: 'Forfeit / surrender the match.' },
];

export const STRATEGY_PROMPTS: Record<string, string> = {
  aggressive:
    'You are an aggressive commander. Hunt enemies, attack on sight, press the advantage. Prioritize offense over safety.',
  defensive:
    'You are a defensive commander. Preserve your hull, hold strong positions, strike only when the exchange is favorable.',
  scout:
    'You are a scout. Map the field first, locate enemies, report positions, and avoid early engagements.',
  custom: '',
};

export const PROVIDERS: Record<
  string,
  {
    label: string;
    color: string;
    icon: string;
    models: string[];
    needsKey: boolean;
    immediate: boolean;
    blurb: string;
    defaultBaseUrl: string;
  }
> = {
  base44: {
    label: 'Base44 Core',
    color: '#38bdf8',
    icon: 'Cpu',
    models: ['automatic', 'gpt_5_mini', 'gemini_3_flash'],
    needsKey: false,
    immediate: true,
    blurb: 'Platform-managed LLM. No key required.',
    defaultBaseUrl: '',
  },
  openai: {
    label: 'OpenAI',
    color: '#10a37f',
    icon: 'Sparkles',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o3-mini'],
    needsKey: true,
    immediate: false,
    blurb: 'Bring your own OpenAI API key.',
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    label: 'Anthropic',
    color: '#d97757',
    icon: 'BrainCircuit',
    models: ['claude-opus-4.5', 'claude-sonnet-4.5', 'claude-3-5-sonnet'],
    needsKey: true,
    immediate: false,
    blurb: 'Bring your own Anthropic API key.',
    defaultBaseUrl: 'https://api.anthropic.com',
  },
  google: {
    label: 'Google AI',
    color: '#4285f4',
    icon: 'Globe',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro'],
    needsKey: true,
    immediate: false,
    blurb: 'Bring your own Google AI Studio key.',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
  },
  mistral: {
    label: 'Mistral',
    color: '#ff7000',
    icon: 'Wind',
    models: ['mistral-large-latest', 'mistral-small-latest'],
    needsKey: true,
    immediate: false,
    blurb: 'Bring your own Mistral API key.',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
  },
  groq: {
    label: 'Groq',
    color: '#f55036',
    icon: 'Zap',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    needsKey: true,
    immediate: false,
    blurb: 'Ultra-low latency inference. Bring your Groq key.',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
  },
  openrouter: {
    label: 'OpenRouter',
    color: '#a78bfa',
    icon: 'Box',
    models: [],
    needsKey: true,
    immediate: false,
    blurb: 'Aggregate gateway.',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
  },
  ollama: {
    label: 'Ollama (Local)',
    color: '#94a3b8',
    icon: 'CircuitBoard',
    models: [],
    needsKey: false,
    immediate: true,
    blurb: 'Local models. No key required.',
    defaultBaseUrl: 'http://localhost:11434',
  },
  lmstudio: {
    label: 'LM Studio',
    color: '#94a3b8',
    icon: 'CircuitBoard',
    models: [],
    needsKey: false,
    immediate: true,
    blurb: 'Local OpenAI-compatible endpoint.',
    defaultBaseUrl: 'http://localhost:1234/v1',
  },
  vllm: {
    label: 'vLLM',
    color: '#94a3b8',
    icon: 'CircuitBoard',
    models: [],
    needsKey: false,
    immediate: true,
    blurb: 'Local vLLM endpoint.',
    defaultBaseUrl: 'http://localhost:1234/v1',
  },
  custom: {
    label: 'Custom',
    color: '#a78bfa',
    icon: 'CircuitBoard',
    models: [],
    needsKey: false,
    immediate: true,
    blurb: 'Point at any OpenAI-compatible endpoint.',
    defaultBaseUrl: 'http://localhost:8000/v1',
  },
};

/** Order of provider adapters matching the runtime ProviderConfig.type union. */
export const PROVIDER_ORDER = [
  'openai',
  'anthropic',
  'google',
  'mistral',
  'groq',
  'openrouter',
  'ollama',
  'lmstudio',
  'vllm',
  'custom',
];

const DEFAULT_PROVIDER_META = {
  label: 'Custom',
  color: '#a78bfa',
  icon: 'CircuitBoard',
  models: [] as string[],
  needsKey: false,
  immediate: true,
  blurb: 'Point at any OpenAI-compatible endpoint.',
  defaultBaseUrl: 'http://localhost:8000/v1',
};

export function providerMeta(key: string) {
  return PROVIDERS[key] ?? DEFAULT_PROVIDER_META;
}

export const STRATEGIES: Record<
  string,
  { label: string; color: string; icon: string; blurb: string }
> = {
  aggressive: {
    label: 'Aggressive',
    color: '#f43f5e',
    icon: 'Flame',
    blurb: 'Prioritizes offense and early aggression.',
  },
  defensive: {
    label: 'Defensive',
    color: '#38bdf8',
    icon: 'Shield',
    blurb: 'Fortifies position, reacts to threats.',
  },
  scout: {
    label: 'Scout',
    color: '#a78bfa',
    icon: 'Radar',
    blurb: 'Maps the field before committing.',
  },
  llm: {
    label: 'LLM Reasoner',
    color: '#34d399',
    icon: 'BrainCircuit',
    blurb: 'Reasons with language models each turn.',
  },
  balanced: {
    label: 'Balanced',
    color: '#fbbf24',
    icon: 'Scale',
    blurb: 'Adapts strategy to the situation.',
  },
};

export const ARENA_CATEGORIES: Record<string, { label: string; color: string; icon: string }> = {
  classic: { label: 'Classic', color: '#38bdf8', icon: 'Gamepad2' },
  tournament: { label: 'Tournament', color: '#fbbf24', icon: 'Trophy' },
  streamer: { label: 'Streamer', color: '#a78bfa', icon: 'Radio' },
  minimal: { label: 'Minimal', color: '#94a3b8', icon: 'Square' },
};

export const PLUGIN_CATEGORIES: Record<string, { label: string; color: string; icon: string }> = {
  arena: { label: 'Arena', color: '#38bdf8', icon: 'LayoutGrid' },
  interaction: { label: 'Interaction', color: '#a78bfa', icon: 'MessageSquare' },
  exporter: { label: 'Exporter', color: '#34d399', icon: 'Download' },
  agent: { label: 'Agent', color: '#fbbf24', icon: 'Bot' },
  visualization: { label: 'Visualization', color: '#f472b6', icon: 'BarChart3' },
  metric: { label: 'Metric', color: '#fb923c', icon: 'Gauge' },
};

export const GAME_FORMATS: Record<
  string,
  {
    label: string;
    color: string;
    icon: string;
    adapter: string;
    blurb: string;
  }
> = {
  html: {
    label: 'HTML5',
    color: '#f97316',
    icon: 'Code2',
    adapter: 'web',
    blurb: 'Single-page web build. Loaded into an iframe sandbox.',
  },
  unity_webgl: {
    label: 'Unity WebGL',
    color: '#38bdf8',
    icon: 'Box',
    adapter: 'web',
    blurb: 'Unity WebGL export. Runtime calls the Unity bridge.',
  },
  canvas: {
    label: 'Canvas 2D',
    color: '#a78bfa',
    icon: 'MonitorPlay',
    adapter: 'canvas',
    blurb: 'Pixel canvas with a custom render loop.',
  },
  dom: {
    label: 'DOM',
    color: '#34d399',
    icon: 'LayoutGrid',
    adapter: 'dom',
    blurb: 'Reactive DOM elements as the playfield.',
  },
  embed_url: {
    label: 'Embed URL',
    color: '#fbbf24',
    icon: 'Tag',
    adapter: 'web',
    blurb: 'External game hosted at a URL, embedded via iframe.',
  },
  native: {
    label: 'Native Bridge',
    color: '#f472b6',
    icon: 'CircuitBoard',
    adapter: 'dom',
    blurb: 'Custom protocol bridged to the runtime.',
  },
};

export const INSTALL_STATUS: Record<string, { label: string; color: string; icon: string }> = {
  draft: { label: 'Draft', color: '#94a3b8', icon: 'FileUp' },
  staged: { label: 'Staged', color: '#fbbf24', icon: 'Upload' },
  installed: { label: 'Installed', color: '#34d399', icon: 'Check' },
  disabled: { label: 'Disabled', color: '#f43f5e', icon: 'PowerOff' },
};

export const PACKAGE_TYPES: Record<string, { label: string; color: string; icon: string }> = {
  game: { label: 'Game', color: '#38bdf8', icon: 'Gamepad2' },
  plugin: { label: 'Plugin', color: '#a78bfa', icon: 'Puzzle' },
  arena: { label: 'Arena', color: '#fbbf24', icon: 'Swords' },
  bundle: { label: 'Bundle', color: '#34d399', icon: 'Package' },
};

export const EVENT_META: Record<string, { label: string; color: string; icon: string }> = {
  MATCH_STARTED: { label: 'Match Started', color: '#34d399', icon: 'Flag' },
  TURN_STARTED: { label: 'Turn', color: '#38bdf8', icon: 'StepForward' },
  OBSERVATION_CREATED: { label: 'Observation', color: '#a78bfa', icon: 'Eye' },
  TOOL_REQUESTED: { label: 'Tool Requested', color: '#fbbf24', icon: 'MousePointerClick' },
  TOOL_EXECUTED: { label: 'Tool Executed', color: '#34d399', icon: 'Check' },
  STATE_CHANGED: { label: 'State Changed', color: '#fb923c', icon: 'GitBranch' },
  MESSAGE_SENT: { label: 'Message', color: '#f472b6', icon: 'MessageCircle' },
  SCORE_UPDATED: { label: 'Score', color: '#fbbf24', icon: 'TrendingUp' },
  AUDIENCE_EVENT: { label: 'Audience', color: '#a78bfa', icon: 'Users' },
  MATCH_FINISHED: { label: 'Match Finished', color: '#34d399', icon: 'Trophy' },
  MATCH_ABORTED: { label: 'Aborted', color: '#f43f5e', icon: 'Octagon' },
  AGENT_JOINED: { label: 'Agent Joined', color: '#38bdf8', icon: 'LogIn' },
  AGENT_LEFT: { label: 'Agent Left', color: '#f43f5e', icon: 'LogOut' },
};

export const BATTLE_STATUS: Record<
  string,
  { label: string; color: string; icon: string; pulse: boolean }
> = {
  waiting: { label: 'Waiting', color: '#94a3b8', icon: 'Clock', pulse: false },
  running: { label: 'Live', color: '#34d399', icon: 'Radio', pulse: true },
  paused: { label: 'Paused', color: '#fbbf24', icon: 'Pause', pulse: false },
  finished: { label: 'Finished', color: '#38bdf8', icon: 'Check', pulse: false },
  aborted: { label: 'Aborted', color: '#f43f5e', icon: 'Octagon', pulse: false },
};

type StrategyEntry = { label: string; color: string; icon: string; blurb: string };
type CategoryEntry = { label: string; color: string; icon: string };
type GameFormatEntry = {
  label: string;
  color: string;
  icon: string;
  adapter: string;
  blurb: string;
};
type BattleStatusEntry = { label: string; color: string; icon: string; pulse: boolean };

const DEFAULT_STRATEGY: StrategyEntry = {
  label: 'Balanced',
  color: '#fbbf24',
  icon: 'Scale',
  blurb: 'Adapts strategy to the situation.',
};
const DEFAULT_CATEGORY: CategoryEntry = { label: 'Classic', color: '#38bdf8', icon: 'Gamepad2' };
const DEFAULT_PLUGIN_CATEGORY: CategoryEntry = {
  label: 'Arena',
  color: '#38bdf8',
  icon: 'LayoutGrid',
};
const DEFAULT_GAME_FORMAT: GameFormatEntry = {
  label: 'HTML5',
  color: '#f97316',
  icon: 'Code2',
  adapter: 'web',
  blurb: 'Single-page web build. Loaded into an iframe sandbox.',
};
const DEFAULT_INSTALL_STATUS: CategoryEntry = { label: 'Draft', color: '#94a3b8', icon: 'FileUp' };
const DEFAULT_PACKAGE_TYPE: CategoryEntry = {
  label: 'Bundle',
  color: '#34d399',
  icon: 'Package',
};
const DEFAULT_BATTLE_STATUS: BattleStatusEntry = {
  label: 'Waiting',
  color: '#94a3b8',
  icon: 'Clock',
  pulse: false,
};

export function strategyMeta(key: string) {
  return STRATEGIES[key] ?? DEFAULT_STRATEGY;
}
export function categoryMeta(key: string) {
  return ARENA_CATEGORIES[key] ?? DEFAULT_CATEGORY;
}
export function pluginCategoryMeta(key: string) {
  return PLUGIN_CATEGORIES[key] ?? DEFAULT_PLUGIN_CATEGORY;
}
export function gameFormatMeta(key: string) {
  return GAME_FORMATS[key] ?? DEFAULT_GAME_FORMAT;
}
export function installStatusMeta(key: string) {
  return INSTALL_STATUS[key] ?? DEFAULT_INSTALL_STATUS;
}
export function packageTypeMeta(key: string) {
  return PACKAGE_TYPES[key] ?? DEFAULT_PACKAGE_TYPE;
}
export function slugify(s = '') {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
export function eventMeta(type: string) {
  return EVENT_META[type] ?? { label: type, color: '#94a3b8', icon: 'Circle' };
}
export function statusMeta(status: string) {
  return BATTLE_STATUS[status] ?? DEFAULT_BATTLE_STATUS;
}

export function initials(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?'
  );
}

export function contrastText(_hex: string) {
  return '#070A14';
}

export function cx(...args: Parameters<typeof cn>) {
  return cn(...args);
}
