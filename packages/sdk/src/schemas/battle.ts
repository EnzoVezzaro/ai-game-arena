import { z } from 'zod';

export const BattleConfigSchema = z.object({
  maxAgents: z.number().int().min(2).max(16).default(4),
  turnTimeout: z.number().positive().default(30000),
  maxTurns: z.number().int().positive().default(100),
  seed: z
    .number()
    .int()
    .default(() => Math.floor(Math.random() * 1000000)),
});

export const ProviderConfigSchema = z.object({
  type: z.enum(['openai', 'ollama', 'lmstudio', 'vllm', 'anthropic', 'google', 'mistral', 'groq', 'openrouter', 'nvidia', 'custom']),
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
  model: z.string().min(1),
});

export const AgentConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  strategy: z.enum(['aggressive', 'defensive', 'scout', 'custom']),
  customStrategy: z.string().optional(),
  profileId: z.string().optional(),
  provider: ProviderConfigSchema.optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  specialCapabilities: z.array(z.string()).optional(),
});

export const MatchConfigSchema = z.object({
  maxTurns: z.number().int().positive().default(100),
  timeout: z.number().positive().default(1800000),
  seed: z
    .number()
    .int()
    .default(() => Math.floor(Math.random() * 1000000)),
});
