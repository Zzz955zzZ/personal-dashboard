/**
 * 四象限待办 Pinia Store
 *
 * 核心能力：
 * - 任务 CRUD（增删改查、完成/归档、象限移动）
 * - 按 象限 / 域 / 状态 / 搜索 过滤
 * - 自动持久化到 localStorage
 */

import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { Quadrant, TaskDomain, TodoTask } from '../types';
import { QUADRANT_LIST } from '../constants';
import { loadTodoState, saveTodoState } from './persistence';

export const useTodoStore = defineStore('todo', () => {
  /* ---- 状态 ---- */
  const tasks = ref<TodoTask[]>([]);
  const nextId = ref(1);
  const filterDomain = ref<TaskDomain | 'all'>('all');
  const searchQuery = ref('');
  const showCompleted = ref(false);
  const selectedMonth = ref(''); // YYYY-MM, 空=全部

  let dirty = false;

  /* ---- 初始化 ---- */
  function hydrate(): void {
    const { found, state } = loadTodoState();
    if (found) {
      tasks.value = state.tasks;
      nextId.value = state.nextId;
    }
  }

  function persist(): void {
    if (!dirty) return;
    saveTodoState({ tasks: tasks.value, nextId: nextId.value });
    dirty = false;
  }

  /** 标记脏数据， debounce 写入（调用方在批量操作后手动调 persist()） */
  function markDirty(): void {
    dirty = true;
  }

  /* ---- CRUD ---- */
  function addTask(payload: {
    title: string;
    description: string;
    quadrant: Quadrant;
    domain: TaskDomain;
    priority: TodoTask['priority'];
    horizon: TodoTask['horizon'];
  }): TodoTask {
    const now = new Date().toISOString();
    const task: TodoTask = {
      id: nextId.value++,
      title: payload.title,
      description: payload.description,
      quadrant: payload.quadrant,
      domain: payload.domain,
      priority: payload.priority,
      status: 'active',
      horizon: payload.horizon,
      completedAt: '',
      createdAt: now,
      updatedAt: now,
    };
    tasks.value.push(task);
    markDirty();
    persist();
    return task;
  }

  function updateTask(id: number, changes: Partial<Omit<TodoTask, 'id' | 'createdAt'>>): boolean {
    const idx = tasks.value.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    tasks.value[idx] = { ...tasks.value[idx], ...changes, updatedAt: new Date().toISOString() };
    markDirty();
    persist();
    return true;
  }

  function deleteTask(id: number): boolean {
    const idx = tasks.value.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    tasks.value.splice(idx, 1);
    markDirty();
    persist();
    return true;
  }

  function completeTask(id: number): boolean {
    return updateTask(id, {
      status: 'completed',
      completedAt: new Date().toISOString().slice(0, 10),
    });
  }

  function uncompleteTask(id: number): boolean {
    return updateTask(id, { status: 'active', completedAt: '' });
  }

  function moveTask(id: number, quadrant: Quadrant): boolean {
    return updateTask(id, { quadrant });
  }

  function archiveTask(id: number): boolean {
    return updateTask(id, { status: 'archived' });
  }

  /* ---- 查询 ---- */
  const activeTasks = computed(() =>
    tasks.value.filter((t) => t.status === 'active'),
  );

  function tasksByQuadrant(q: Quadrant): TodoTask[] {
    return filteredTasks.value.filter((t) => t.quadrant === q);
  }

  const filteredTasks = computed(() => {
    let list = showCompleted.value
      ? tasks.value.filter((t) => t.status !== 'archived')
      : tasks.value.filter((t) => t.status === 'active');

    // 域过滤
    if (filterDomain.value !== 'all') {
      list = list.filter((t) => t.domain === filterDomain.value);
    }

    // 搜索
    const q = searchQuery.value.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q),
      );
    }

    // 月筛选
    if (selectedMonth.value) {
      list = list.filter((t) => t.createdAt.startsWith(selectedMonth.value));
    }

    // 排序：Q1优先级最高 → Q4最低；同象限内按创建时间倒序
    const qOrder: Record<Quadrant, number> = { Q1: 0, Q2: 1, Q3: 2, Q4: 3 };
    return [...list].sort((a, b) => {
      const qDiff = qOrder[a.quadrant] - qOrder[b.quadrant];
      if (qDiff !== 0) return qDiff;
      return b.createdAt.localeCompare(a.createdAt);
    });
  });

  /** 各象限活跃任务数 */
  const quadrantCounts = computed(() => {
    const counts: Record<Quadrant, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    for (const t of filteredTasks.value) {
      if (t.status === 'active') counts[t.quadrant]++;
    }
    return counts;
  });

  /** 域统计 */
  const domainStats = computed(() => {
    const work = tasks.value.filter((t) => t.domain === 'work' && t.status === 'active').length;
    const personal = tasks.value.filter((t) => t.domain === 'personal' && t.status === 'active').length;
    return { work, personal, total: work + personal };
  });

  return {
    // 状态
    tasks,
    filterDomain,
    searchQuery,
    showCompleted,
    selectedMonth,

    // 操作
    hydrate,
    persist,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    moveTask,
    archiveTask,

    // 查询
    activeTasks,
    tasksByQuadrant,
    filteredTasks,
    quadrantCounts,
    domainStats,

    // 常量暴露
    QUADRANT_LIST,
  };
});
