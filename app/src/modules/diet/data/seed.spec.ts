import { describe, it, expect } from 'vitest';

import { SEED_INGREDIENTS } from './seed';
import type { IngredientCategory } from '../types';

const VALID_CATS: IngredientCategory[] = [
  'protein',
  'carbs',
  'fat',
  'veg',
  'fruit',
  'drink',
];

describe('SEED_INGREDIENTS（精选 + 知识库并入）', () => {
  it('数量约为 80+ 且每条都有合法分类与非空 emoji', () => {
    expect(SEED_INGREDIENTS.length).toBeGreaterThanOrEqual(80);
    for (const it of SEED_INGREDIENTS) {
      expect(VALID_CATS, `分类非法: ${it.name} -> ${it.category}`).toContain(it.category);
      expect(it.emoji.trim().length, `${it.name} 缺少 emoji`).toBeGreaterThan(0);
      expect(it.nutrition).toBeDefined();
    }
  });

  it('id 唯一（合并 curated + extras 不能撞 id）', () => {
    const ids = SEED_INGREDIENTS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('精选 22 条 id 1-22 保持稳定（老用户数据按 id 引用）', () => {
    for (let i = 1; i <= 22; i++) {
      expect(SEED_INGREDIENTS.find((x) => x.id === i)).toBeTruthy();
    }
  });
});
