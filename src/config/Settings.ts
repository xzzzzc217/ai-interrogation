import { OpenAICompatibleProvider } from '../llm/OpenAICompatibleProvider';
import type { LLMProvider } from '../llm/LLMProvider';

/**
 * Player configuration, persisted in localStorage. The API key never leaves the
 * browser and is never sent anywhere except directly to the model endpoint the
 * player chose.
 */
export interface PlayerConfig {
  mode: 'offline' | 'live';
  baseUrl: string;
  apiKey: string;
  model: string;
}

const KEY = 'interrogation.config.v1';

const DEFAULTS: PlayerConfig = {
  mode: 'offline',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
};

/** A few one-click presets to lower the BYOK friction. */
export const PROVIDER_PRESETS: { label: string; baseUrl: string; model: string }[] = [
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: 'Moonshot / Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { label: '本地 (Ollama)', baseUrl: 'http://localhost:11434/v1', model: 'llama3.1' },
];

export function loadConfig(): PlayerConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PlayerConfig>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConfig(cfg: PlayerConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* storage may be unavailable (private mode) — fail silently */
  }
}

/**
 * Build a live provider from the saved config, or return null when the player
 * is in offline mode / has not supplied a key. A null provider means the
 * InterrogationService falls back to the authored offline script.
 */
export function buildProvider(cfg: PlayerConfig = loadConfig()): LLMProvider | null {
  if (cfg.mode !== 'live') return null;
  if (!cfg.apiKey.trim() || !cfg.baseUrl.trim() || !cfg.model.trim()) return null;
  return new OpenAICompatibleProvider({
    baseUrl: cfg.baseUrl.trim(),
    apiKey: cfg.apiKey.trim(),
    model: cfg.model.trim(),
  });
}
