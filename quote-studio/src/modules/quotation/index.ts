/**
 * 报价模块公开 API（跨模块一律从这里引用）。
 */
export { useQuotationStore, recalc } from './store/quotation-store';
export { quotationRoutes } from './routes';
export {
  QUOTATION_DB_KEY,
  DEFAULT_QUOTATION_TITLE,
  CUSTOMER_VISIBLE_FIELDS,
} from './constants';
export type { Quotation, QuoteItem, QuotationStatus } from './types';
