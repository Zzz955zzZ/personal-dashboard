import type { ProjectStatus } from './types';

/** localStorage 键（命名空间 qs_<module>_v1）。 */
export const PROJECTS_DB_KEY = 'qs_projects_v1';
export const REVENUE_DB_KEY = 'qs_revenue_v1';

/** 项目状态选项（UI 用）。 */
export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'archived', label: '已归档' },
];

export function projectStatusLabel(s: ProjectStatus): string {
  return PROJECT_STATUS_OPTIONS.find((x) => x.value === s)?.label ?? s;
}
