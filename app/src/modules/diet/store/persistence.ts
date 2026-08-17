/**
 * pdash_v4 持久化层
 *
 * 硬性约束（不可违反）：
 * 1. 键名固定 'pdash_v4'，与 v1.0 单文件版共用同一份数据。
 * 2. 写出的 JSON 形状必须与 v1.0 完全一致 —— 这样新旧两个版本可以互相读写，
 *    用户在新版记录的数据，回退到 dashboard.html 依然看得到。
 * 3. 读取时对任何字段缺失都要容错，绝不能因为一条脏数据丢掉整份记录。
 */

import type {
  DailyLogs,
  Ingredient,
  MealTemplate,
  MealType,
  PantryItem,
  Recipe,
  ShoppingItem,
  Targets,
} from '../types';

export const DB_KEY = 'pdash_v4';

/** localStorage 中的完整快照，字段顺序与 v1.0 persist() 保持一致 */
export interface PersistedState {
  ingredients: Ingredient[];
  recipes: Recipe[];
  pantry: PantryItem[];
  shopping: ShoppingItem[];
  dailyLogs: DailyLogs;
  targets: Targets;
  ingLastSelected: Record<number, number>;
  mealTemplates: MealTemplate[];
}

export const DEFAULT_TARGETS: Targets = {
  calories: 2000,
  carbs: 250,
  protein: 120,
  fat: 67,
};

const VALID_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 规范化食材，对应 v1.0 load() 里的 "Migrate old format" 段落。
 * @param detectMicrons 由调用方注入，避免持久化层反向依赖引擎
 */
function normalizeIngredient(
  raw: unknown,
  detectMicrons: (name: string) => Ingredient['microns'],
): Ingredient | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'number' || typeof raw.name !== 'string') return null;

  const nutritionRaw = isRecord(raw.nutrition) ? raw.nutrition : {};
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

  const ing: Ingredient = {
    id: raw.id,
    name: raw.name,
    brand: typeof raw.brand === 'string' ? raw.brand : '',
    category: (raw.category as Ingredient['category']) ?? 'protein',
    emoji: typeof raw.emoji === 'string' ? raw.emoji : '',
    image: typeof raw.image === 'string' ? raw.image : '',
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [],
    nutrition: {
      calories: num(nutritionRaw.calories),
      carbs: num(nutritionRaw.carbs),
      protein: num(nutritionRaw.protein),
      fat: num(nutritionRaw.fat),
    },
    note: typeof raw.note === 'string' ? raw.note : '',
    // v1.0：unit 缺失补 'g'，gramsPerUnit 缺失补 50
    unit: raw.unit === '个' ? '个' : 'g',
    gramsPerUnit: typeof raw.gramsPerUnit === 'number' ? raw.gramsPerUnit : 50,
    microns: Array.isArray(raw.microns)
      ? (raw.microns as Ingredient['microns'])
      : detectMicrons(raw.name),
  };

  // v1.0 特例：id 为 4 的鸡蛋强制按「个」计量
  if (ing.id === 4) {
    ing.unit = '个';
    ing.gramsPerUnit = 50;
  }

  return ing;
}

function normalizeDailyLogs(raw: unknown): DailyLogs {
  const out: DailyLogs = {};
  if (!isRecord(raw)) return out;

  for (const [date, entries] of Object.entries(raw)) {
    if (!Array.isArray(entries)) continue;
    out[date] = entries
      .filter(isRecord)
      .map((e) => ({
        ingredientId: Number(e.ingredientId),
        amount: Number(e.amount) || 0,
        // v1.0：老数据没有 mealType，一律归入早餐
        mealType: VALID_MEAL_TYPES.includes(e.mealType as MealType)
          ? (e.mealType as MealType)
          : 'breakfast',
      }))
      .filter((e) => Number.isFinite(e.ingredientId));
  }
  return out;
}

function normalizeMealTemplate(raw: unknown): MealTemplate | null {
  if (!isRecord(raw) || typeof raw.id !== 'number') return null;
  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : '未命名套餐',
    emoji: typeof raw.emoji === 'string' ? raw.emoji : '🍽️',
    isDefault: !!raw.isDefault,
    defaultMealType: VALID_MEAL_TYPES.includes(raw.defaultMealType as MealType)
      ? (raw.defaultMealType as MealType)
      : 'breakfast',
    items: Array.isArray(raw.items)
      ? raw.items.filter(isRecord).map((i) => ({
          ingredientId: Number(i.ingredientId),
          amount: Number(i.amount) || 0,
        }))
      : [],
  };
}

