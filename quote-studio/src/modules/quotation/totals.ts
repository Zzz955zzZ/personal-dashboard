/**
 * 报价汇总计算（含折扣 dto% 与逐行税率 iva%）。
 *
 * 单条行：
 *   neto_i  = salePrice * quantity
 *   dto_i   = neto_i * dtoPct / 100
 *   base_i  = neto_i - dto_i
 *   iva_i   = base_i * ivaPct / 100
 *   total_i = base_i + iva_i
 *
 * 整单：按上逐项求和。ivaPct 可按产品单独设置（默认 21），
 * 因此 IVA 在汇总层按逐行聚合，而非用单一税率。
 */

import type { QuoteItem } from './types';

export interface QuoteTotals {
  neto: number; // 税前小计（Σ salePrice*qty）
  dto: number; // 折扣合计
  base: number; // 折后税前基数
  iva: number; // 增值税合计（逐行聚合）
  total: number; // 含税总价（应付总额）
  cost: number; // 进价合计（Σ cost*qty）
  profit: number; // 利润（base - cost）
}

export function computeQuoteTotals(items: QuoteItem[]): QuoteTotals {
  let neto = 0;
  let dto = 0;
  let iva = 0;
  let cost = 0;
  for (const it of items) {
    const salePrice = Number(it.salePrice) || 0;
    const quantity = Number(it.quantity) || 0;
    const lineNeto = salePrice * quantity;
    const lineDto = lineNeto * ((Number(it.dtoPct) || 0) / 100);
    const lineBase = lineNeto - lineDto;
    const lineIva = lineBase * ((Number(it.ivaPct) || 0) / 100);
    neto += lineNeto;
    dto += lineDto;
    iva += lineIva;
    cost += (Number(it.cost) || 0) * quantity;
  }
  const base = neto - dto;
  const total = base + iva;
  const profit = base - cost;
  return { neto, dto, base, iva, total, cost, profit };
}
