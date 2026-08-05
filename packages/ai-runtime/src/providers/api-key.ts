import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { AgentConfig, ProviderConfig } from '@ai-game-arena/sdk';

const ALGORITHM = 'aes-256-gcm';
const KEY_ENV_VAR = 'AGA_API_KEY_ENCRYPTION_KEY';

/**
 * Resolve an API key for a provider, preferring (in order):
 *   1. Explicit key on the agent config
 *   2. Explicit key on the provider config
 *   3. Provider-specific env var (e.g. OPENAI_API_KEY)
 *   4. Generic AGA_<PROVIDER>_API_KEY env var
 */
export function resolveApiKey(
  provider: string,
  agent?: AgentConfig,
  config?: ProviderConfig,
): string | undefined {
  if (agent?.apiKey) return agent.apiKey;
  if (config?.apiKey) return config.apiKey;
  const envVar = providerToEnvVar(provider);
  return process.env[envVar] ?? process.env['AGA_API_KEY'];
}

function providerToEnvVar(provider: string): string {
  const normalized = provider.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return `AGA_${normalized}_API_KEY`;
}

/**
 * Encrypt an API key at rest using AES-256-GCM with a key derived from the
 * AGA_API_KEY_ENCRYPTION_KEY environment variable. Returns a portable
 * `enc:v1:...` string that can be safely stored in config/profiles.
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]).toString('base64url');
  return `enc:v1:${payload}`;
}

/**
 * Decrypt an API key previously produced by `encryptApiKey`.
 * Plain (non-`enc:`) values are returned as-is for backwards compatibility.
 */
export function decryptApiKey(value: string): string {
  if (!value.startsWith('enc:v1:')) return value;
  const key = getEncryptionKey();
  const raw = Buffer.from(value.slice('enc:v1:'.length), 'base64url');
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function getEncryptionKey(): Buffer {
  const raw = process.env[KEY_ENV_VAR];
  if (!raw) {
    throw new Error(
      `API key encryption requested but ${KEY_ENV_VAR} is not set. ` +
        `Generate one with: openssl rand -base64 32`,
    );
  }
  // Accept either a 32-byte base64url string or a 64-char hex string.
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  return Buffer.from(raw, 'base64url');
}
