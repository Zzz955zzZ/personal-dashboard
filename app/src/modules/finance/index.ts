/**
 * 记账模块公开 API
 */
export { useFinanceStore } from './store/finance-store';
export { financeRoutes } from './routes';
export { CATEGORIES, categoriesByType, FINANCE_DB_KEY } from './constants';
export type {
  Transaction,
  TxnType,
  CategoryDef,
  FinancePersistedState,
} from './types';
