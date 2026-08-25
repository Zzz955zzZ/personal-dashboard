/**
 * 报价 Pinia Store
 *
 * 核心计算（强约束 #1/#2/#3）：recalc() 计算 salePrice=cost+margin、lineTotal=
 * salePrice*qty、以及 totalAmount/totalCost/totalMargin 汇总。
 *
 * 强约束 #4：仅 confirmQuotation() 触发收益同步（syncFromQuotation）；草稿编辑不写收益。
 */

import { ref } from 'vue';
import { defineStore } from 'pinia';

import type { Quotation, QuoteItem, QuotationStatus } from '../types';
import type { ProductTemplate } from '@/modules/settings';
import { DEFAULT_QUOTATION_TITLE } from '../constants';
import { useSettingsStore } from '@/modules/settings';
import { useProjectsStore } from '@/modules/revenue';
import {
  loadQuotationState,
  normalizeQuotation,
  saveQuotationState,
} from './persistence';
import { genId, nowIso } from '@/shared/util';
import { syncPush } from '@/shared/sync';
import { notify } from '@/shared/notify';
import { useRevenueStore } from '@/modules/revenue';

/** 重算单个报价：margin / lineTotal / 整单汇总（强约束 #1/#2/#3）。
 *  新模型：售价直接录入，利润 = 售价 - 成本（自动）。
 */
export function recalc(q: Quotation): void {
  let totalAmount = 0;
  let totalCost = 0;
  let totalMargin = 0;
  for (const it of q.items) {
    const cost = Number.isFinite(Number(it.cost)) ? Number(it.cost) : 0;
    const rawSalePrice = Number(it.salePrice);
    const salePriceInput = Number.isFinite(rawSalePrice) ? rawSalePrice : 0;
    const oldMargin = Number.isFinite(Number(it.margin)) ? Number(it.margin) : 0;
    const quantity = Number.isFinite(Number(it.quantity)) ? Number(it.quantity) : 0;
    it.cost = cost;
    it.quantity = quantity;
    // 优先以直接录入的售价为准；未录入时沿用旧 cost+margin 模型
    if (salePriceInput > 0) {
      it.salePrice = salePriceInput;
      it.margin = salePriceInput - cost;
    } else {
      it.margin = oldMargin;
      it.salePrice = cost + oldMargin;
    }
    it.lineTotal = it.salePrice * quantity;
    totalAmount += it.lineTotal;
    totalCost += cost * quantity;
    totalMargin += it.margin * quantity;
  }
  q.totalAmount = totalAmount;
  q.totalCost = totalCost;
  q.totalMargin = totalMargin;
  q.updatedAt = nowIso();
}

