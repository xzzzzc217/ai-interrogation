import type { ChatMessage, Evidence, Suspect } from '../data/types';
import type { LLMProvider } from './LLMProvider';

const MAX_HISTORY = 16; // cap context sent to the model to keep calls cheap

/**
 * Orchestrates a single interrogation turn. With a live provider it composes
 * `[system persona, …history, user]` and calls the model; with no provider it
 * falls back to the suspect's authored offline script. Either way the caller
 * gets a plain string reply, so the UI is identical online and offline.
 */
export class InterrogationService {
  constructor(private provider: LLMProvider | null) {}

  get isLive(): boolean {
    return this.provider !== null;
  }

  /** Free-text question → suspect reply. */
  async ask(suspect: Suspect, history: ChatMessage[], playerText: string): Promise<string> {
    if (!this.provider) {
      return matchOffline(suspect, playerText);
    }
    const messages: ChatMessage[] = [
      { role: 'system', content: suspect.systemPrompt },
      ...history.slice(-MAX_HISTORY),
      { role: 'user', content: playerText },
    ];
    return this.provider.chat(messages, { temperature: 0.85, maxTokens: 320 });
  }

  /** Player slams a piece of evidence on the table → in-character reaction. */
  async reactToEvidence(
    suspect: Suspect,
    history: ChatMessage[],
    evidence: Evidence,
  ): Promise<string> {
    if (!this.provider) {
      return (
        suspect.offline.evidenceReplies[evidence.id] ??
        '（对方瞥了一眼）这……这能说明什么？跟我有什么关系。'
      );
    }
    const presented =
      `【侦探向你出示了一项证据】\n「${evidence.name}」：${evidence.detail}\n` +
      `请严格以你的角色身份，对这项证据做出即时、符合性格的反应（2-4 句，中文）。` +
      `不要跳出角色，不要承认你不知道的事，也不要主动招供你没被铁证逼到墙角的罪行。`;
    const messages: ChatMessage[] = [
      { role: 'system', content: suspect.systemPrompt },
      ...history.slice(-MAX_HISTORY),
      { role: 'user', content: presented },
    ];
    return this.provider.chat(messages, { temperature: 0.8, maxTokens: 320 });
  }
}

function matchOffline(suspect: Suspect, text: string): string {
  const t = text.toLowerCase();
  for (const rule of suspect.offline.rules) {
    if (rule.keywords.some((k) => t.includes(k.toLowerCase()))) {
      return rule.reply;
    }
  }
  return suspect.offline.fallback;
}
