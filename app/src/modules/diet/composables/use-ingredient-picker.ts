/**
 * 食材选择器工具
 *
 * v1.0 里这套「搜索 + 按最近使用排序 + 点选」的逻辑在
 * 记录 / 采购 / 库存 / 菜谱 四处各抄了一遍（makeFlatList / filterIngs / selectXxxIngredient）。
 * 这里收敛成单一实现，被各组件的组合式函数复用。
 */

import type { Ingredient } from '../types';

/** 按名称或品牌过滤（品牌用于区分同类产品） */
export function filterIngredients(list: Ingredient[], query: string): Ingredient[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (i) => i.name.toLowerCase().includes(q) || !!i.brand && i.brand.toLowerCase().includes(q),
  );
}

/** 按最近选用时间倒序（未用过的排最后） */
export function sortByRecency(
  list: Ingredient[],
  lastSelected: Record<number, number>,
): Ingredient[] {
  return [...list].sort((a, b) => (lastSelected[b.id] ?? 0) - (lastSelected[a.id] ?? 0));
}
