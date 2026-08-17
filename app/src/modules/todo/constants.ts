import type { DomainDef, Quadrant, QuadrantDef, TaskHorizon } from './types';

/** 四象限定义 — 浅色主题，与工作台整体协调 */
export const QUADRANTS: Record<Quadrant, QuadrantDef> = {
  Q1: {
    key: 'Q1',
    label: '紧急 & 重要',
    sublabel: '立即做',
    color: 'red',
    bgClass: 'bg-red-50/70',
    borderClass: 'border-red-200',
    textClass: 'text-red-600',
  },
  Q2: {
    key: 'Q2',
    label: '不紧急 & 重要',
    sublabel: '计划做',
    color: 'amber',
    bgClass: 'bg-amber-50/70',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-600',
  },
  Q3: {
    key: 'Q3',
    label: '紧急 & 不重要',
    sublabel: '委托做',
    color: 'blue',
    bgClass: 'bg-blue-50/70',
    borderClass: 'border-blue-200',
    textClass: 'text-blue-600',
  },
  Q4: {
    key: 'Q4',
    label: '不紧急 & 不重要',
    sublabel: '尽量不做',
    color: 'green',
    bgClass: 'bg-green-50/70',
    borderClass: 'border-green-200',
    textClass: 'text-green-600',
  },
};

export const QUADRANT_LIST: Quadrant[] = ['Q1', 'Q2', 'Q3', 'Q4'];

/** 时间粒度（日 / 周 / 月 / 年） */
export const HORIZONS: { key: TaskHorizon; label: string; emoji: string }[] = [
  { key: 'day', label: '日', emoji: '⏱' },
  { key: 'week', label: '周', emoji: '🗓' },
  { key: 'month', label: '月', emoji: '📅' },
  { key: 'year', label: '年', emoji: '📆' },
];

export function horizonLabel(h: TaskHorizon): string {
  return HORIZONS.find((x) => x.key === h)?.label ?? '周';
}

/** 域定义 */
export const DOMAINS: DomainDef[] = [
  {
    key: 'work',
    label: '工作',
    emoji: '💼',
    icon:
      '<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  },
  {
    key: 'personal',
    label: '生活',
    emoji: '🏠',
    icon:
      '<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a8 8 0 0 1 16 0v10H4z"/><path d="M12 2v4"/><path d="M4 14h16"/></svg>',
  },
];

/** localStorage 键 */
export const TODO_DB_KEY = 'pdash_todo_v1';
