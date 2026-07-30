/**
 * store 行为回归
 *
 * 重点覆盖「记录 <-> 库存」的联动：v1.0 里这块逻辑散在组件里，最容易在迁移中改错。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useDietStore } from './diet-store';
import { DIET_DB_KEY } from '../index';
import type { LogEntry } from '../types';

const D1 = '2026-07-30';
const D2 = '2026-07-31';

function freshStore() {
  setActivePinia(createPinia());
  const store = useDietStore();
  store.hydrate();
  return store;
}

/** 取第一个 g 单位食材的 id，避免依赖具体种子内容 */
function pickIds(store: ReturnType<typeof freshStore>): [number, number] {
  const gs = store.ingredients.filter((i) => i.unit !== '个');
  return [gs[0]!.id, gs[1]!.id];
}

beforeEach(() => {
  localStorage.clear();
});

describe('日志与库存联动', () => {
  it('新增记录会扣减库存，且库存不会为负', () => {
    const store = freshStore();
    const [id] = pickIds(store);
    store.getPantryEntry(id).quantity = 120;

    store.addLogEntry(D1, { ingredientId: id, amount: 200, mealType: 'lunch' });

    expect(store.getPantryEntry(id).quantity).toBe(0);
    expect(store.getDayLog(D1)).toHaveLength(1);
  });

  it('删除记录会回补库存并返回被删条目', () => {
    const store = freshStore();
    const [id] = pickIds(store);
    store.getPantryEntry(id).quantity = 500;
    store.addLogEntry(D1, { ingredientId: id, amount: 200, mealType: 'lunch' });

    const removed = store.removeLogEntryAt(D1, 0);

    expect(removed?.amount).toBe(200);
    expect(store.getPantryEntry(id).quantity).toBe(500);
    expect(store.getDayLog(D1)).toHaveLength(0);
  });

  it('删除越界下标返回 null 而不是抛异常', () => {
    const store = freshStore();
    expect(store.removeLogEntryAt(D1, 5)).toBeNull();
  });

  it('同食材改克重只按差值调整库存', () => {
    const store = freshStore();
    const [id] = pickIds(store);
    store.getPantryEntry(id).quantity = 500;
    store.addLogEntry(D1, { ingredientId: id, amount: 100, mealType: 'lunch' });
    expect(store.getPantryEntry(id).quantity).toBe(400);

    store.updateLogEntry(D1, 0, { ingredientId: id, amount: 150, mealType: 'lunch' });
    expect(store.getPantryEntry(id).quantity).toBe(350);

    store.updateLogEntry(D1, 0, { ingredientId: id, amount: 50, mealType: 'lunch' });
    expect(store.getPantryEntry(id).quantity).toBe(450);
  });

  it('换食材时旧食材全额回补、新食材全额扣减', () => {
    const store = freshStore();
    const [a, b] = pickIds(store);
    store.getPantryEntry(a).quantity = 500;
    store.getPantryEntry(b).quantity = 500;
    store.addLogEntry(D1, { ingredientId: a, amount: 100, mealType: 'lunch' });

    store.updateLogEntry(D1, 0, { ingredientId: b, amount: 80, mealType: 'lunch' });

    expect(store.getPantryEntry(a).quantity).toBe(500);
    expect(store.getPantryEntry(b).quantity).toBe(420);
  });
});

describe('餐次下标换算', () => {
  it('resolveRealIndex 能把餐内序号换成整日下标', () => {
    const store = freshStore();
    const [a, b] = pickIds(store);
    const rows: LogEntry[] = [
      { ingredientId: a, amount: 10, mealType: 'breakfast' },
      { ingredientId: b, amount: 20, mealType: 'lunch' },
      { ingredientId: a, amount: 30, mealType: 'lunch' },
    ];
    for (const r of rows) store.getDayLog(D1).push(r);

    expect(store.resolveRealIndex(D1, 'lunch', 0)).toBe(1);
    expect(store.resolveRealIndex(D1, 'lunch', 1)).toBe(2);
    expect(store.resolveRealIndex(D1, 'dinner', 0)).toBe(-1);
  });

  it('mealEntries 带回真实下标 _idx', () => {
    const store = freshStore();
    const [a, b] = pickIds(store);
    store.getDayLog(D1).push({ ingredientId: a, amount: 10, mealType: 'breakfast' });
    store.getDayLog(D1).push({ ingredientId: b, amount: 20, mealType: 'dinner' });

    const dinner = store.mealEntries(D1, 'dinner');
    expect(dinner).toHaveLength(1);
    expect(dinner[0]!._idx).toBe(1);
  });
});

