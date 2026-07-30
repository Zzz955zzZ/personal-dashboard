/**
 * 持久化回归测试
 *
 * 这组用例的存在意义只有一个：**保证用户既有的 pdash_v4 数据一条不丢**。
 * 任何让这些用例变红的改动都不允许合入。
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { DB_KEY, loadState, saveState, type PersistedState } from './persistence';
import { useDietStore } from './diet-store';
import { detectMicrons } from '../engine';

/** 模拟一份 v1.0 老用户数据：故意缺字段、带脏值 */
const LEGACY_RAW = JSON.stringify({
  ingredients: [
    // 缺 unit / gramsPerUnit / microns —— v1.0 老格式
    { id: 1, name: '鸡胸肉', category: 'protein', emoji: '🍗', image: '', tags: ['高蛋白'], nutrition: { calories: 165, carbs: 0, protein: 31, fat: 3.6 }, note: '' },
    // 鸡蛋：v1.0 会强制改成「个」计量
    { id: 4, name: '鸡蛋', category: 'protein', emoji: '🥚', image: '', tags: [], nutrition: { calories: 155, carbs: 1.1, protein: 13, fat: 11 }, note: '' },
    { id: 99, name: '自定义腌菜', category: 'veg', emoji: '🥬', image: '', tags: ['自制'], nutrition: { calories: 30, carbs: 5, protein: 1, fat: 0.2 }, note: '奶奶做的' },
  ],
  recipes: [{ id: 1, name: '香煎鸡胸', category: 'meat', ingredientIds: [1], method: '煎。' }],
  pantry: [{ id: 1, ingredientId: 1, quantity: 350 }],
  shopping: [{ id: 1, ingredientId: 4, quantity: 600, done: false }],
  dailyLogs: {
    // 老条目没有 mealType
    '2026-07-01': [{ ingredientId: 1, amount: 150 }],
    '2026-07-02': [
      { ingredientId: 1, amount: 200, mealType: 'lunch' },
      { ingredientId: 4, amount: 100, mealType: 'breakfast' },
    ],
  },
  targets: { calories: 1800, carbs: 200, protein: 140, fat: 60 },
  ingLastSelected: { 1: 1751000000000 },
  mealTemplates: [
    { id: 1, name: '经典早餐', emoji: '🌅', isDefault: true, defaultMealType: 'breakfast', items: [{ ingredientId: 4, amount: 50 }] },
  ],
});

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  key(i: number): string | null {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
}

describe('loadState — v1.0 存量数据兼容', () => {
  it('完整读入所有集合，数量一条不少', () => {
    const s = new MemoryStorage();
    s.setItem(DB_KEY, LEGACY_RAW);
    const { found, state } = loadState(detectMicrons, s);

    expect(found).toBe(true);
    expect(state.ingredients).toHaveLength(3);
    expect(state.recipes).toHaveLength(1);
    expect(state.pantry).toHaveLength(1);
    expect(state.shopping).toHaveLength(1);
    expect(Object.keys(state.dailyLogs!)).toHaveLength(2);
    expect(state.mealTemplates).toHaveLength(1);
  });

  it('保留用户自建食材的全部字段', () => {
    const s = new MemoryStorage();
    s.setItem(DB_KEY, LEGACY_RAW);
    const { state } = loadState(detectMicrons, s);
    const custom = state.ingredients!.find((i) => i.id === 99)!;

    expect(custom.name).toBe('自定义腌菜');
    expect(custom.note).toBe('奶奶做的');
    expect(custom.tags).toEqual(['自制']);
    expect(custom.nutrition).toEqual({ calories: 30, carbs: 5, protein: 1, fat: 0.2 });
  });

  it('缺失的 unit / gramsPerUnit 按 v1.0 规则补默认值', () => {
    const s = new MemoryStorage();
    s.setItem(DB_KEY, LEGACY_RAW);
    const { state } = loadState(detectMicrons, s);
    const chicken = state.ingredients!.find((i) => i.id === 1)!;

    expect(chicken.unit).toBe('g');
    expect(chicken.gramsPerUnit).toBe(50);
  });

  it('id=4 的鸡蛋强制按「个」计量（v1.0 历史特例）', () => {
    const s = new MemoryStorage();
    s.setItem(DB_KEY, LEGACY_RAW);
    const { state } = loadState(detectMicrons, s);
    const egg = state.ingredients!.find((i) => i.id === 4)!;

    expect(egg.unit).toBe('个');
    expect(egg.gramsPerUnit).toBe(50);
  });

  it('缺失 microns 时用引擎重新推导，而不是留空', () => {
    const s = new MemoryStorage();
    s.setItem(DB_KEY, LEGACY_RAW);
    const { state } = loadState(detectMicrons, s);
    const chicken = state.ingredients!.find((i) => i.id === 1)!;

    expect(chicken.microns!.length).toBeGreaterThan(0);
    expect(chicken.microns!.some((m) => m.name === '硒')).toBe(true);
  });

  it('无 mealType 的老记录归入早餐，已有的保持不变', () => {
    const s = new MemoryStorage();
    s.setItem(DB_KEY, LEGACY_RAW);
    const { state } = loadState(detectMicrons, s);

    expect(state.dailyLogs!['2026-07-01']![0]!.mealType).toBe('breakfast');
    expect(state.dailyLogs!['2026-07-02']![0]!.mealType).toBe('lunch');
  });

  it('保留自定义营养目标，不被默认值覆盖', () => {
    const s = new MemoryStorage();
    s.setItem(DB_KEY, LEGACY_RAW);
    const { state } = loadState(detectMicrons, s);

    expect(state.targets).toEqual({ calories: 1800, carbs: 200, protein: 140, fat: 60 });
  });

  it('没有存量数据时返回 found=false，交由上层 seed', () => {
    const s = new MemoryStorage();
    expect(loadState(detectMicrons, s).found).toBe(false);
  });

  it('JSON 损坏时不抛异常，并把原文交还上层保命', () => {
    const s = new MemoryStorage();
    s.setItem(DB_KEY, '{ 这不是 JSON');
    const r = loadState(detectMicrons, s);

    expect(r.found).toBe(false);
    expect(r.corruptedRaw).toBe('{ 这不是 JSON');
  });
});

