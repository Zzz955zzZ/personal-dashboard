/**
 * 记账模块持久化层
 *
 * 独立 key: pdash_finance_v1
 */

import type { FinancePersistedState, Transaction } from '../types';
import { FINANCE_DB_KEY } from '../constants';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeTxn(raw: unknown): Transaction | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'number') return null;

  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const validTypes: Transaction['type'][] = ['expense', 'income'];
  return {
    id: raw.id,
    type: validTypes.includes(raw.type as Transaction['type'])
      ? (raw.type as Transaction['type'])
      : 'expense',
    amount: Math.max(0, num(raw.amount)),
    category: str(raw.category) || 'other_expense',
    description: str(raw.description).slice(0, 200),
    date: str(raw.date),
    createdAt: str(raw.createdAt),
  };
}

export interface FinanceLoadResult {
  found: boolean;
  state: FinancePersistedState;
}

export function loadFinanceState(
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): FinanceLoadResult {
  if (!storage) return { found: false, state: { transactions: [], nextId: 1 } };

  let raw: string | null = null;
  try {
    raw = storage.getItem(FINANCE_DB_KEY);
  } catch {
    return { found: false, state: { transactions: [], nextId: 1 } };
  }
  if (!raw) return { found: false, state: { transactions: [], nextId: 1 } };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { found: false, state: { transactions: [], nextId: 1 } };
  }
  if (!isRecord(parsed)) return { found: false, state: { transactions: [], nextId: 1 } };

  const txns = Array.isArray(parsed.transactions)
    ? parsed.transactions.map(normalizeTxn).filter((t): t is Transaction => t !== null)
    : [];
  const nextId =
    typeof parsed.nextId === 'number' && parsed.nextId > 0 ? parsed.nextId : 1;

  return { found: true, state: { transactions: txns, nextId } };
}

export function saveFinanceState(
  state: FinancePersistedState,
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(FINANCE_DB_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
