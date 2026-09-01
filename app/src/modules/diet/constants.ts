/** 饮食模块常量表 —— 与 v1.0 逐项对齐，改动会影响存量数据的展示。 */

import type { IngredientCategory, MealType, RecipeCategory } from './types';

export interface CatDef {
  label: string;
  emoji: string;
}

export const CAT_DEFS: Record<IngredientCategory, CatDef> = {
  protein: { label: '蛋白质', emoji: '🥩' },
  carbs: { label: '碳水', emoji: '🌾' },
  fat: { label: '脂肪', emoji: '🥑' },
  veg: { label: '蔬菜', emoji: '🥬' },
  fruit: { label: '水果', emoji: '🍎' },
  drink: { label: '饮品', emoji: '🥤' },
};

export const RECIPE_CATS: Record<RecipeCategory, CatDef> = {
  meat: { label: '荤菜', emoji: '🍖' },
  veg: { label: '素菜/副菜', emoji: '🥗' },
  staple: { label: '主食', emoji: '🍚' },
  dessert: { label: '甜品', emoji: '🍰' },
};

export interface MealTypeDef {
  key: MealType;
  label: string;
  icon: string;
}

export const MEAL_TYPES: MealTypeDef[] = [
  { key: 'breakfast', label: '早餐', icon: '🌅' },
  { key: 'lunch', label: '午餐', icon: '☀️' },
  { key: 'dinner', label: '晚餐', icon: '🌙' },
];

export function mealTypeLabel(key: MealType | string): string {
  const m = MEAL_TYPES.find((x) => x.key === key);
  return m ? `${m.icon} ${m.label}` : String(key);
}

export type FoodTabKey = 'dailylog' | 'ingredients' | 'recipes' | 'pantry' | 'shopping';

export interface FoodTab {
  key: FoodTabKey;
  label: string;
  icon: string;
}

export const FOOD_TABS: FoodTab[] = [
  { key: 'dailylog', label: '记录', icon: 'pencil' },
  { key: 'ingredients', label: '食材', icon: 'broccoli' },
  { key: 'recipes', label: '菜谱', icon: 'utensils' },
  { key: 'pantry', label: '库存', icon: 'box' },
  { key: 'shopping', label: '采购', icon: 'cart' },
];

export const EMOJI_OPTIONS: string[] = [
  '🥩', '🍗', '🥓', '🐟', '🦐', '🥚', '🧀', '🫘',
  '🌾', '🍞', '🥯', '🥐', '🍚', '🥔', '🍠', '🌽',
  '🥑', '🫒', '🥜', '🧈', '🥛', '🍯', '🥥', '🌰',
  '🥦', '🥬', '🥒', '🍅', '🥕', '🌶️', '🧅', '🥗',
  '🍋', '🍊', '🍎', '🍇', '🍓', '🫐', '🥝', '🍑',
  '☕', '🍵', '🧃', '🥤', '🍨', '🧁', '🍰', '🍪',
];

/** 用户档案可选主题色（十六进制），用于区分不同用户的记录 */
export const PROFILE_COLORS: string[] = [
  '#fb7185', // 珊瑚红（默认「我」）
  '#6366f1', // 靛蓝
  '#10b981', // 翠绿
  '#f59e0b', // 琥珀
  '#ec4899', // 玫红
  '#06b6d4', // 青
  '#8b5cf6', // 紫
  '#ef4444', // 红
];

/** 默认用户档案（首次运行时注入） */
export const DEFAULT_PROFILE_ID = 'me';

/** 本地日期串 YYYY-MM-DD。刻意不用 toISOString —— 那会按 UTC 截断，跨时区会错一天。 */
export function todayStr(): string {
  return localDateStr(new Date());
}

export function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDateStr(d);
}

export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