/**
 * 把任意已解析的对象规整成 PersistedState 子集。
 *
 * 同时被 loadState（从 localStorage 读取）和 store.importRaw（从用户粘贴/上传的
 * v1 备份文本导入）复用 —— 保证「导入 v1 数据」也走和自动加载完全一致的
 * 旧格式迁移逻辑，不会漏掉任何归一化。
 */
export function normalizeState(
  raw: unknown,
  detectMicrons: (name: string) => Ingredient['microns'],
): Partial<PersistedState> {
  if (!isRecord(raw)) return {};

  const state: Partial<PersistedState> = {};

  if (Array.isArray(raw.ingredients)) {
    state.ingredients = raw.ingredients
      .map((x) => normalizeIngredient(x, detectMicrons))
      .filter((x): x is Ingredient => x !== null);
  }
  if (Array.isArray(raw.recipes)) {
    state.recipes = raw.recipes.filter(isRecord).map((r) => ({
      id: Number(r.id),
      name: typeof r.name === 'string' ? r.name : '',
      category: (r.category as Recipe['category']) ?? 'meat',
      ingredientIds: Array.isArray(r.ingredientIds) ? r.ingredientIds.map(Number) : [],
      method: typeof r.method === 'string' ? r.method : '',
    }));
  }
  if (Array.isArray(raw.pantry)) {
    state.pantry = raw.pantry.filter(isRecord).map((p) => ({
      id: Number(p.id),
      ingredientId: Number(p.ingredientId),
      quantity: Number(p.quantity) || 0,
    }));
  }
  if (Array.isArray(raw.shopping)) {
    state.shopping = raw.shopping.filter(isRecord).map((s) => ({
      id: Number(s.id),
      ingredientId: Number(s.ingredientId),
      quantity: Number(s.quantity) || 0,
      done: !!s.done,
    }));
  }
  if (raw.dailyLogs !== undefined) {
    state.dailyLogs = normalizeDailyLogs(raw.dailyLogs);
  }
  if (isRecord(raw.targets)) {
    state.targets = { ...DEFAULT_TARGETS };
    for (const k of ['calories', 'carbs', 'protein', 'fat'] as const) {
      const v = raw.targets[k];
      if (typeof v === 'number' && Number.isFinite(v)) state.targets[k] = v;
    }
  }
  if (isRecord(raw.ingLastSelected)) {
    const m: Record<number, number> = {};
    for (const [k, v] of Object.entries(raw.ingLastSelected)) {
      const id = Number(k);
      if (Number.isFinite(id) && typeof v === 'number') m[id] = v;
    }
    state.ingLastSelected = m;
  }
  if (Array.isArray(raw.mealTemplates)) {
    state.mealTemplates = raw.mealTemplates
      .map(normalizeMealTemplate)
      .filter((x): x is MealTemplate => x !== null);
  }

  return state;
}

/** 读取结果；raw 为 null 表示没有存量数据（首次运行，需要 seed） */
export interface LoadResult {
  found: boolean;
  state: Partial<PersistedState>;
  /** 解析失败时的原始字符串，供上层做应急导出 */
  corruptedRaw?: string;
}

export function loadState(
  detectMicrons: (name: string) => Ingredient['microns'],
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): LoadResult {
  if (!storage) return { found: false, state: {} };

  let raw: string | null = null;
  try {
    raw = storage.getItem(DB_KEY);
  } catch {
    return { found: false, state: {} };
  }
  if (!raw) return { found: false, state: {} };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // 数据损坏：不静默丢弃，把原文交给上层
    return { found: false, state: {}, corruptedRaw: raw };
  }
  if (!isRecord(parsed)) return { found: false, state: {}, corruptedRaw: raw };

  return { found: true, state: normalizeState(parsed, detectMicrons) };
}

export function saveState(
  snapshot: PersistedState,
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(DB_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    // 配额溢出等情况：静默失败，与 v1.0 行为一致
    return false;
  }
}
