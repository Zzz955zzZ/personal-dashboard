/**
 * 模块聚合出口。
 *
 * 对外再导出四个模块的公开 API；并提供 hydrateAll() 用于应用启动时统一注水。
 * 跨模块引用一律走这里或其目标模块 index，不穿透内部路径。
 */

export * from './dashboard';
export * from './revenue';
export * from './quotation';
export * from './settings';
export * from './ai-link';

// 显式再导出以解决 revenue 与 settings 同时导出 CurrencyCode 的星号冲突（TS2308）。
export type { CurrencyCode } from './revenue';

import { useProjectsStore } from './revenue';
import { useRevenueStore } from './revenue';
import { useQuotationStore } from './quotation';
import { useSettingsStore } from './settings';

/** 应用启动时统一从 localStorage 注水（顺序不敏感）。 */
export function hydrateAll(): void {
  useSettingsStore().hydrate();
  useProjectsStore().hydrate();
  useQuotationStore().hydrate();
  useRevenueStore().hydrate();
}
