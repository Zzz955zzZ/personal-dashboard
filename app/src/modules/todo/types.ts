/**
 * 四象限待办模块类型定义
 *
 * 基于 Eisenhower 矩阵（紧急-重要二维分类）+ 工作/生活域分离。
 */

/** 四个象限 */
export type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4';

/** 任务域：工作 vs 生活 */
export type TaskDomain = 'work' | 'personal';

/** 任务状态 */
export type TaskStatus = 'active' | 'completed' | 'archived';

/** 优先级（用于排序和视觉提示，与象限关联但可微调） */
export type TaskPriority = 'high' | 'medium' | 'low';

/** 时间粒度：日 / 周 / 月 / 年（替代原「截止日期」） */
export type TaskHorizon = 'day' | 'week' | 'month' | 'year';

/** 单条任务 */
export interface TodoTask {
  id: number;
  title: string;
  description: string;
  quadrant: Quadrant;
  domain: TaskDomain;
  priority: TaskPriority;
  status: TaskStatus;
  horizon: TaskHorizon;   // 日 / 周 / 月 / 年
  completedAt: string;     // ISO date or ''
  createdAt: string;       // ISO datetime
  updatedAt: string;       // ISO datetime
}

/** 象限定义 */
export interface QuadrantDef {
  key: Quadrant;
  label: string;
  sublabel: string;        // 如 "立即做"
  color: string;           // Tailwind 色类前缀
  bgClass: string;         // 背景色
  borderClass: string;     // 边框色
  textClass: string;       // 文字色
}

/** 域定义 */
export interface DomainDef {
  key: TaskDomain;
  label: string;
  emoji: string;
  icon: string;            // SVG inline
}

/** 持久化状态 */
export interface TodoPersistedState {
  tasks: TodoTask[];
  nextId: number;
}
