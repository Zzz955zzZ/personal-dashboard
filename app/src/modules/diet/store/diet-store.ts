/**
 * 饮食模块数据仓库
 *
 * 为什么是「一个 store」而不是拆成 5 个：
 * v1.0 的 localStorage 是**单一 JSON blob**，五类数据同存同取。
 * 拆成 5 个 store 会让持久化必须跨 store 组装快照，反而制造耦合与竞态。
 * 因此这里按「一份持久化边界 = 一个 store」来划分，内部再按领域分区。
 */

import { computed, reactive, ref, watch } from 'vue';
import { defineStore } from 'pinia';

import { detectMicrons, fromGrams, toGrams } from '../engine';
import type {
  DailyLogs,
  Ingredient,
  LogEntry,
  MealTemplate,
  MealType,
  Nutrition,
  PantryItem,
  Recipe,
  ShoppingItem,
  Targets,
} from '../types';
import {
  SEED_INGREDIENTS,
  SEED_MEAL_TEMPLATES,
  SEED_PANTRY,
  SEED_RECIPES,
  SEED_SHOPPING,
} from '../data/seed';
import {
  DEFAULT_TARGETS,
  loadState,
  normalizeState,
  saveState,
  type PersistedState,
} from './persistence';

const EMPTY_NUTRITION: Nutrition = { calories: 0, carbs: 0, protein: 0, fat: 0 };

/** 种子食材按 id 索引，用于把最新版营养/解析同步到已装载的库里 */
const SEED_BY_ID = new Map(SEED_INGREDIENTS.map((it) => [it.id, it]));

