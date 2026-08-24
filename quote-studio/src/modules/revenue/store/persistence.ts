/**
 * 收益模块持久化层（独立 key：qs_projects_v1 / qs_revenue_v1）。
 * 提供 isRecord + normalize* 守卫（类型 / 范围校验、默认值兜底），load / save 可注入 storage 便于测试。
 */

import type {
  Project,
  ProjectStatus,
  ProjectsPersistedState,
  RevenueEntry,
  RevenuePersistedState,
} from '../types';
import { PROJECTS_DB_KEY, REVENUE_DB_KEY } from '../constants';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, maxLen = 4000): string {
  if (typeof v === 'string') return v.slice(0, maxLen);
  if (v === null || v === undefined) return '';
  return String(v).slice(0, maxLen);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const VALID_STATUS: ProjectStatus[] = ['active', 'completed', 'archived'];

export function normalizeProject(raw: unknown): Project | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  const name = str(raw.name).slice(0, 200);
  const projectNo = str(raw.projectNo).slice(0, 100);
  return {
    id: raw.id,
    projectNo: projectNo || name || '未命名项目',
    name: projectNo || name || '未命名项目',
    clientName: str(raw.clientName).slice(0, 200),
    address: str(raw.address).slice(0, 500),
    status: VALID_STATUS.includes(raw.status as ProjectStatus)
      ? (raw.status as ProjectStatus)
      : 'active',
    currency: raw.currency === 'EUR' ? 'EUR' : 'EUR',
    coverUrl: str(raw.coverUrl).slice(0, 2000),
    carpetaId: str(raw.carpetaId).slice(0, 60),
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
  };
}

export function normalizeRevenueEntry(raw: unknown): RevenueEntry | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  return {
    id: raw.id,
    projectId: str(raw.projectId),
    source: str(raw.source).slice(0, 100) || 'quotation_confirmed',
    amount: num(raw.amount),
    cost: num(raw.cost),
    margin: num(raw.margin),
    linkedQuotationId: str(raw.linkedQuotationId),
    recordedAt: str(raw.recordedAt),
  };
}

export interface ProjectsLoadResult {
  found: boolean;
  state: ProjectsPersistedState;
}

export function loadProjectsState(
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): ProjectsLoadResult {
  if (!storage) return { found: false, state: { projects: [] } };
  let raw: string | null = null;
  try {
    raw = storage.getItem(PROJECTS_DB_KEY);
  } catch {
    return { found: false, state: { projects: [] } };
  }
  if (!raw) return { found: false, state: { projects: [] } };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { found: false, state: { projects: [] } };
  }
  if (!isRecord(parsed)) return { found: false, state: { projects: [] } };
  const projects = Array.isArray(parsed.projects)
    ? parsed.projects.map(normalizeProject).filter((p): p is Project => p !== null)
    : [];
  return { found: true, state: { projects } };
}

export function saveProjectsState(
  state: ProjectsPersistedState,
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PROJECTS_DB_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export interface RevenueLoadResult {
  found: boolean;
  state: RevenuePersistedState;
}

export function loadRevenueState(
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): RevenueLoadResult {
  if (!storage) return { found: false, state: { entries: [] } };
  let raw: string | null = null;
  try {
    raw = storage.getItem(REVENUE_DB_KEY);
  } catch {
    return { found: false, state: { entries: [] } };
  }
  if (!raw) return { found: false, state: { entries: [] } };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { found: false, state: { entries: [] } };
  }
  if (!isRecord(parsed)) return { found: false, state: { entries: [] } };
  const entries = Array.isArray(parsed.entries)
    ? parsed.entries.map(normalizeRevenueEntry).filter((e): e is RevenueEntry => e !== null)
    : [];
  return { found: true, state: { entries } };
}

export function saveRevenueState(
  state: RevenuePersistedState,
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(REVENUE_DB_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
