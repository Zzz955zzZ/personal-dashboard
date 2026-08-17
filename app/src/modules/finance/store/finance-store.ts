/**
 * 记账 Pinia Store
 *
 * 核心能力：
 * - 交易 CRUD
 * - 按日期/分类/类型/搜索过滤
 * - 月度收支统计
 * - 日分组流水
 */

import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { TxnType, Transaction } from '../types';
import { CATEGORIES, categoriesByType } from '../constants';
import { loadFinanceState, saveFinanceState } from './persistence';

export const useFinanceStore = defineStore('finance', () => {
  /* ---- 状态 ---- */
  const transactions = ref<Transaction[]>([]);
  const nextId = ref(1);
  const currentMonth = ref(''); // YYYY-MM, 空=当月
  const filterType = ref<TxnType | 'all'>('all');
  const searchQuery = ref('');
  const selectedCategory = ref('');

  let dirty = false;

  /* ---- 初始化 ---- */
  function hydrate(): void {
    const { found, state } = loadFinanceState();
    if (found) {
      transactions.value = state.transactions;
      nextId.value = state.nextId;
    }
    // 默认显示当月
    if (!currentMonth.value) {
      const now = new Date();
      currentMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  function persist(): void {
    if (!dirty) return;
    saveFinanceState({ transactions: transactions.value, nextId: nextId.value });
    dirty = false;
  }

  function markDirty(): void {
    dirty = true;
  }

  /* ---- CRUD ---- */
  function addTxn(payload: {
    type: TxnType;
    amount: number;
    category: string;
    description: string;
    date: string;
  }): Transaction {
    const txn: Transaction = {
      id: nextId.value++,
      type: payload.type,
      amount: Math.max(0, payload.amount),
      category: payload.category,
      description: payload.description,
      date: payload.date || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    transactions.value.push(txn);
    markDirty();
    persist();
    return txn;
  }

  function deleteTxn(id: number): boolean {
    const idx = transactions.value.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    transactions.value.splice(idx, 1);
    markDirty();
    persist();
    return true;
  }

  /* ---- 查询：月度统计 ---- */
  function monthlyStats(month: string): { income: number; expense: number; balance: number } {
    const prefix = month || currentMonth.value;
    let income = 0;
    let expense = 0;
    for (const t of transactions.value) {
      if (!t.date.startsWith(prefix)) continue;
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }

  /** 当前选中月的统计（响应式） */
  const stats = computed(() => monthlyStats(currentMonth.value));

  /** 全部时间的累计统计 */
  const totalStats = computed(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions.value) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  });

  /* ---- 查询：日分组流水 ---- */
  interface DayGroup {
    date: string;
    weekday: string;
    totalIncome: number;
    totalExpense: number;
    txns: Transaction[];
  }

  const dayGroups = computed<DayGroup[]>(() => {
    const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const map = new Map<string, Transaction[]>();

    // 过滤
    let list = transactions.value;
    if (currentMonth.value) {
      list = list.filter((t) => t.date.startsWith(currentMonth.value));
    }
    if (filterType.value !== 'all') {
      list = list.filter((t) => t.type === filterType.value);
    }
    if (selectedCategory.value) {
      list = list.filter((t) => t.category === selectedCategory.value);
    }
    const q = searchQuery.value.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }

    // 按日分组
    for (const t of list) {
      const arr = map.get(t.date);
      if (arr) arr.push(t);
      else map.set(t.date, [t]);
    }

    // 转数组，按日期降序
    const groups: DayGroup[] = [];
    for (const [date, txns] of map) {
      const d = new Date(date + 'T00:00:00');
      let inc = 0;
      let exp = 0;
      for (const t of txns) {
        if (t.type === 'income') inc += t.amount;
        else exp += t.amount;
      }
      groups.push({
        date,
        weekday: WEEKDAYS[d.getDay()],
        totalIncome: inc,
        totalExpense: exp,
        txns: txns.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      });
    }
    return groups.sort((a, b) => b.date.localeCompare(a.date));
  });

  /** 分类汇总（当前筛选范围内） */
  const categorySummary = computed(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const g of dayGroups.value) {
      for (const t of g.txns) {
        const prev = map.get(t.category) || { amount: 0, count: 0 };
        map.set(t.category, { amount: prev.amount + t.amount, count: prev.count + 1 });
      }
    }
    return map;
  });

  return {
    // 状态
    transactions,
    currentMonth,
    filterType,
    searchQuery,
    selectedCategory,

    // 操作
    hydrate,
    persist,
    addTxn,
    deleteTxn,

    // 查询
    stats,
    totalStats,
    dayGroups,
    categorySummary,
    categoriesByType,
    CATEGORIES,
  };
});
