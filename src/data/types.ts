/**
 * Data model for a case file.
 *
 * Design note: the *conversation* is powered by a live LLM, but the *win
 * condition* is driven entirely by the authored data below — specifically by
 * `lieBreaks`. Presenting the right evidence to the right suspect breaks a
 * scripted "lie", and the game is solved by breaking enough of them. The LLM
 * never decides guilt, so the puzzle is always fair and solvable regardless of
 * which model the player plugs in (or whether they play fully offline).
 */

export type Role = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: Role;
  content: string;
}

/** A fact known from the crime scene, shown in the briefing. */
export interface Clue {
  id: string;
  name: string;
  detail: string;
}

/** A presentable item the player can "throw" at a suspect to break a lie. */
export interface Evidence {
  id: string;
  /** emoji used as a quick visual marker in the evidence chooser */
  icon: string;
  name: string;
  detail: string;
}

/**
 * Authored mapping: presenting `evidenceId` to `suspectId` breaks the lie
 * identified by `lieId`. This is the deterministic heart of the puzzle.
 */
export interface LieBreak {
  suspectId: string;
  evidenceId: string;
  lieId: string;
  /** shown to the player when the lie is broken */
  reveal: string;
}

/** Offline (no-API-key) script for a single suspect. */
export interface OfflineScript {
  /** first line spoken when the player opens the conversation */
  greeting: string;
  /** keyword-matched canned answers for free-text questions */
  rules: { keywords: string[]; reply: string }[];
  /** in-character reaction when the player presents a given evidence id */
  evidenceReplies: Record<string, string>;
  /** said when nothing matches */
  fallback: string;
}

export interface Suspect {
  id: string;
  name: string;
  role: string;
  /** initial shown inside the round avatar */
  initial: string;
  /** hex color used for the avatar / portrait / tab swatch */
  color: string;
  /** one-line public description shown in the briefing roster */
  publicInfo: string;
  isCulprit: boolean;
  /** hidden system prompt that drives the live LLM persona */
  systemPrompt: string;
  /** fallback used when no API key is configured */
  offline: OfflineScript;
}

export interface CaseData {
  id: string;
  title: string;
  victim: string;
  /** short atmospheric setup shown on the briefing screen */
  synopsis: string;
  /** longer case-file briefing text */
  briefing: string;
  clues: Clue[];
  evidence: Evidence[];
  suspects: Suspect[];
  culpritId: string;
  lieBreaks: LieBreak[];
  /** how many distinct lies must be broken before an accusation can convict */
  requiredBreaks: number;
  /** full reveal shown on the verdict screen */
  solution: string;
}