export const useQuotationStore = defineStore('quotation', () => {
  const quotations = ref<Quotation[]>([]);
  const settings = useSettingsStore();

  /* ---- 初始化（幂等：仅首次从存储读取，避免 App.hydrateAll + 视图 onMounted 重复注水）---- */
  let hydrated = false;
  function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    const { found, state } = loadQuotationState();
    if (found) quotations.value = state.quotations;
    sortAllIncludedGroupIds();
  }

  function sortIncludedGroupIds(q: Quotation): void {
    if (settings.categoryGroups.length === 0) return;
    const orderMap = new Map(settings.categoryGroups.map((g) => [g.id, g.order]));
    q.includedGroupIds.sort((a, b) => (orderMap.get(a) ?? Infinity) - (orderMap.get(b) ?? Infinity));
  }

  function sortAllIncludedGroupIds(): void {
    for (const q of quotations.value) sortIncludedGroupIds(q);
  }

  function persist(): void {
    if (!saveQuotationState({ quotations: quotations.value })) {
      notify('error', '报价数据保存失败：本地存储不可用（可能磁盘已满或处于隐私模式）。');
    }
    void syncPush('quotations', quotations.value as unknown as Record<string, unknown>[]);
    const items: Record<string, unknown>[] = [];
    for (const q of quotations.value) for (const it of q.items) items.push(it as unknown as Record<string, unknown>);
    void syncPush('quote_items', items);
  }

  /* ---- MVP 每项目 1 单 ---- */
  function getOrCreate(projectId: string): Quotation {
    const existing = quotations.value.find((q) => q.projectId === projectId);
    if (existing) return existing;
    const now = nowIso();
    const dateSuffix = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const proj = useProjectsStore().getProject(projectId);
    const q: Quotation = {
      id: genId('q'),
      projectId,
      title: DEFAULT_QUOTATION_TITLE,
      status: 'draft',
      confirmedAt: null,
      quoteNumber: `PRES-${dateSuffix}-001`,
      vatRate: settings.settings.defaultVatRate || 21,
      validityDays: settings.settings.defaultValidityDays || 30,
      notes: '',
      totalAmount: 0,
      totalCost: 0,
      totalMargin: 0,
      includedGroupIds: [],
      items: [],
      projectNo: proj?.projectNo ?? '',
      clientName: proj?.clientName ?? '',
      address: proj?.address ?? '',
      createdAt: now,
      updatedAt: now,
    };
    quotations.value.unshift(q);
    persist();
    return q;
  }

  function getQuotation(projectId: string): Quotation | undefined {
    return quotations.value.find((q) => q.projectId === projectId);
  }

  function patchQuotation(qid: string, patch: Partial<Quotation>): void {
    const q = quotations.value.find((x) => x.id === qid);
    if (!q) return;
    Object.assign(q, patch, { updatedAt: nowIso() });
    persist();
  }

  /* ---- 包含分类管理 ---- */
  function includeGroup(qid: string, groupId: string, shouldPersist = true): void {
    const q = quotations.value.find((x) => x.id === qid);
    if (!q || !groupId) return;
    if (!q.includedGroupIds.includes(groupId)) {
      q.includedGroupIds.push(groupId);
      sortIncludedGroupIds(q);
      q.updatedAt = nowIso();
      if (shouldPersist) persist();
    }
  }

  function excludeGroup(qid: string, groupId: string): void {
    const q = quotations.value.find((x) => x.id === qid);
    if (!q || !groupId) return;
    q.includedGroupIds = q.includedGroupIds.filter((id) => id !== groupId);
    q.items = q.items.filter((it) => it.categoryGroupId !== groupId);
    recalc(q);
    persist();
  }

  /* ---- 产品行 CRUD ---- */
  function addItem(qid: string, item: Omit<QuoteItem, 'id' | 'lineTotal' | 'quotationId'>): void {
    const q = quotations.value.find((x) => x.id === qid);
    if (!q) return;
    const ivaPct = Number(item.ivaPct) > 0 ? Number(item.ivaPct) : q.vatRate || 21;
    const dtoPct = Number(item.dtoPct) || 0;
    const full: QuoteItem = {
      ...item,
      links: Array.isArray(item.links) ? item.links.filter(Boolean) : [],
      id: genId('qi'),
      quotationId: qid,
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      salePriceUnit: item.salePriceUnit || settings.settings.defaultSalePriceUnit || settings.settings.defaultUnit,
      ivaPct,
      dtoPct,
      lineTotal: 0,
    };
    q.items.push(full);
    includeGroup(qid, full.categoryGroupId, false);
    recalc(q);
    persist();
  }

  function updateItem(qid: string, itemId: string, patch: Partial<QuoteItem>): void {
    const q = quotations.value.find((x) => x.id === qid);
    if (!q) return;
    const idx = q.items.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    q.items[idx] = { ...q.items[idx], ...patch };
    if (patch.categoryGroupId) includeGroup(qid, patch.categoryGroupId, false);
    recalc(q);
    persist();
  }

  function removeItem(qid: string, itemId: string): void {
    const q = quotations.value.find((x) => x.id === qid);
    if (!q) return;
    const idx = q.items.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    q.items.splice(idx, 1);
    recalc(q);
    persist();
  }

  function removeByProjectId(projectId: string): void {
    const before = quotations.value.length;
    quotations.value = quotations.value.filter((q) => q.projectId !== projectId);
    if (quotations.value.length !== before) persist();
  }

  /* ---- 产品行：从产品模板批量插入 ---- */
  function addItemsFromTemplates(qid: string, groupId: string, templates: ProductTemplate[]): void {
    const q = quotations.value.find((x) => x.id === qid);
    if (!q || templates.length === 0) return;
    for (const t of templates) {
      q.items.push({
        id: genId('qi'),
        quotationId: qid,
        categoryGroupId: groupId,
        name: t.name,
        nameEs: t.nameEs,
        model: t.model,
        photoUrls: t.photoUrls || [],
        customerNote: t.note,
        links: Array.isArray(t.links) ? t.links.filter(Boolean) : [],
        internalNote: '',
        cost: Number(t.defaultCost) || 0,
        margin: 0,
        salePrice: Number(t.defaultSalePrice) || 0,
        quantity: 1,
        unit: t.defaultUnit || settings.settings.defaultUnit,
        salePriceUnit: settings.settings.defaultSalePriceUnit || settings.settings.defaultUnit,
        dtoPct: 0,
        ivaPct: settings.settings.defaultVatRate || 21,
        lineTotal: 0,
        statusId: '',
      });
    }
    includeGroup(qid, groupId, false);
    recalc(q);
    persist();
  }

  /** 导入用：按 id upsert 整行（含 salePrice/lineTotal 由 recalc 兜底）。 */
  function upsertItem(qid: string, item: QuoteItem): void {
    const q = quotations.value.find((x) => x.id === qid);
    if (!q) return;
    const idx = q.items.findIndex((i) => i.id === item.id);
    if (idx >= 0) q.items[idx] = item;
    else q.items.push(item);
    recalc(q);
    persist();
  }

  /* ---- 确认即同步（强约束 #4）---- */
  function confirmQuotation(qid: string): void {
    const q = quotations.value.find((x) => x.id === qid);
    if (!q) return;
    recalc(q);
    q.status = 'confirmed' as QuotationStatus;
    q.confirmedAt = nowIso();
    persist();
    // 仅「确认」动作触发收益同步；草稿编辑不调用
    useRevenueStore().syncFromQuotation(q);
  }

  function unconfirmQuotation(qid: string): void {
    const q = quotations.value.find((x) => x.id === qid);
    if (!q) return;
    q.status = 'draft';
    q.confirmedAt = null;
    persist();
    useRevenueStore().removeByQuotation(q.id);
  }

  /* ---- 快照导入导出（DataModal 用）---- */
  function exportState() {
    return { quotations: quotations.value };
  }
  function importState(state: { quotations?: unknown }): void {
    const arr = Array.isArray(state?.quotations) ? (state.quotations as unknown[]) : [];
    quotations.value = arr
      .map((r) => normalizeQuotation(r))
      .filter((q): q is Quotation => q !== null);
    for (const q of quotations.value) {
      recalc(q);
      sortIncludedGroupIds(q);
    }
    persist();
  }

  return {
    quotations,
    hydrate,
    persist,
    getOrCreate,
    getQuotation,
    patchQuotation,
    includeGroup,
    excludeGroup,
    addItem,
    updateItem,
    removeItem,
    removeByProjectId,
    upsertItem,
    sortAllIncludedGroupIds,
    addItemsFromTemplates,
    confirmQuotation,
    unconfirmQuotation,
    recalc,
    exportState,
    importState,
  };
});