describe('saveState — 与 v1.0 双向兼容', () => {
  it('写出的键名与顺序和 v1.0 persist() 一致', () => {
    const s = new MemoryStorage();
    const snap: PersistedState = {
      ingredients: [],
      recipes: [],
      pantry: [],
      shopping: [],
      dailyLogs: {},
      targets: { calories: 2000, carbs: 250, protein: 120, fat: 67 },
      ingLastSelected: {},
      mealTemplates: [],
    };
    saveState(snap, s);
    const written = JSON.parse(s.getItem(DB_KEY)!) as Record<string, unknown>;

    expect(Object.keys(written)).toEqual([
      'ingredients',
      'recipes',
      'pantry',
      'shopping',
      'dailyLogs',
      'targets',
      'ingLastSelected',
      'mealTemplates',
    ]);
  });

  it('存-读往返后数据完全一致', () => {
    const s = new MemoryStorage();
    s.setItem(DB_KEY, LEGACY_RAW);
    const first = loadState(detectMicrons, s).state;

    saveState(first as PersistedState, s);
    const second = loadState(detectMicrons, s).state;

    expect(second).toEqual(first);
  });
});

describe('useDietStore — 装载行为', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('首次运行注入种子数据', () => {
    const store = useDietStore();
    store.hydrate();

    expect(store.ingredients).toHaveLength(22);
    expect(store.recipes).toHaveLength(6);
    expect(store.mealTemplates).toHaveLength(1);
  });

  it('有存量数据时使用存量，不被种子覆盖', () => {
    localStorage.setItem(DB_KEY, LEGACY_RAW);
    const store = useDietStore();
    store.hydrate();

    expect(store.ingredients).toHaveLength(3);
    expect(store.ingredients.find((i) => i.id === 99)?.name).toBe('自定义腌菜');
    expect(store.targets.calories).toBe(1800);
  });
});

