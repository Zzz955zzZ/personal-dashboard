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
