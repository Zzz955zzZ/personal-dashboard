/**
 * 四象限待办持久化层
 *
 * 独立 localStorage key (pdash_todo_v1)，不与饮食模块共享。
 */

import type { TodoPersistedState, TodoTask } from '../types';
import { TODO_DB_KEY } from '../constants';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeTask(raw: unknown): TodoTask | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'number' || typeof raw.title !== 'string') return null;

  const str = (v: unknown): string => (typeof v === 'string' ? v : '');

  const validQuadrants: TodoTask['quadrant'][] = ['Q1', 'Q2', 'Q3', 'Q4'];
  const validDomains: TodoTask['domain'][] = ['work', 'personal'];
  const validStatus: TodoTask['status'][] = ['active', 'completed', 'archived'];

  return {
    id: raw.id,
    title: raw.title.slice(0, 200),
    description: str(raw.description).slice(0, 2000),
    quadrant: validQuadrants.includes(raw.quadrant as TodoTask['quadrant'])
      ? (raw.quadrant as TodoTask['quadrant'])
      : 'Q1',
    domain: validDomains.includes(raw.domain as TodoTask['domain'])
      ? (raw.domain as TodoTask['domain'])
      : 'personal',
    priority: ['high', 'medium', 'low'].includes(raw.priority as string)
      ? (raw.priority as TodoTask['priority'])
      : 'medium',
    status: validStatus.includes(raw.status as TodoTask['status'])
      ? (raw.status as TodoTask['status'])
      : 'active',
    horizon: ['day', 'week', 'month', 'year'].includes(raw.horizon as string)
      ? (raw.horizon as TodoTask['horizon'])
      : 'week',
    completedAt: str(raw.completedAt),
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
  };
}

export interface TodoLoadResult {
  found: boolean;
  state: TodoPersistedState;
}

export function loadTodoState(
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): TodoLoadResult {
  if (!storage) return { found: false, state: { tasks: [], nextId: 1 } };

  let raw: string | null = null;
  try {
    raw = storage.getItem(TODO_DB_KEY);
  } catch {
    return { found: false, state: { tasks: [], nextId: 1 } };
  }
  if (!raw) return { found: false, state: { tasks: [], nextId: 1 } };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { found: false, state: { tasks: [], nextId: 1 } };
  }
  if (!isRecord(parsed)) return { found: false, state: { tasks: [], nextId: 1 } };

  const tasks = Array.isArray(parsed.tasks)
    ? parsed.tasks.map(normalizeTask).filter((t): t is TodoTask => t !== null)
    : [];
  const nextId =
    typeof parsed.nextId === 'number' && parsed.nextId > 0 ? parsed.nextId : 1;

  return { found: true, state: { tasks, nextId } };
}

export function saveTodoState(
  state: TodoPersistedState,
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(TODO_DB_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