describe('useDietStore — 库存联动', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('记录一餐会扣减库存', () => {
    const store = useDietStore();
    store.hydrate();
    const before = store.getPantryEntry(1).quantity;

    store.addLogEntry('2026-07-30', { ingredientId: 1, amount: 150, mealType: 'lunch' });

    expect(store.getPantryEntry(1).quantity).toBe(before - 150);
  });

  it('库存扣到负数时钳在 0（与 v1.0 一致）', () => {
    const store = useDietStore();
    store.hydrate();

    store.addLogEntry('2026-07-30', { ingredientId: 1, amount: 999999, mealType: 'lunch' });

    expect(store.getPantryEntry(1).quantity).toBe(0);
  });

  it('删除记录会把库存补回去', () => {
    const store = useDietStore();
    store.hydrate();
    const before = store.getPantryEntry(1).quantity;

    store.addLogEntry('2026-07-30', { ingredientId: 1, amount: 100, mealType: 'lunch' });
    store.removeLogEntryAt('2026-07-30', 0);

    expect(store.getPantryEntry(1).quantity).toBe(before);
  });

  it('改量只按差额调整库存', () => {
    const store = useDietStore();
    store.hydrate();
    const before = store.getPantryEntry(1).quantity;

    store.addLogEntry('2026-07-30', { ingredientId: 1, amount: 100, mealType: 'lunch' });
    store.updateLogEntry('2026-07-30', 0, { ingredientId: 1, amount: 160, mealType: 'lunch' });

    expect(store.getPantryEntry(1).quantity).toBe(before - 160);
  });

  it('换食材时旧的回补、新的扣减', () => {
    const store = useDietStore();
    store.hydrate();
    const beforeA = store.getPantryEntry(1).quantity;
    const beforeB = store.getPantryEntry(8).quantity;

    store.addLogEntry('2026-07-30', { ingredientId: 1, amount: 120, mealType: 'lunch' });
    store.updateLogEntry('2026-07-30', 0, { ingredientId: 8, amount: 80, mealType: 'lunch' });

    expect(store.getPantryEntry(1).quantity).toBe(beforeA);
    expect(store.getPantryEntry(8).quantity).toBe(beforeB - 80);
  });
});

describe('useDietStore — 营养汇总', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('按每 100g 折算当日总量', () => {
    const store = useDietStore();
    store.hydrate();
    // 鸡胸肉 165kcal / 31g 蛋白 每 100g
    store.addLogEntry('2026-07-30', { ingredientId: 1, amount: 200, mealType: 'lunch' });

    const t = store.dayTotals('2026-07-30');
    expect(t.calories).toBeCloseTo(330, 5);
    expect(t.protein).toBeCloseTo(62, 5);
  });

  it('按餐次分别汇总', () => {
    const store = useDietStore();
    store.hydrate();
    store.addLogEntry('2026-07-30', { ingredientId: 1, amount: 100, mealType: 'breakfast' });
    store.addLogEntry('2026-07-30', { ingredientId: 1, amount: 300, mealType: 'dinner' });

    expect(store.mealMacroSum('2026-07-30', 'breakfast').calories).toBeCloseTo(165, 5);
    expect(store.mealMacroSum('2026-07-30', 'dinner').calories).toBeCloseTo(495, 5);
  });

  it('食材被删除后旧记录不会让汇总崩掉', () => {
    const store = useDietStore();
    store.hydrate();
    store.addLogEntry('2026-07-30', { ingredientId: 1, amount: 100, mealType: 'lunch' });
    store.deleteIngredient(1);

    expect(() => store.dayTotals('2026-07-30')).not.toThrow();
    expect(store.dayTotals('2026-07-30').calories).toBe(0);
  });
});

describe('useDietStore — 餐次下标换算', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('把餐次内序号正确映射到整日数组下标', () => {
    const store = useDietStore();
    store.hydrate();
    store.addLogEntry('2026-07-30', { ingredientId: 1, amount: 10, mealType: 'breakfast' });
    store.addLogEntry('2026-07-30', { ingredientId: 2, amount: 20, mealType: 'dinner' });
    store.addLogEntry('2026-07-30', { ingredientId: 3, amount: 30, mealType: 'breakfast' });

    // 早餐的第 1 条（从 0 起算）应对应整日数组的下标 2
    expect(store.resolveRealIndex('2026-07-30', 'breakfast', 1)).toBe(2);
    expect(store.resolveRealIndex('2026-07-30', 'dinner', 0)).toBe(1);
    expect(store.resolveRealIndex('2026-07-30', 'lunch', 0)).toBe(-1);
  });
});

describe('useDietStore — 套餐模板', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('空白日自动套用默认模板', () => {
    const store = useDietStore();
    store.hydrate();

    expect(store.autoFillIfEmpty('2026-07-30')).toBe(true);
    expect(store.getDayLog('2026-07-30')).toHaveLength(4);
  });

  it('已有记录的日期不自动填充，避免覆盖用户输入', () => {
    const store = useDietStore();
    store.hydrate();
    store.addLogEntry('2026-07-30', { ingredientId: 1, amount: 100, mealType: 'lunch' });

    expect(store.autoFillIfEmpty('2026-07-30')).toBe(false);
    expect(store.getDayLog('2026-07-30')).toHaveLength(1);
  });
});
