/**
 * 四象限待办模块公开 API
 *
 * 外部只允许从这里 import，不深入内部路径。
 */
export { useTodoStore } from './store/todo-store';
export { todoRoutes } from './routes';
export { QUADRANTS, QUADRANT_LIST, DOMAINS, TODO_DB_KEY } from './constants';
export type {
  TodoTask,
  Quadrant,
  TaskDomain,
  TaskStatus,
  TaskPriority,
  TodoPersistedState,
} from './types';
