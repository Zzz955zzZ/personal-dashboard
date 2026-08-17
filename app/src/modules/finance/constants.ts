import type { CategoryDef, TxnType } from './types';

/**
 * 分类定义 — 适配房产中介 + 植物批发 + 马德里生活
 *
 * 分为支出 / 收入 / 通用三类。
 */
export const CATEGORIES: CategoryDef[] = [
  // ---- 支出 ----
  { key: 'food', label: '餐饮', emoji: '🍽️', icon: '', type: 'expense' },
  { key: 'transport', label: '交通', emoji: '🚗', icon: '', type: 'expense' },
  { key: 'shopping', label: '购物', emoji: '🛒', icon: '', type: 'expense' },
  { key: 'housing', label: '住房', emoji: '🏠', icon: '', type: 'expense' },
  { key: 'health', label: '医疗健康', emoji: '💊', icon: '', type: 'expense' },
  { key: 'fitness', label: '运动健身', emoji: '🏋️', icon: '', type: 'expense' },
  { key: 'entertainment', label: '娱乐', emoji: '🎮', icon: '', type: 'expense' },
  { key: 'education', label: '学习', emoji: '📚', icon: '', type: 'expense' },
  { key: 'social', label: '社交', emoji: '🍻', icon: '', type: 'expense' },
  { key: 'plant', label: '植物/园艺', emoji: '🌿', icon: '', type: 'expense' },
  { key: 'pet', label: '宠物', emoji: '🐾', icon: '', type: 'expense' },
  { key: 'beauty', label: '美容护肤', emoji: '💇', icon: '', type: 'expense' },
  { key: 'comm', label: '通讯网络', emoji: '📱', icon: '', type: 'expense' },
  { key: 'other_expense', label: '其他支出', emoji: '📦', icon: '', type: 'expense' },

  // ---- 收入 ----
  { key: 'salary', label: '工资/佣金', emoji: '💰', icon: '', type: 'income' },
  { key: 'commission', label: '房产佣金', emoji: '🏘️', icon: '', type: 'income' },
  { key: 'plant_business', label: '植物批发', emoji: '🌳', icon: '', type: 'income' },
  { key: 'freelance', label: '兼职/外包', emoji: '💻', icon: '', type: 'income' },
  { key: 'investment', label: '投资收益', emoji: '📈', icon: '', type: 'income' },
  { key: 'gift', label: '红包/赠予', emoji: '🧧', icon: '', type: 'income' },
  { key: 'refund', label: '退款/报销', emoji: '↩️', icon: '', type: 'income' },
  { key: 'other_income', label: '其他收入', emoji: '✨', icon: '', type: 'income' },

  // ---- 通用（收支均可）----
  { key: 'transfer', label: '转账', emoji: '🔄', icon: '', type: 'both' },
];

/** 按 type 筛选分类 */
export function categoriesByType(type: TxnType | 'all'): CategoryDef[] {
  if (type === 'all') return CATEGORIES;
  return CATEGORIES.filter((c) => c.type === type || c.type === 'both');
}

/** localStorage 键 */
export const FINANCE_DB_KEY = 'pdash_finance_v1';
