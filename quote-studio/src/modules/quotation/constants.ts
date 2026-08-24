import type { QuoteItem } from './types';

/** localStorage 键（命名空间 qs_quotation_v1）。 */
export const QUOTATION_DB_KEY = 'qs_quotation_v1';

export const DEFAULT_QUOTATION_TITLE = '项目报价';

/**
 * 客户视图可见字段白名单（强约束 #5 / #6）。
 * 客户视图与导出 PDF 仅渲染此列表内的字段，成本 / 毛利 / 内部备注 / 状态一律不出现。
 */
export const CUSTOMER_VISIBLE_FIELDS: (keyof QuoteItem)[] = [
  'name',
  'nameEs',
  'model',
  'photoUrls',
  'customerNote',
  'quantity',
  'unit',
  'salePrice',
  'lineTotal',
];
