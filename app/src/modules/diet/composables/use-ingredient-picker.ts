/**
 * 食材选择器
 *
 * v1.0 里这套「搜索 + 按最近使用排序 + 点选」的逻辑在
 * 记录 / 采购 / 库存 / 菜谱 四处各抄了一遍（makeFlatList / filterIngs / selectXxxIngredient）。
 * 这里收敛成单一实现。
 */

import { computed, ref } from 'vue';

import type { Ingredient } from '../types';

export function filterIngredients(list: Ingredient[], query: string): Ingredient[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((i) => i.name.toLowerCase().includes(q));
}

/** 按最近选用时间倒序（未用过的排最后） */
export function sortByRecency(
  list: Ingredient[],
  lastSelected: Record<number, number>,
): Ingredient[] {
  return [...list].sort((a, b) => (lastSelected[b.id] ?? 0) - (lastSelected[a.id] ?? 0));
}

export interface PickerOptions {
  /** 全部候选食材 */
  source: () => Ingredient[];
  /** 最近选用记录 */
  lastSelected: Record<number, number>;
  /** 选中后的回调 */
  onPick?: (id: number) => void;
}

export function useIngredientPicker(opts: PickerOptions) {
  const search = ref('');
  const open = ref(false);

  const list = computed(() =>
    sortByRecency(filterIngredients(opts.source(), search.value), opts.lastSelected),
  );

  function pick(id: number): void {
    opts.lastSelected[id] = Date.now();
    search.value = '';
    open.value = false;
    opts.onPick?.(id);
  }

  function reset(): void {
    search.value = '';
    open.value = false;
  }

  return { search, open, list, pick, reset };
}
