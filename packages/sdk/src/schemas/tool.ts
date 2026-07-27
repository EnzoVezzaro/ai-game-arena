import { z } from 'zod';

export const ToolParameterSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  description: z.string().min(1),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
});

export const ToolDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  parameters: z.array(ToolParameterSchema).default([]),
  mandatory: z.boolean().default(false),
});