export const useDietStore = defineStore('diet', () => {
  /* ---------------- state ---------------- */
  const ingredients = ref<Ingredient[]>([]);
  const recipes = ref<Recipe[]>([]);
  const pantry = ref<PantryItem[]>([]);
  const shopping = ref<ShoppingItem[]>([]);
  const dailyLogs = reactive<DailyLogs>({});
  const targets = reactive<Targets>({ ...DEFAULT_TARGETS });
  const mealTemplates = ref<MealTemplate[]>([]);
  /** 食材最近选用时间，用于选择器按「最近用过」排序 */
  const ingLastSelected = reactive<Record<number, number>>({});
  /** 数据损坏时保留原文，供 UI 提示并允许应急导出 */
  const corruptedRaw = ref<string | null>(null);

  /* ---------------- 装载 ---------------- */
  /**
   * 将种子库的最新三大营养素与 note 解析同步到当前已装载的「同名标准食材」上，
   * 使老用户无需重装也能用到修正后的数据。幂等，不新增持久化字段（v1 兼容）。
   */
  function syncSeedNutrition(): void {
    for (const ing of ingredients.value) {
      const s = SEED_BY_ID.get(ing.id);
      if (s && s.name === ing.name) {
        ing.nutrition = { ...s.nutrition };
        ing.note = s.note;
      }
    }
  }

  function seed(): void {
    // 食材：合并式装载 —— 保留已有条目（含用户自定义），补齐缺失的种子食材，
    // 使老用户无需重装即可获得新增的全部库。
    const existingById = new Map(ingredients.value.map((i) => [i.id, i]));
    const merged: Ingredient[] = [];
    const seen = new Set<number>();
    for (const s of SEED_INGREDIENTS) {
      seen.add(s.id);
      const ex = existingById.get(s.id);
      if (ex) merged.push(ex);
      else merged.push({ ...s, microns: detectMicrons(s.name) });
    }
    for (const ex of ingredients.value) {
      if (!seen.has(ex.id)) merged.push(ex);
    }
    ingredients.value = merged;

    // 其余数据仅首次运行填充，避免覆盖用户已有内容
    if (recipes.value.length === 0) recipes.value = SEED_RECIPES.map((r) => ({ ...r }));
    if (pantry.value.length === 0) pantry.value = SEED_PANTRY.map((p) => ({ ...p }));
    if (shopping.value.length === 0) shopping.value = SEED_SHOPPING.map((s) => ({ ...s }));
    if (mealTemplates.value.length === 0)
      mealTemplates.value = SEED_MEAL_TEMPLATES.map((t) => ({
        ...t,
        items: t.items.map((i) => ({ ...i })),
      }));
  }

  function hydrate(): void {
    const { found, state, corruptedRaw: bad } = loadState(detectMicrons);
    if (bad) corruptedRaw.value = bad;
    if (found) {
      if (state.ingredients) ingredients.value = state.ingredients;
      if (state.recipes) recipes.value = state.recipes;
      if (state.pantry) pantry.value = state.pantry;
      if (state.shopping) shopping.value = state.shopping;
      if (state.dailyLogs) Object.assign(dailyLogs, state.dailyLogs);
      if (state.targets) Object.assign(targets, state.targets);
      if (state.ingLastSelected) Object.assign(ingLastSelected, state.ingLastSelected);
      if (state.mealTemplates) mealTemplates.value = state.mealTemplates;
    }
    seed();
    // 把种子库最新的营养/解析同步到老用户的同名标准食材上
    syncSeedNutrition();
    if (found) persist();
  }

  function snapshot(): PersistedState {
    return {
      ingredients: ingredients.value,
      recipes: recipes.value,
      pantry: pantry.value,
      shopping: shopping.value,
      dailyLogs,
      targets,
      ingLastSelected,
      mealTemplates: mealTemplates.value,
    };
  }

  function persist(): void {
    saveState(JSON.parse(JSON.stringify(snapshot())) as PersistedState);
  }

  /**
   * 防抖落盘：每次变更不再同步全量序列化整份快照（85 条食材含图片 base64，
   * 深监听下高频触发 JSON.stringify 很费）。改为 300ms 合并写入；
   * 页面隐藏/卸载前强制 flush，避免防抖窗口内数据丢失。
   */
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  function schedulePersist(): void {
    if (persistTimer !== null) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persist();
    }, 300);
  }

  function flushPersist(): void {
    if (persistTimer !== null) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    persist();
  }

  let persistEnabled = false;
  function startAutoPersist(): void {
    if (persistEnabled) return;
    persistEnabled = true;
    watch(
      () => [
        ingredients.value,
        recipes.value,
        pantry.value,
        shopping.value,
        dailyLogs,
        targets,
        ingLastSelected,
        mealTemplates.value,
      ],
      () => schedulePersist(),
      { deep: true },
    );
    if (typeof window !== 'undefined') {
      const flush = (): void => flushPersist();
      window.addEventListener('pagehide', flush);
      window.addEventListener('beforeunload', flush);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushPersist();
      });
    }
  }

  /**
   * 库存归零 -> 自动加入采购清单。
   * 只在「本次新归零」的食材上触发，避免反复添加已删掉的条目。
   */
  let stockWatcherStarted = false;
  function startStockWatcher(): void {
    if (stockWatcherStarted) return;
    stockWatcherStarted = true;
    let lastZero: number[] = [];
    watch(
      zeroStockIds,
      (nowZero) => {
        for (const iid of nowZero) {
          if (lastZero.includes(iid)) continue;
          const exists = shopping.value.find((s) => s.ingredientId === iid && !s.done);
          if (!exists) {
            shopping.value.push({
              id: Date.now() + Math.random(),
              ingredientId: iid,
              quantity: 500,
              done: false,
            });
          }
        }
        lastZero = [...nowZero];
      },
      { deep: true },
    );
  }

  /* ---------------- 查询 ---------------- */
  const findIng = (id: number): Ingredient | undefined =>
    ingredients.value.find((i) => i.id === id);

  const ingByCat = (cat: Ingredient['category']): Ingredient[] =>
    ingredients.value.filter((i) => i.category === cat);

  const hasInPantry = (ingredientId: number): boolean => {
    const p = pantry.value.find((x) => x.ingredientId === ingredientId);
    return !!p && p.quantity > 0;
  };

  const zeroStockIds = computed(() =>
    pantry.value.filter((p) => p.quantity <= 0).map((p) => p.ingredientId),
  );

  function touchIngredient(id: number): void {
    ingLastSelected[id] = Date.now();
  }

  /* ---------------- 库存 ---------------- */
  function getPantryEntry(ingredientId: number): PantryItem {
    let entry = pantry.value.find((p) => p.ingredientId === ingredientId);
    if (!entry) {
      entry = { id: Date.now() + Math.random(), ingredientId, quantity: 0 };
      pantry.value.push(entry);
    }
    return entry;
  }

  /** 扣减库存，永不为负（与 v1.0 一致） */
  function deductPantry(ingredientId: number, grams: number): void {
    const e = getPantryEntry(ingredientId);
    e.quantity = Math.max(0, e.quantity - grams);
  }

  function restorePantry(ingredientId: number, grams: number): void {
    getPantryEntry(ingredientId).quantity += grams;
  }

  function adjustPantry(pantryId: number, delta: number): void {
    const p = pantry.value.find((x) => x.id === pantryId);
    if (p) p.quantity = Math.max(0, p.quantity + delta);
  }

  function removePantry(pantryId: number): void {
    const i = pantry.value.findIndex((x) => x.id === pantryId);
    if (i > -1) pantry.value.splice(i, 1);
  }

  function pantryStep(ingredientId: number): number {
    const ing = findIng(ingredientId);
    return ing?.unit === '个' ? Number(ing.gramsPerUnit) || 1 : 50;
  }

  /* ---------------- 采购 ---------------- */
  function addShoppingItem(ingredientId: number, qty: number): void {
    const grams = toGrams(findIng(ingredientId), qty);
    touchIngredient(ingredientId);
    shopping.value.push({ id: Date.now(), ingredientId, quantity: grams, done: false });
  }

  function removeShopping(id: number): void {
    const i = shopping.value.findIndex((s) => s.id === id);
    if (i > -1) shopping.value.splice(i, 1);
  }

  function clearBought(): void {
    for (let i = shopping.value.length - 1; i >= 0; i--) {
      if (shopping.value[i]!.done) shopping.value.splice(i, 1);
    }
  }

  /** 勾选「已买」时把数量并入库存 */
  function onShopBought(item: ShoppingItem): void {
    if (!item.done) return;
    restorePantry(item.ingredientId, item.quantity);
  }

  function updateShopQty(item: ShoppingItem, displayValue: number): boolean {
    if (!Number.isFinite(displayValue) || displayValue <= 0) return false;
    item.quantity = toGrams(findIng(item.ingredientId), displayValue);
    return true;
  }

  function shopDisplayQty(item: ShoppingItem): number {
    return fromGrams(findIng(item.ingredientId), item.quantity);
  }

  /* ---------------- 每日记录 ---------------- */
  function getDayLog(date: string): LogEntry[] {
    if (!dailyLogs[date]) dailyLogs[date] = [];
    return dailyLogs[date]!;
  }

  function sumEntries(entries: LogEntry[]): Nutrition {
    const out: Nutrition = { ...EMPTY_NUTRITION };
    for (const e of entries) {
      const ing = findIng(e.ingredientId);
      if (!ing?.nutrition) continue;
      const f = e.amount / 100;
      out.calories += (ing.nutrition.calories || 0) * f;
      out.carbs += (ing.nutrition.carbs || 0) * f;
      out.protein += (ing.nutrition.protein || 0) * f;
      out.fat += (ing.nutrition.fat || 0) * f;
    }
    return out;
  }

  function dayTotals(date: string): Nutrition {
    return sumEntries(getDayLog(date));
  }

  function mealEntries(date: string, mealType: MealType): Array<LogEntry & { _idx: number }> {
    return getDayLog(date)
      .map((e, i) => ({ ...e, _idx: i }))
      .filter((e) => e.mealType === mealType);
  }

  function mealMacroSum(date: string, mealType: MealType): Nutrition {
    return sumEntries(getDayLog(date).filter((e) => e.mealType === mealType));
  }

  /** 新增记录并同步扣库存，返回新条目以便撤销 */
  function addLogEntry(date: string, entry: LogEntry): LogEntry {
    const list = getDayLog(date);
    const newEntry: LogEntry = { ...entry };
    list.push(newEntry);
    touchIngredient(entry.ingredientId);
    deductPantry(entry.ingredientId, entry.amount);
    return newEntry;
  }

  /** 按真实下标删除，返回被删条目（库存已回补） */
  function removeLogEntryAt(date: string, realIdx: number): LogEntry | null {
    const list = getDayLog(date);
    if (realIdx < 0 || realIdx >= list.length) return null;
    const removed = list.splice(realIdx, 1)[0]!;
    restorePantry(removed.ingredientId, removed.amount);
    return removed;
  }

  /** 把「某餐次内的第 n 条」换算成整日数组的真实下标 */
  function resolveRealIndex(date: string, mealType: MealType, mealIdx: number): number {
    const list = getDayLog(date);
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i]!.mealType === mealType) {
        if (count === mealIdx) return i;
        count++;
      }
    }
    return -1;
  }

  function updateLogEntry(
    date: string,
    realIdx: number,
    next: LogEntry,
  ): LogEntry | null {
    const list = getDayLog(date);
    const old = list[realIdx];
    if (!old) return null;
    const before: LogEntry = { ...old };

    list.splice(realIdx, 1, { ...next });

    if (before.ingredientId === next.ingredientId) {
      // 同一食材：只按差值调整库存
      const diff = next.amount - before.amount;
      if (diff > 0) deductPantry(next.ingredientId, diff);
      else restorePantry(next.ingredientId, -diff);
    } else {
      restorePantry(before.ingredientId, before.amount);
      deductPantry(next.ingredientId, next.amount);
    }
    return before;
  }

  /* ---------------- 复制 ---------------- */
  /**
   * 复制整日记录到目标日期。
   * 返回条数与 revert 闭包 —— 撤销逻辑与复制逻辑写在一起才不会漏掉库存回补。
   */
  function copyDay(
    fromDate: string,
    toDate: string,
    deductStock: boolean,
  ): { count: number; revert: () => void } {
    const source = getDayLog(fromDate).map((e) => ({ ...e }));
    const targetLog = getDayLog(toDate);
    const before = targetLog.map((e) => ({ ...e }));

    for (const e of source) {
      targetLog.push({ ...e });
      if (deductStock) deductPantry(e.ingredientId, e.amount);
    }

    return {
      count: source.length,
      revert: () => {
        const tl = getDayLog(toDate);
        tl.splice(0, tl.length, ...before);
        if (deductStock) {
          for (const e of source) restorePantry(e.ingredientId, e.amount);
        }
      },
    };
  }

  /** 复制单个餐次到目标日期的目标餐次（始终扣库存，与 v1.0 一致） */
  function copyMeal(
    fromDate: string,
    fromMeal: MealType,
    toDate: string,
    toMeal: MealType,
  ): { count: number; revert: () => void } {
    const source = getDayLog(fromDate)
      .filter((e) => e.mealType === fromMeal)
      .map((e) => ({ ...e }));
    const targetLog = getDayLog(toDate);
    const before = targetLog.map((e) => ({ ...e }));

    for (const e of source) {
      targetLog.push({ ingredientId: e.ingredientId, amount: e.amount, mealType: toMeal });
      deductPantry(e.ingredientId, e.amount);
    }

    return {
      count: source.length,
      revert: () => {
        const tl = getDayLog(toDate);
        tl.splice(0, tl.length, ...before);
        for (const e of source) restorePantry(e.ingredientId, e.amount);
      },
    };
  }

  /* ---------------- 套餐模板 ---------------- */
  function applyTemplate(date: string, tmpl: MealTemplate): number {
    const list = getDayLog(date);
    for (const item of tmpl.items) {
      list.push({
        ingredientId: item.ingredientId,
        amount: item.amount,
        mealType: tmpl.defaultMealType || 'breakfast',
      });
      deductPantry(item.ingredientId, item.amount);
    }
    return tmpl.items.length;
  }

  function saveTemplate(data: Omit<MealTemplate, 'id'>, editingId: number | null): void {
    if (data.isDefault) {
      // 单选默认：设新的默认套餐时，自动取消其它默认标记
      for (const t of mealTemplates.value) t.isDefault = false;
    }
    if (editingId !== null) {
      const t = mealTemplates.value.find((x) => x.id === editingId);
      if (t) Object.assign(t, data);
    } else {
      mealTemplates.value.push({ id: Date.now(), ...data });
    }
  }

  function deleteTemplate(id: number): void {
    const i = mealTemplates.value.findIndex((t) => t.id === id);
    if (i > -1) mealTemplates.value.splice(i, 1);
  }

  /**
   * 新的一天且当日无记录时，自动套用默认模板。
   * 返回是否真的填充了。
   */
  function autoFillIfEmpty(date: string): boolean {
    const entries = getDayLog(date);
    if (entries.length > 0) return false;
    const def = mealTemplates.value.find((t) => t.isDefault);
    if (!def || !def.items.length) return false;
    applyTemplate(date, def);
    return true;
  }

  /* ---------------- 食材 / 菜谱 CRUD ---------------- */
  function saveIngredient(data: Omit<Ingredient, 'id'>, editingId: number | null): void {
    if (editingId !== null) {
      const it = ingredients.value.find((x) => x.id === editingId);
      if (it) Object.assign(it, data);
    } else {
      ingredients.value.push({ id: Date.now(), ...data });
    }
  }

  function deleteIngredient(id: number): void {
    const i = ingredients.value.findIndex((x) => x.id === id);
    if (i > -1) ingredients.value.splice(i, 1);
  }

  function saveRecipe(data: Omit<Recipe, 'id'>, editingId: number | null): void {
    if (editingId !== null) {
      const r = recipes.value.find((x) => x.id === editingId);
      if (r) Object.assign(r, data);
    } else {
      recipes.value.push({ id: Date.now(), ...data });
    }
  }

  function deleteRecipe(id: number): void {
    const i = recipes.value.findIndex((x) => x.id === id);
    if (i > -1) recipes.value.splice(i, 1);
  }

  function recipeAllAvailable(r: Recipe): boolean {
    if (!r.ingredientIds?.length) return true;
    return r.ingredientIds.every((iid) => hasInPantry(iid));
  }

  /* ---------------- 导入导出 ---------------- */
  function exportJson(): string {
    return JSON.stringify(snapshot(), null, 2);
  }

  /** 把归一化后的子集写回当前状态（导入 / 恢复共用），并立即持久化 */
  function applyState(d: Partial<PersistedState>): void {
    if (Array.isArray(d.ingredients)) ingredients.value = d.ingredients;
    if (Array.isArray(d.recipes)) recipes.value = d.recipes;
    if (Array.isArray(d.pantry)) pantry.value = d.pantry;
    if (Array.isArray(d.shopping)) shopping.value = d.shopping;
    if (d.dailyLogs) {
      for (const k of Object.keys(dailyLogs)) delete dailyLogs[k];
      Object.assign(dailyLogs, d.dailyLogs);
    }
    if (d.targets) Object.assign(targets, d.targets);
    if (d.ingLastSelected) Object.assign(ingLastSelected, d.ingLastSelected);
    if (Array.isArray(d.mealTemplates)) mealTemplates.value = d.mealTemplates;
    persist();
  }

  /**
   * 从原始 JSON 文本导入（粘贴或上传的 pdash_v4 / 旧版备份）。
   * 走 normalizeState，因此旧格式迁移与自动加载完全一致；导入后自动持久化。
   */
  function importRaw(text: string): { ok: boolean; error?: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: 'JSON 格式错误' };
    }
    const d = normalizeState(parsed, detectMicrons);
    if (Object.keys(d).length === 0) {
      return { ok: false, error: '未识别到任何有效数据' };
    }
    applyState(d);
    return { ok: true };
  }

  function importJson(text: string): { ok: boolean; error?: string } {
    return importRaw(text);
  }

  return {
    // state
    ingredients,
    recipes,
    pantry,
    shopping,
    dailyLogs,
    targets,
    mealTemplates,
    ingLastSelected,
    corruptedRaw,
    // lifecycle
    hydrate,
    seed,
    persist,
    startAutoPersist,
    startStockWatcher,
    snapshot,
    // query
    findIng,
    ingByCat,
    hasInPantry,
    zeroStockIds,
    touchIngredient,
    // pantry
    getPantryEntry,
    deductPantry,
    restorePantry,
    adjustPantry,
    removePantry,
    pantryStep,
    // shopping
    addShoppingItem,
    removeShopping,
    clearBought,
    onShopBought,
    updateShopQty,
    shopDisplayQty,
    // daily log
    getDayLog,
    dayTotals,
    sumEntries,
    mealEntries,
    mealMacroSum,
    addLogEntry,
    removeLogEntryAt,
    resolveRealIndex,
    updateLogEntry,
    // copy
    copyDay,
    copyMeal,
    // templates
    applyTemplate,
    saveTemplate,
    deleteTemplate,
    autoFillIfEmpty,
    // crud
    saveIngredient,
    deleteIngredient,
    saveRecipe,
    deleteRecipe,
    recipeAllAvailable,
    // io
    exportJson,
    importJson,
    importRaw,
  };
});
