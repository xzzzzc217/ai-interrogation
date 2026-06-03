import type { CaseData, ChatMessage, Evidence, Suspect } from '../data/types';
import { InterrogationService } from '../llm/InterrogationService';
import { buildProvider } from '../config/Settings';

export interface PresentResult {
  broke: boolean;
  alreadyBroken?: boolean;
  lieId?: string;
  reveal?: string;
}

export type Outcome = 'convicted' | 'insufficient' | 'wrong';

export interface Verdict {
  outcome: Outcome;
  accusedId: string;
  correct: boolean;
  brokenCount: number;
  required: number;
}

/**
 * Single source of truth for an in-progress investigation. Holds per-suspect
 * chat history, which authored "lies" have been broken, and resolves the
 * accusation. Deliberately framework-free so any scene can read/mutate it.
 */
class GameStateClass {
  case!: CaseData;
  service!: InterrogationService;
  histories: Record<string, ChatMessage[]> = {};
  brokenLies = new Set<string>();
  private presentedPairs = new Set<string>();
  currentSuspectId = '';
  turns = 0;

  startCase(c: CaseData): void {
    this.case = c;
    this.histories = {};
    for (const s of c.suspects) this.histories[s.id] = [];
    this.brokenLies.clear();
    this.presentedPairs.clear();
    this.currentSuspectId = c.suspects[0].id;
    this.turns = 0;
    this.refreshService();
  }

  /** Rebuild the interrogation service from the latest saved config (called
   *  when entering the interrogation, after the player may have toggled
   *  offline/live in settings). */
  refreshService(): void {
    this.service = new InterrogationService(buildProvider());
  }

  get suspects(): Suspect[] {
    return this.case.suspects;
  }
  suspect(id: string): Suspect {
    return this.case.suspects.find((s) => s.id === id)!;
  }
  get current(): Suspect {
    return this.suspect(this.currentSuspectId);
  }
  history(id: string = this.currentSuspectId): ChatMessage[] {
    return this.histories[id];
  }

  pushUser(text: string, id: string = this.currentSuspectId): void {
    this.histories[id].push({ role: 'user', content: text });
  }
  pushAssistant(text: string, id: string = this.currentSuspectId): void {
    this.histories[id].push({ role: 'assistant', content: text });
  }

  /** Resolve whether presenting `evidence` to a suspect breaks an authored lie. */
  resolvePresent(suspectId: string, evidence: Evidence): PresentResult {
    const lb = this.case.lieBreaks.find(
      (b) => b.suspectId === suspectId && b.evidenceId === evidence.id,
    );
    if (!lb) return { broke: false };
    const pairKey = `${suspectId}:${evidence.id}`;
    if (this.presentedPairs.has(pairKey) || this.brokenLies.has(lb.lieId)) {
      return { broke: false, alreadyBroken: true, lieId: lb.lieId, reveal: lb.reveal };
    }
    this.presentedPairs.add(pairKey);
    this.brokenLies.add(lb.lieId);
    return { broke: true, lieId: lb.lieId, reveal: lb.reveal };
  }

  get brokenCount(): number {
    return this.brokenLies.size;
  }

  accuse(accusedId: string): Verdict {
    const correct = accusedId === this.case.culpritId;
    const brokenCount = this.brokenLies.size;
    const required = this.case.requiredBreaks;
    let outcome: Outcome;
    if (correct && brokenCount >= required) outcome = 'convicted';
    else if (correct) outcome = 'insufficient';
    else outcome = 'wrong';
    return { outcome, accusedId, correct, brokenCount, required };
  }
}

export const GameState = new GameStateClass();