describe('复制', () => {
  it('copyDay 不勾选扣库存时只搬记录', () => {
    const store = freshStore();
    const [id] = pickIds(store);
    store.getPantryEntry(id).quantity = 500;
    store.getDayLog(D1).push({ ingredientId: id, amount: 100, mealType: 'lunch' });

    const { count } = store.copyDay(D1, D2, false);

    expect(count).toBe(1);
    expect(store.getDayLog(D2)).toHaveLength(1);
    expect(store.getPantryEntry(id).quantity).toBe(500);
  });

  it('copyDay 勾选扣库存后 revert 能完整还原记录与库存', () => {
    const store = freshStore();
    const [id] = pickIds(store);
    store.getPantryEntry(id).quantity = 500;
    store.getDayLog(D1).push({ ingredientId: id, amount: 100, mealType: 'lunch' });
    store.getDayLog(D2).push({ ingredientId: id, amount: 40, mealType: 'breakfast' });

    const { revert } = store.copyDay(D1, D2, true);
    expect(store.getDayLog(D2)).toHaveLength(2);
    expect(store.getPantryEntry(id).quantity).toBe(400);

    revert();
    expect(store.getDayLog(D2)).toHaveLength(1);
    expect(store.getDayLog(D2)[0]!.amount).toBe(40);
    expect(store.getPantryEntry(id).quantity).toBe(500);
  });

  it('copyMeal 只搬指定餐次并改写目标餐次', () => {
    const store = freshStore();
    const [a, b] = pickIds(store);
    store.getPantryEntry(a).quantity = 500;
    store.getPantryEntry(b).quantity = 500;
    store.getDayLog(D1).push({ ingredientId: a, amount: 100, mealType: 'breakfast' });
    store.getDayLog(D1).push({ ingredientId: b, amount: 50, mealType: 'dinner' });

    const { count, revert } = store.copyMeal(D1, 'breakfast', D2, 'lunch');

    expect(count).toBe(1);
    expect(store.getDayLog(D2)).toHaveLength(1);
    expect(store.getDayLog(D2)[0]!.mealType).toBe('lunch');
    expect(store.getPantryEntry(a).quantity).toBe(400);

    revert();
    expect(store.getDayLog(D2)).toHaveLength(0);
    expect(store.getPantryEntry(a).quantity).toBe(500);
  });
});

describe('模板', () => {
  it('autoFillIfEmpty 只在当日为空且存在默认模板时填充', () => {
    const store = freshStore();
    const [id] = pickIds(store);
    for (const t of store.mealTemplates) t.isDefault = false;
    store.saveTemplate(
      {
        name: 'T',
        emoji: '🍽️',
        isDefault: true,
        defaultMealType: 'breakfast',
        items: [{ ingredientId: id, amount: 60 }],
      },
      null,
    );

    expect(store.autoFillIfEmpty(D1)).toBe(true);
    expect(store.getDayLog(D1)).toHaveLength(1);
    // 已有记录时不再重复填充
    expect(store.autoFillIfEmpty(D1)).toBe(false);
    expect(store.getDayLog(D1)).toHaveLength(1);
  });

  it('saveTemplate 传 editingId 走更新而不是新增', () => {
    const store = freshStore();
    const before = store.mealTemplates.length;
    store.saveTemplate(
      { name: 'A', emoji: '🍽️', isDefault: false, defaultMealType: 'lunch', items: [] },
      null,
    );
    const created = store.mealTemplates[store.mealTemplates.length - 1]!;

    store.saveTemplate(
      { name: 'B', emoji: '🥗', isDefault: false, defaultMealType: 'dinner', items: [] },
      created.id,
    );

    expect(store.mealTemplates).toHaveLength(before + 1);
    expect(created.name).toBe('B');
    expect(created.defaultMealType).toBe('dinner');
  });
});

describe('采购与库存', () => {
  it('勾选已买会把数量并入库存', () => {
    const store = freshStore();
    const [id] = pickIds(store);
    store.getPantryEntry(id).quantity = 100;
    const item = { id: 1, ingredientId: id, quantity: 250, done: true };

    store.onShopBought(item);

    expect(store.getPantryEntry(id).quantity).toBe(350);
  });

  it('updateShopQty 拒绝非正数', () => {
    const store = freshStore();
    const [id] = pickIds(store);
    const item = { id: 1, ingredientId: id, quantity: 250, done: false };

    expect(store.updateShopQty(item, 0)).toBe(false);
    expect(store.updateShopQty(item, Number.NaN)).toBe(false);
    expect(item.quantity).toBe(250);

    expect(store.updateShopQty(item, 300)).toBe(true);
    expect(item.quantity).toBe(300);
  });

  it('clearBought 只清掉已勾选项', () => {
    const store = freshStore();
    const [a, b] = pickIds(store);
    store.shopping = [
      { id: 1, ingredientId: a, quantity: 100, done: true },
      { id: 2, ingredientId: b, quantity: 100, done: false },
    ];

    store.clearBought();

    expect(store.shopping).toHaveLength(1);
    expect(store.shopping[0]!.id).toBe(2);
  });
});

describe('持久化闭环', () => {
  it('persist 写入的内容能被新 store 原样读回', () => {
    const store = freshStore();
    const [id] = pickIds(store);
    store.getDayLog(D1).push({ ingredientId: id, amount: 123, mealType: 'dinner' });
    store.targets.calories = 1888;
    store.persist();

    expect(localStorage.getItem(DIET_DB_KEY)).toBeTruthy();

    const reloaded = freshStore();
    expect(reloaded.getDayLog(D1)).toHaveLength(1);
    expect(reloaded.getDayLog(D1)[0]!.amount).toBe(123);
    expect(reloaded.targets.calories).toBe(1888);
  });
});
