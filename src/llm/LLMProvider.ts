import type { ChatMessage } from '../data/types';

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/**
 * The single seam between the game and any chat LLM. Implement this once per
 * backend (OpenAI-compatible today; Anthropic / a local model tomorrow) and the
 * rest of the game never has to care which one is plugged in.
 */
export interface LLMProvider {
  readonly id: string;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
}
