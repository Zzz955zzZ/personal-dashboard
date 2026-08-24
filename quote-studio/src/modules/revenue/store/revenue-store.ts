/**
 * 收益 Pinia Store
 *
 * - useProjectsStore：项目 CRUD + 收益聚合 getter（依赖 useRevenueStore）。
 * - useRevenueStore：RevenueEntry upsert（报价确认时同步） + 聚合查询。
 *
 * 强约束 #4：仅「确认报价」触发 syncFromQuotation，草稿编辑不写入收益。
 */

import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { Project, ProjectRevenueSummary, RevenueEntry } from '../types';
import {
  loadProjectsState,
  loadRevenueState,
  normalizeProject,
  normalizeRevenueEntry,
  saveProjectsState,
  saveRevenueState,
} from './persistence';
import { genId, nowIso, str } from '@/shared/util';
import { syncPush } from '@/shared/sync';
import { notify } from '@/shared/notify';
// 仅类型导入，避免运行时循环依赖
import type { Quotation } from '@/modules/quotation';

/* ============================ 项目 Store ============================ */
export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([]);

  /* ---- 初始化（幂等）---- */
  let projectsHydrated = false;
  function hydrate(): void {
    if (projectsHydrated) return;
    projectsHydrated = true;
    const { found, state } = loadProjectsState();
    if (found) projects.value = state.projects;
  }

  function persist(): void {
    if (!saveProjectsState({ projects: projects.value })) {
      notify('error', '项目数据保存失败：本地存储不可用（可能磁盘已满或处于隐私模式）。');
    }
    void syncPush('projects', projects.value as unknown as Record<string, unknown>[]);
  }

  /* ---- CRUD ---- */
  function addProject(payload: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const now = nowIso();
    const project: Project = {
      id: genId('p'),
      projectNo: str(payload.projectNo).slice(0, 100),
      name: str(payload.name).slice(0, 200) || '未命名项目',
      clientName: str(payload.clientName),
      address: str(payload.address),
      status: payload.status,
      currency: payload.currency,
      coverUrl: str(payload.coverUrl),
      carpetaId: str(payload.carpetaId).slice(0, 60),
      createdAt: now,
      updatedAt: now,
    };
    projects.value.unshift(project);
    persist();
    return project;
  }

  function updateProject(id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>): boolean {
    const idx = projects.value.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    projects.value[idx] = { ...projects.value[idx], ...patch, updatedAt: nowIso() };
    persist();
    return true;
  }

  function removeProject(id: string): boolean {
    const idx = projects.value.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    projects.value.splice(idx, 1);
    useRevenueStore().removeByProject(id);
    persist();
    return true;
  }

  function getProject(id: string): Project | undefined {
    return projects.value.find((p) => p.id === id);
  }

  function findByName(name: string): Project | undefined {
    const n = name.trim();
    return projects.value.find((p) => (p.projectNo || p.name).trim() === n);
  }

  /* ---- 收益聚合（读取 useRevenueStore）---- */
  function aggregate(list: RevenueEntry[]): ProjectRevenueSummary {
    let totalSales = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let lastRecordedAt: string | null = null;
    for (const e of list) {
      totalSales += e.amount;
      totalCost += e.cost;
      totalProfit += e.margin;
      if (!lastRecordedAt || e.recordedAt > lastRecordedAt) lastRecordedAt = e.recordedAt;
    }
    return {
      projectId: list.length ? list[0].projectId : '',
      totalSales,
      totalCost,
      totalProfit,
      entryCount: list.length,
      lastRecordedAt,
    };
  }

  function projectRevenue(projectId: string): ProjectRevenueSummary {
    return aggregate(useRevenueStore().byProject(projectId));
  }

  const portfolioSummary = computed<ProjectRevenueSummary>(() =>
    aggregate(useRevenueStore().entries),
  );

  /* ---- 快照导入导出（DataModal 用）---- */
  function exportState() {
    return { projects: projects.value };
  }
  function importState(state: { projects?: unknown }): void {
    const arr = Array.isArray(state?.projects) ? (state.projects as unknown[]) : [];
    projects.value = arr
      .map((r) => normalizeProject(r))
      .filter((p): p is Project => p !== null);
    persist();
  }

  return {
    projects,
    hydrate,
    persist,
    addProject,
    updateProject,
    removeProject,
    getProject,
    findByName,
    projectRevenue,
    portfolioSummary,
    exportState,
    importState,
  };
});

/* ============================ 收益 Store ============================ */
export const useRevenueStore = defineStore('revenue', () => {
  const entries = ref<RevenueEntry[]>([]);

  let revenueHydrated = false;
  function hydrate(): void {
    if (revenueHydrated) return;
    revenueHydrated = true;
    const { found, state } = loadRevenueState();
    if (found) entries.value = state.entries;
  }

  function persist(): void {
    if (!saveRevenueState({ entries: entries.value })) {
      notify('error', '收益数据保存失败：本地存储不可用（可能磁盘已满或处于隐私模式）。');
    }
    void syncPush('revenue_entries', entries.value as unknown as Record<string, unknown>[]);
  }

  /** 报价确认时调用：生成 / 刷新该项目一条 RevenueEntry（强约束 #4）。 */
  function syncFromQuotation(q: Quotation): void {
    const idx = entries.value.findIndex((e) => e.linkedQuotationId === q.id);
    const entry: RevenueEntry = {
      id: idx >= 0 ? entries.value[idx].id : genId('rev'),
      projectId: q.projectId,
      source: 'quotation_confirmed',
      amount: q.totalAmount,
      cost: q.totalCost,
      margin: q.totalMargin,
      linkedQuotationId: q.id,
      recordedAt: new Date().toISOString(),
    };
    if (idx >= 0) entries.value[idx] = entry;
    else entries.value.push(entry);
    persist();
  }

  function removeByQuotation(quotationId: string): void {
    const before = entries.value.length;
    entries.value = entries.value.filter((e) => e.linkedQuotationId !== quotationId);
    if (entries.value.length !== before) persist();
  }

  function removeByProject(projectId: string): void {
    const before = entries.value.length;
    entries.value = entries.value.filter((e) => e.projectId !== projectId);
    if (entries.value.length !== before) persist();
  }

  function byProject(projectId: string): RevenueEntry[] {
    return entries.value.filter((e) => e.projectId === projectId);
  }

  function exportState() {
    return { entries: entries.value };
  }
  function importState(state: { entries?: unknown }): void {
    const arr = Array.isArray(state?.entries) ? (state.entries as unknown[]) : [];
    entries.value = arr
      .map((r) => normalizeRevenueEntry(r))
      .filter((e): e is RevenueEntry => e !== null);
    persist();
  }

  return {
    entries,
    hydrate,
    persist,
    syncFromQuotation,
    removeByQuotation,
    removeByProject,
    byProject,
    exportState,
    importState,
  };
});
