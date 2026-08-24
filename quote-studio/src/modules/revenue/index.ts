/**
 * 收益模块公开 API（跨模块一律从这里引用）。
 */
export { useProjectsStore, useRevenueStore } from './store/revenue-store';
export { revenueRoutes } from './routes';
export { PROJECTS_DB_KEY, REVENUE_DB_KEY, PROJECT_STATUS_OPTIONS, projectStatusLabel } from './constants';
export type {
  Project,
  ProjectStatus,
  RevenueEntry,
  ProjectRevenueSummary,
  CurrencyCode,
} from './types';
