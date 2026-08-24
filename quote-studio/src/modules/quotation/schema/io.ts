/**
 * 报价单 Excel 导入/导出（基于已依赖的 xlsx / SheetJS）。
 * 导出：当前报价 → .xlsx（浏览器直接下载）。
 * 导入：.xlsx/.xls/.csv → QuoteItem[]（按表头匹配，找不到则按列序兜底）。
 */

import * as XLSX from 'xlsx';
import type { Quotation, QuoteItem } from '../types';
import type { CategoryGroup, ProductStatusOption } from '@/modules/settings';
import {
  QUOTE_EXCEL_COLUMNS,
  buildRowContext,
  itemToRow,
  rowToBaseItem,
  type QuoteItemRow,
} from './canonical';

function rowsToAoa(rows: QuoteItemRow[]): (string | number)[][] {
  const headers = QUOTE_EXCEL_COLUMNS.map((c) => c.header);
  const body = rows.map((r) => QUOTE_EXCEL_COLUMNS.map((c) => (r[c.key] ?? '') as string | number));
  return [headers, ...body];
}

export function quotationToRows(
  q: Quotation,
  groups: CategoryGroup[],
  statuses: ProductStatusOption[],
): QuoteItemRow[] {
  const ctx = buildRowContext(groups, statuses);
  return q.items.map((it) => itemToRow(it, ctx));
}

export function exportQuotationExcel(
  q: Quotation,
  groups: CategoryGroup[],
  statuses: ProductStatusOption[],
): void {
  const rows = quotationToRows(q, groups, statuses);
  const aoa = rowsToAoa(rows);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '报价单');
  const safeNo = (q.quoteNumber || 'quote').replace(/[\\/?*[\]:]/g, '_');
  XLSX.writeFile(wb, `${safeNo}.xlsx`);
}

export interface ParseResult {
  items: Omit<QuoteItem, 'id' | 'quotationId' | 'lineTotal'>[];
  warnings: string[];
}

export async function parseQuotationExcel(
  file: File,
  groups: CategoryGroup[],
  statuses: ProductStatusOption[],
  fallbackGroupId?: string,
): Promise<ParseResult> {
  const ctx = buildRowContext(groups, statuses, fallbackGroupId);
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as (string | number)[][];
  if (aoa.length === 0) return { items: [], warnings: ['文件为空'] };

  // 表头 -> 列索引：优先按表头文本匹配，否则按列顺序兜底（兼容 AI 生成的同序文件）
  const headerRow = aoa[0].map((h) => String(h ?? '').trim());
  const colIndex = new Map<keyof QuoteItemRow, number>();
  QUOTE_EXCEL_COLUMNS.forEach((c, i) => {
    const found = headerRow.indexOf(c.header);
    colIndex.set(c.key, found >= 0 ? found : i);
  });

  const warnings: string[] = [];
  const items: Omit<QuoteItem, 'id' | 'quotationId' | 'lineTotal'>[] = [];

  for (let r = 1; r < aoa.length; r++) {
    const raw = aoa[r];
    if (!raw || raw.every((v) => v === '' || v == null)) continue;
    const row: QuoteItemRow = {
      group: String(raw[colIndex.get('group')!] ?? ''),
      name: String(raw[colIndex.get('name')!] ?? ''),
      nameEs: String(raw[colIndex.get('nameEs')!] ?? ''),
      model: String(raw[colIndex.get('model')!] ?? ''),
      cost: Number(raw[colIndex.get('cost')!] ?? 0),
      margin: Number(raw[colIndex.get('margin')!] ?? 0),
      salePrice: Number(raw[colIndex.get('salePrice')!] ?? 0),
      quantity: Number(raw[colIndex.get('quantity')!] ?? 1),
      unit: String(raw[colIndex.get('unit')!] ?? ''),
      dtoPct: Number(raw[colIndex.get('dtoPct')!] ?? 0),
      ivaPct: Number(raw[colIndex.get('ivaPct')!] ?? 21),
      customerNote: String(raw[colIndex.get('customerNote')!] ?? ''),
      internalNote: String(raw[colIndex.get('internalNote')!] ?? ''),
      status: String(raw[colIndex.get('status')!] ?? ''),
    };
    const base = rowToBaseItem(row, ctx);
    if (!base.categoryGroupId) {
      warnings.push(`第 ${r} 行：无可用大类（请先在设置中心创建大类），已跳过`);
      continue;
    }
    if (row.group && !ctx.groupNameToId.has(row.group.trim())) {
      warnings.push(`第 ${r} 行：大类「${row.group}」未匹配，已归入「其他」分类`);
    }
    if (row.status && !base.statusId) {
      warnings.push(`第 ${r} 行：未知状态「${row.status}」，状态留空`);
    }
    items.push(base);
  }

  return { items, warnings };
}
