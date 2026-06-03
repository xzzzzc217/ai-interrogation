import type { ChatMessage } from '../data/types';
import type { ChatOptions, LLMProvider } from './LLMProvider';

export interface OpenAIConfig {
  /** e.g. https://api.openai.com/v1  /  https://api.deepseek.com/v1 */
  baseUrl: string;
  apiKey: string;
  /** e.g. gpt-4o-mini / deepseek-chat / moonshot-v1-8k */
  model: string;
}

/**
 * Talks to any OpenAI-compatible `/chat/completions` endpoint straight from the
 * browser using the player's own key (BYOK). No backend, no secrets in the
 * repo. Works with OpenAI, DeepSeek, Moonshot/Kimi, local servers (Ollama,
 * LM Studio, vLLM), etc.
 *
 * Note on CORS: most hosted providers (OpenAI, DeepSeek, …) return permissive
 * CORS headers and work directly. A few proxies do not — in that case the
 * player can run a local model or a tiny proxy (see docs). The game's offline
 * mode guarantees it is always playable regardless.
 */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly id = 'openai-compatible';

  constructor(private cfg: OpenAIConfig) {}

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    const url = this.cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: this.cfg.model,
          messages,
          temperature: opts.temperature ?? 0.85,
          max_tokens: opts.maxTokens ?? 320,
        }),
        signal: opts.signal,
      });
    } catch (err) {
      // Network / CORS failures land here with an opaque "Failed to fetch".
      throw new Error(
        '无法连接到模型服务（可能是网络、Base URL 或 CORS 问题）。可在设置中切换为离线试玩模式。\n' +
          `原始错误：${(err as Error).message}`,
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`模型返回错误 ${res.status}：${text.slice(0, 300)}`);
    }

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('模型返回了空内容，请检查模型名是否正确。');
    }
    return content.trim();
  }
}
