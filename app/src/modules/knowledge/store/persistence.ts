/**
 * 知识库 + 日记 持久化层
 *
 * 独立 key: pdash_knowledge_v1
 */

import type { DiaryEntry, KnowledgeItem, KnowledgePersistedState } from '../types';
import { KNOWLEDGE_DB_KEY } from '../constants';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
const bool = (v: unknown): boolean => !!v;

function normalizeKnowledge(raw: unknown): KnowledgeItem | null {
  if (!isRecord(raw) || typeof raw.id !== 'number') return null;
  const validStatuses: KnowledgeItem['status'][] = ['active', 'archived'];
  const validSources: KnowledgeItem['sourceType'][] = ['link', 'text', 'video'];

  return {
    id: raw.id,
    title: str(raw.title).slice(0, 300),
    url: str(raw.url),
    summary: str(raw.summary).slice(0, 500),
    keyPoints: arr(raw.keyPoints).map((s) => s.slice(0, 200)),
    content: str(raw.content).slice(0, 10000),
    domain: str(raw.domain) || 'other',
    tags: arr(raw.tags),
    starred: bool(raw.starred),
    status: validStatuses.includes(raw.status as KnowledgeItem['status'])
      ? (raw.status as KnowledgeItem['status'])
      : 'active',
    sourceType: validSources.includes(raw.sourceType as KnowledgeItem['sourceType'])
      ? (raw.sourceType as KnowledgeItem['sourceType'])
      : 'text',
    reviewedAt: str(raw.reviewedAt),
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
  };
}

function normalizeDiary(raw: unknown): DiaryEntry | null {
  if (!isRecord(raw) || typeof raw.id !== 'number') return null;
  const VALID_MOODS = ['great', 'good', 'okay', 'meh', 'bad'] as const;
  const rawMood = String(raw.mood ?? '');
  const safeMood = VALID_MOODS.includes(rawMood as any) ? rawMood : 'okay';

  return {
    id: raw.id,
    date: str(raw.date),
    mood: safeMood as DiaryEntry['mood'],
    content: str(raw.content).slice(0, 5000),
    gratitude: str(raw.gratitude).slice(0, 300),
    todoSummary: str(raw.todoSummary).slice(0, 500),
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
  };
}

export interface KnowledgeLoadResult {
  found: boolean;
  state: KnowledgePersistedState;
}

export function loadKnowledgeState(
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): KnowledgeLoadResult {
  if (!storage) return { found: false, state: { knowledge: [], diaries: [], nextKid: 1, nextDid: 1 } };

  let raw: string | null = null;
  try {
    raw = storage.getItem(KNOWLEDGE_DB_KEY);
  } catch {
    return { found: false, state: { knowledge: [], diaries: [], nextKid: 1, nextDid: 1 } };
  }
  if (!raw) return { found: false, state: { knowledge: [], diaries: [], nextKid: 1, nextDid: 1 } };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { found: false, state: { knowledge: [], diaries: [], nextKid: 1, nextDid: 1 } };
  }
  if (!isRecord(parsed)) return { found: false, state: { knowledge: [], diaries: [], nextKid: 1, nextDid: 1 } };

  const knowledge = Array.isArray(parsed.knowledge)
    ? parsed.knowledge.map(normalizeKnowledge).filter((k): k is KnowledgeItem => k !== null)
    : [];
  const diaries = Array.isArray(parsed.diaries)
    ? parsed.diaries.map(normalizeDiary).filter((d): d is DiaryEntry => d !== null)
    : [];

  return {
    found: true,
    state: {
      knowledge,
      diaries,
      nextKid: typeof parsed.nextKid === 'number' && parsed.nextKid > 0 ? parsed.nextKid : 1,
      nextDid: typeof parsed.nextDid === 'number' && parsed.nextDid > 0 ? parsed.nextDid : 1,
    },
  };
}

export function saveKnowledgeState(
  state: KnowledgePersistedState,
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(KNOWLEDGE_DB_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
