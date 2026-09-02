/**
 * 多用户（协同记录）回归
 *
 * 覆盖：默认档案注入、按用户隔离、切换导航、当日汇总按用户统计、
 * 删除用户时记录并入他人（不丢失）、档案随持久化保存与恢复。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useDietStore } from './diet-store';

function freshStore() {
  setActivePinia(createPinia());
  const store = useDietStore();
  store.hydrate();
  return store;
}

const DATE = '2026-01-01';

beforeEach(() => {
  localStorage.clear();
});

describe('用户档案初始化', () => {
  it('首次运行注入默认档案「我」并设为当前用户', () => {
    const store = freshStore();
    expect(store.profiles.map((p) => p.id)).toContain('me');
    expect(store.currentUserId).toBe('me');
    // 存在激活档案即启用隔离
    expect(store.isolationOn).toBe(true);
  });

  it('老数据（无 userId）载入后归入默认档案，不会凭空消失', () => {
    const store = freshStore();
    const id = store.ingredients[0]!.id;
    store.getDayLog(DATE).push({ ingredientId: id, amount: 100, mealType: 'breakfast' });
    expect(store.visibleDayLog(DATE)).toHaveLength(1);
  });
});

describe('多用户数据隔离', () => {
  it('新增记录标记当前用户，切换后互不可见', () => {
    const store = freshStore();
    const id = store.ingredients[0]!.id;
    store.addLogEntry(DATE, { ingredientId: id, amount: 100, mealType: 'breakfast' });
    expect(store.mealEntries(DATE, 'breakfast')).toHaveLength(1);

    // 新增第二个用户并切换
    store.saveProfile({ name: '女朋友', emoji: '🐱', color: '#6366f1' }, null);
    const gid = store.profiles.find((p) => p.name === '女朋友')!.id;
    store.setCurrentUser(gid);

    // 当前用户（女朋友）看不到「我」的记录
    expect(store.mealEntries(DATE, 'breakfast')).toHaveLength(0);
    expect(store.visibleDayLog(DATE)).toHaveLength(0);
    // 但底层全量数据仍在（编辑/撤销依赖整日数组）
    expect(store.getDayLog(DATE)).toHaveLength(1);
  });

  it('当日汇总只统计当前用户，不会把他人记录混入', () => {
    const store = freshStore();
    const id = store.ingredients[0]!.id;
    store.setCurrentUser('me');
    store.addLogEntry(DATE, { ingredientId: id, amount: 200, mealType: 'lunch' });
    const meCal = store.dayTotals(DATE).calories;
    expect(meCal).toBeGreaterThan(0);

    store.saveProfile({ name: '女朋友', emoji: '🐱', color: '#6366f1' }, null);
    const gid = store.profiles.find((p) => p.name === '女朋友')!.id;
    store.setCurrentUser(gid);
    // 女朋友当天无任何记录
    expect(store.dayTotals(DATE).calories).toBe(0);

    // 女朋友加一条，不影响「我」的汇总
    store.addLogEntry(DATE, { ingredientId: id, amount: 50, mealType: 'breakfast' });
    store.setCurrentUser('me');
    expect(store.dayTotals(DATE).calories).toBe(meCal);
    store.setCurrentUser(gid);
    expect(store.dayTotals(DATE).calories).toBeGreaterThan(0);
  });
});

describe('删除用户', () => {
  it('删除用户时其记录并入其他用户，数据不丢失', () => {
    const store = freshStore();
    const id = store.ingredients[0]!.id;
    store.setCurrentUser('me');
    store.addLogEntry(DATE, { ingredientId: id, amount: 200, mealType: 'lunch' });

    store.saveProfile({ name: '女朋友', emoji: '🐱', color: '#6366f1' }, null);
    const gid = store.profiles.find((p) => p.name === '女朋友')!.id;
    store.setCurrentUser(gid);
    store.addLogEntry(DATE, { ingredientId: id, amount: 50, mealType: 'breakfast' });
    expect(store.visibleDayLog(DATE)).toHaveLength(1);

    // 删除女朋友
    store.deleteProfile(gid);
    expect(store.profiles.find((p) => p.id === gid)).toBeUndefined();
    // 唯一剩余的是「我」，被删用户的记录并入此处
    store.setCurrentUser('me');
    expect(store.visibleDayLog(DATE)).toHaveLength(2);
  });

  it('至少保留一个档案，删除最后一个用户无效', () => {
    const store = freshStore();
    expect(store.profiles).toHaveLength(1);
    store.deleteProfile('me');
    expect(store.profiles).toHaveLength(1);
  });
});

describe('持久化', () => {
  it('档案与当前用户随快照保存，重载后恢复', () => {
    const store = freshStore();
    store.saveProfile({ name: '女友', emoji: '🐱', color: '#6366f1' }, null);
    const gid = store.profiles.find((p) => p.name === '女友')!.id;
    store.setCurrentUser(gid);
    store.persist();

    const reloaded = freshStore();
    expect(reloaded.profiles.find((p) => p.id === gid)).toBeTruthy();
    expect(reloaded.currentUserId).toBe(gid);
  });
});

describe('默认套餐按用户隔离', () => {
  it('各用户只套用自己的默认套餐，互不串味', () => {
    const store = freshStore();
    // 清掉种子默认套餐，避免干扰断言
    store.mealTemplates.forEach((t) => { t.isDefault = false; });
    const a = store.ingredients[0]!.id;
    const b = store.ingredients[1]!.id;

    // 「我」的默认早餐（食材 a）
    store.setCurrentUser('me');
    store.saveTemplate(
      { name: '我的早餐', emoji: '🍳', isDefault: true, defaultMealType: 'breakfast', items: [{ ingredientId: a, amount: 100 }] },
      null,
    );

    // 新增女朋友并给她自己的默认早餐（食材 b）
    store.saveProfile({ name: '女朋友', emoji: '🐱', color: '#6366f1' }, null);
    const gid = store.profiles.find((p) => p.name === '女朋友')!.id;
    store.setCurrentUser(gid);
    store.saveTemplate(
      { name: '女友早餐', emoji: '💕', isDefault: true, defaultMealType: 'breakfast', items: [{ ingredientId: b, amount: 50 }] },
      null,
    );

    const date = '2026-05-20';

    // 女朋友视角：只填她自己的默认（食材 b）
    store.setCurrentUser(gid);
    store.autoFillDefaults(date);
    const gfBf = store.mealEntries(date, 'breakfast');
    expect(gfBf).toHaveLength(1);
    expect(gfBf[0]!.ingredientId).toBe(b);

    // 我视角：只填我的默认（食材 a），不混入女友的
    store.setCurrentUser('me');
    store.autoFillDefaults(date);
    const meBf = store.mealEntries(date, 'breakfast');
    expect(meBf).toHaveLength(1);
    expect(meBf[0]!.ingredientId).toBe(a);

    // 底层全量仍含两个用户各自的记录（编辑/撤销依赖整日数组）
    expect(store.getDayLog(date)).toHaveLength(2);
  });

  it('保存模板归属当前用户，且默认标记按用户各自单选', () => {
    const store = freshStore();
    store.mealTemplates.forEach((t) => { t.isDefault = false; });
    store.setCurrentUser('me');
    store.saveTemplate(
      { name: '我的午餐', emoji: '🍱', isDefault: true, defaultMealType: 'lunch', items: [] },
      null,
    );
    store.saveProfile({ name: '女朋友', emoji: '🐱', color: '#6366f1' }, null);
    const gid = store.profiles.find((p) => p.name === '女朋友')!.id;

    // 女友建默认午餐，不应清掉「我」的默认午餐
    store.setCurrentUser(gid);
    store.saveTemplate(
      { name: '女友午餐', emoji: '🍱', isDefault: true, defaultMealType: 'lunch', items: [] },
      null,
    );
    expect(store.mealTemplates.find((t) => t.name === '我的午餐')!.isDefault).toBe(true);
    expect(store.mealTemplates.find((t) => t.name === '女友午餐')!.userId).toBe(gid);

    // 「我」的模板列表看不到女友的
    store.setCurrentUser('me');
    const meList = store.mealTemplates.filter((t) => (t.userId ?? 'me') === 'me');
    expect(meList.find((t) => t.name === '女友午餐')).toBeUndefined();
  });
});
