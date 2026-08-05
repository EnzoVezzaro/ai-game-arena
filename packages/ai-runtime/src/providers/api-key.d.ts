import type { AgentConfig, ProviderConfig } from '@ai-game-arena/sdk';
/**
 * Resolve an API key for a provider, preferring (in order):
 *   1. Explicit key on the agent config
 *   2. Explicit key on the provider config
 *   3. Provider-specific env var (e.g. OPENAI_API_KEY)
 *   4. Generic AGA_<PROVIDER>_API_KEY env var
 */
export declare function resolveApiKey(provider: string, agent?: AgentConfig, config?: ProviderConfig): string | undefined;
/**
 * Encrypt an API key at rest using AES-256-GCM with a key derived from the
 * AGA_API_KEY_ENCRYPTION_KEY environment variable. Returns a portable
 * `enc:v1:...` string that can be safely stored in config/profiles.
 */
export declare function encryptApiKey(plaintext: string): string;
/**
 * Decrypt an API key previously produced by `encryptApiKey`.
 * Plain (non-`enc:`) values are returned as-is for backwards compatibility.
 */
export declare function decryptApiKey(value: string): string;
//# sourceMappingURL=api-key.d.ts.map