/**
 * 报价模块持久化层（独立 key：qs_quotation_v1）。
 * 提供 isRecord + normalize* 守卫；normalizeQuoteItem 顺手按规则重算
 * salePrice/lineTotal，保证落盘数据自洽。load / save 可注入 storage 便于测试。
 */

import type { Quotation, QuoteItem, QuotationPersistedState } from '../types';
import { QUOTATION_DB_KEY, DEFAULT_QUOTATION_TITLE } from '../constants';
import { DEFAULT_SETTINGS } from '@/modules/settings/constants';

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

function arrOfStr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x, 4000)).filter(Boolean);
}

export function normalizeQuoteItem(raw: unknown): QuoteItem | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  const cost = num(raw.cost);
  const margin = num(raw.margin);
  const quantity = num(raw.quantity) || 1;
  const salePriceInput = num(raw.salePrice);
  // 优先以直接录入的售价为准；未录入时沿用旧 cost+margin 模型
  const salePrice = salePriceInput > 0 ? salePriceInput : cost + margin;
  const dtoPct = num(raw.dtoPct);
  const ivaPct = num(raw.ivaPct) > 0 ? num(raw.ivaPct) : 21;

  // 兼容旧单图字段 photoUrl → photoUrls
  let photoUrls = arrOfStr(raw.photoUrls);
  if (photoUrls.length === 0) {
    const legacy = str(raw.photoUrl, 4000);
    if (legacy) photoUrls = [legacy];
  }

  return {
    id: raw.id,
    quotationId: str(raw.quotationId),
    categoryGroupId: str(raw.categoryGroupId),
    name: str(raw.name, 300) || '未命名产品',
    nameEs: str(raw.nameEs, 300),
    model: str(raw.model, 300),
    photoUrls,
    customerNote: str(raw.customerNote, 2000),
    internalNote: str(raw.internalNote, 2000),
    cost,
    margin: salePrice - cost,
    salePrice,
    quantity,
    unit: str(raw.unit, 20) || DEFAULT_SETTINGS.defaultUnit,
    salePriceUnit: str(raw.salePriceUnit, 20),
    dtoPct,
    ivaPct,
    lineTotal: salePrice * quantity,
    statusId: str(raw.statusId, 60),
  };
}

export function normalizeQuotation(raw: unknown): Quotation | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeQuoteItem).filter((i): i is QuoteItem => i !== null)
    : [];
  let totalAmount = 0;
  let totalCost = 0;
  let totalMargin = 0;
  for (const it of items) {
    totalAmount += it.lineTotal;
    totalCost += it.cost * it.quantity;
    totalMargin += it.margin * it.quantity;
  }
  const includedGroupIds = Array.isArray(raw.includedGroupIds)
    ? raw.includedGroupIds.filter((id): id is string => typeof id === 'string')
    : items.map((it) => it.categoryGroupId).filter((v, i, a) => a.indexOf(v) === i);
  // 旧数据 includedSubCategoryIds 已废弃，直接忽略
  const status = raw.status === 'confirmed' ? 'confirmed' : 'draft';
  const vatRate = num(raw.vatRate);
  const validityDays = num(raw.validityDays);
  return {
    id: raw.id,
    projectId: str(raw.projectId),
    title: str(raw.title, 200) || DEFAULT_QUOTATION_TITLE,
    status,
    confirmedAt: raw.status === 'confirmed' ? str(raw.confirmedAt) : null,
    quoteNumber: str(raw.quoteNumber, 100),
    vatRate: vatRate > 0 ? vatRate : 21,
    validityDays: validityDays > 0 ? validityDays : 30,
    notes: str(raw.notes, 4000),
    projectNo: str(raw.projectNo, 100),
    clientName: str(raw.clientName, 300),
    address: str(raw.address, 500),
    totalAmount,
    totalCost,
    totalMargin,
    includedGroupIds,
    items,
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
  };
}

export interface QuotationLoadResult {
  found: boolean;
  state: QuotationPersistedState;
}

export function loadQuotationState(
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): QuotationLoadResult {
  if (!storage) return { found: false, state: { quotations: [] } };
  let raw: string | null = null;
  try {
    raw = storage.getItem(QUOTATION_DB_KEY);
  } catch {
    return { found: false, state: { quotations: [] } };
  }
  if (!raw) return { found: false, state: { quotations: [] } };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { found: false, state: { quotations: [] } };
  }
  if (!isRecord(parsed)) return { found: false, state: { quotations: [] } };
  const quotations = Array.isArray(parsed.quotations)
    ? parsed.quotations.map(normalizeQuotation).filter((q): q is Quotation => q !== null)
    : [];
  return { found: true, state: { quotations } };
}

export function saveQuotationState(
  state: QuotationPersistedState,
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(QUOTATION_DB_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
