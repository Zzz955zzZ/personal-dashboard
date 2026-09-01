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
import { DEFAULT_PROFILE_ID } from '../constants';
import type {
  DailyLogs,
  DietProfile,
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

/** 种子食材 id 集合，用于禁用编辑/删除 */
const SEED_IDS = new Set(SEED_INGREDIENTS.map((i) => i.id));
import {
  DEFAULT_TARGETS,
  loadState,
  normalizeState,
  saveState,
  type PersistedState,
} from './persistence';

const EMPTY_NUTRITION: Nutrition = { calories: 0, carbs: 0, protein: 0, fat: 0 };

/**
 * 幽灵食材：当某条记录引用的食材已不存在（被删 / 老数据损坏）时，
 * 用这个占位对象兜底，保证列表与详情页不会渲染出空白名或崩溃，
 * 同时让编辑入口仍然可用（用户可重新关联到真实食材或删除记录）。
 */
const GHOST_INGREDIENT: Ingredient = {
  id: -1,
  name: '未知食材',
  category: 'protein',
  emoji: '❓',
  image: '',
  tags: [],
  nutrition: { ...EMPTY_NUTRITION },
  note: '',
  unit: 'g',
  gramsPerUnit: 1,
};

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
  /** 多用户档案（协同记录）；至少保留一个默认档案「我」 */
  const profiles = ref<DietProfile[]>([]);
  /** 当前正在查看/编辑的用户档案 id */
  const currentUserId = ref<string>('');
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
    seedProfiles();
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

  /** 至少保留一个默认用户档案「我」 */
  function seedProfiles(): void {
    if (profiles.value.length === 0) {
      profiles.value = [
        { id: DEFAULT_PROFILE_ID, name: '我', emoji: '🙂', color: '#fb7185', isDefault: true },
      ];
    }
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
      if (Array.isArray(state.profiles)) profiles.value = state.profiles;
      if (typeof state.currentUserId === 'string' && state.currentUserId) {
        currentUserId.value = state.currentUserId;
      }
    }
    // 老数据 / 老版本迁移：无 userId 的记录统一归入默认档案，避免被隔离隐藏
    for (const date of Object.keys(dailyLogs)) {
      for (const e of dailyLogs[date]!) {
        if (!e.userId) e.userId = DEFAULT_PROFILE_ID;
      }
    }
    seed();
    // 当前选中的用户必须仍存在于档案列表，否则回落到第一个
    if (!profiles.value.some((p) => p.id === currentUserId.value)) {
      currentUserId.value = profiles.value[0]?.id ?? DEFAULT_PROFILE_ID;
    }
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
      profiles: profiles.value,
      currentUserId: currentUserId.value,
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
        profiles.value,
        currentUserId.value,
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

  /** 找不到食材时返回幽灵占位，避免渲染空白/崩溃，且保留可编辑性 */
  const safeIng = (id: number): Ingredient =>
    findIng(id) ?? { ...GHOST_INGREDIENT, id };

  const isSeedIngredient = (id: number): boolean => SEED_IDS.has(id);

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

  /* ---------------- 用户档案 / 多用户隔离 ---------------- */
  /** 当前激活的档案；无匹配时返回 null（隔离关闭，显示全部） */
  const activeProfile = computed<DietProfile | null>(
    () => profiles.value.find((p) => p.id === currentUserId.value) ?? null,
  );
  /** 是否启用按用户隔离（存在激活档案时启用） */
  const isolationOn = computed(() => activeProfile.value !== null);

  /** 取一条记录归属的 userId；缺失时回退到默认档案，保证老数据始终可见 */
  function ownerOf(e: LogEntry): string {
    return e.userId ?? DEFAULT_PROFILE_ID;
  }

  /** 按当前用户过滤记录集合；隔离关闭时原样返回（兼容老测试 / 未初始化态） */
  function visibleForUser(entries: LogEntry[]): LogEntry[] {
    if (!isolationOn.value) return entries;
    const uid = currentUserId.value;
    return entries.filter((e) => ownerOf(e) === uid);
  }

  function setCurrentUser(id: string): void {
    if (profiles.value.some((p) => p.id === id)) currentUserId.value = id;
  }

  /** 新增或更新用户档案；editingId 为 null 时新增 */
  function saveProfile(data: Omit<DietProfile, 'id'>, editingId: string | null): void {
    if (editingId !== null) {
      const p = profiles.value.find((x) => x.id === editingId);
      if (p) Object.assign(p, data);
    } else {
      profiles.value.push({ id: `u${Date.now()}`, ...data });
    }
  }

  /**
   * 删除用户档案。至少保留一个；被删用户的记录并入其他档案（默认回落到第一个），
   * 避免误删导致数据丢失。当前用户被删时自动切换到 fallback。
   */
  function deleteProfile(id: string): void {
    const idx = profiles.value.findIndex((p) => p.id === id);
    if (idx < 0 || profiles.value.length <= 1) return;
    const fallback = profiles.value.find((p) => p.id !== id) ?? profiles.value[0]!;
    for (const date of Object.keys(dailyLogs)) {
      for (const e of dailyLogs[date]!) {
        if (ownerOf(e) === id) e.userId = fallback.id;
      }
    }
    profiles.value.splice(idx, 1);
    if (currentUserId.value === id) currentUserId.value = fallback.id;
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
    return sumEntries(visibleForUser(getDayLog(date)));
  }

  /** 仅返回当前用户可见的某餐次记录；_idx 仍是「整日数组」真实下标，供编辑/删除定位 */
  function mealEntries(date: string, mealType: MealType): Array<LogEntry & { _idx: number }> {
    const on = isolationOn.value;
    const uid = currentUserId.value;
    return getDayLog(date)
      .map((e, i) => ({ ...e, _idx: i }))
      .filter((e) => e.mealType === mealType && (!on || ownerOf(e) === uid));
  }

  function mealMacroSum(date: string, mealType: MealType): Nutrition {
    return sumEntries(visibleForUser(getDayLog(date)).filter((e) => e.mealType === mealType));
  }

  /** 当前用户在某天的全部记录（用于空状态判断等） */
  function visibleDayLog(date: string): LogEntry[] {
    return visibleForUser(getDayLog(date));
  }

  /** 新增记录并同步扣库存，返回新条目以便撤销；隔离开启时自动标记归属用户 */
  function addLogEntry(date: string, entry: LogEntry): LogEntry {
    const list = getDayLog(date);
    const newEntry: LogEntry = { ...entry };
    if (isolationOn.value) newEntry.userId = currentUserId.value;
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
    const source = visibleForUser(getDayLog(fromDate)).map((e) => ({ ...e }));
    const targetLog = getDayLog(toDate);
    const before = targetLog.map((e) => ({ ...e }));

    for (const e of source) {
      targetLog.push({ ...e, userId: isolationOn.value ? currentUserId.value : e.userId });
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
    const source = visibleForUser(getDayLog(fromDate))
      .filter((e) => e.mealType === fromMeal)
      .map((e) => ({ ...e }));
    const targetLog = getDayLog(toDate);
    const before = targetLog.map((e) => ({ ...e }));

    for (const e of source) {
      targetLog.push({ ingredientId: e.ingredientId, amount: e.amount, mealType: toMeal, userId: isolationOn.value ? currentUserId.value : e.userId });
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
    const uid = isolationOn.value ? currentUserId.value : undefined;
    for (const item of tmpl.items) {
      list.push({
        ingredientId: item.ingredientId,
        amount: item.amount,
        mealType: tmpl.defaultMealType || 'breakfast',
        userId: uid,
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
   * 自动套用每个餐次的默认套餐。
   * 当某餐次为空且存在该餐次的默认模板时，自动填入。
   * 返回总共填充了多少项。
   */
  function autoFillDefaults(date: string): number {
    const defaults = mealTemplates.value.filter((t) => t.isDefault && t.items.length);
    if (!defaults.length) return 0;
    // 按「当前用户」判断某餐是否已有记录，避免把其他用户的餐次当成已填充
    const userEntries = visibleForUser(getDayLog(date));
    const uid = isolationOn.value ? currentUserId.value : undefined;
    let filled = 0;
    for (const tmpl of defaults) {
      const mealType = tmpl.defaultMealType || 'breakfast';
      const hasMeal = userEntries.some((e) => e.mealType === mealType);
      if (hasMeal) continue;
      for (const item of tmpl.items) {
        getDayLog(date).push({ ...item, mealType, userId: uid });
        deductPantry(item.ingredientId, item.amount);
      }
      filled += tmpl.items.length;
    }
    return filled;
  }

  /* ---------------- 食材 / 菜谱 CRUD ---------------- */
  /**
   * 生成不与现有食材冲突的新 id。
   * 旧实现直接用 Date.now()，同一毫秒内连续新增会碰撞（导致部分记录「显示错食材」）。
   * 这里取 max(现有最大 id, Date.now()) + 1，保证单调递增且永不重复。
   */
  function nextIngredientId(): number {
    const maxExisting = ingredients.value.reduce((m, i) => Math.max(m, i.id), 0);
    return Math.max(maxExisting + 1, Date.now());
  }

  function saveIngredient(data: Omit<Ingredient, 'id'>, editingId: number | null): void {
    if (editingId !== null) {
      const it = ingredients.value.find((x) => x.id === editingId);
      if (it) Object.assign(it, data);
    } else {
      ingredients.value.push({ id: nextIngredientId(), ...data });
    }
  }

  /**
   * 删除食材并级联清理其引用：每日记录、库存、采购清单。
   * 返回被级联删除的记录条数（供 UI 提示）。
   * 这样从根上杜绝「删了食材却留下孤儿记录」这类异常数据复现。
   */
  function deleteIngredient(id: number): number {
    let removedLogs = 0;
    for (const date of Object.keys(dailyLogs)) {
      const before = dailyLogs[date]!.length;
      dailyLogs[date] = dailyLogs[date]!.filter((e) => e.ingredientId !== id);
      removedLogs += before - dailyLogs[date]!.length;
    }
    pantry.value = pantry.value.filter((p) => p.ingredientId !== id);
    shopping.value = shopping.value.filter((s) => s.ingredientId !== id);
    const i = ingredients.value.findIndex((x) => x.id === id);
    if (i > -1) ingredients.value.splice(i, 1);
    return removedLogs;
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
    if (Array.isArray(d.profiles) && d.profiles.length) profiles.value = d.profiles;
    if (typeof d.currentUserId === 'string' && d.currentUserId) currentUserId.value = d.currentUserId;
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
    profiles,
    currentUserId,
    activeProfile,
    isolationOn,
    // lifecycle
    hydrate,
    seed,
    persist,
    startAutoPersist,
    startStockWatcher,
    snapshot,
    // query
    findIng,
    safeIng,
    isSeedIngredient,
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
    visibleDayLog,
    addLogEntry,
    removeLogEntryAt,
    resolveRealIndex,
    updateLogEntry,
    // profiles / multi-user
    setCurrentUser,
    saveProfile,
    deleteProfile,
    // copy
    copyDay,
    copyMeal,
    // templates
    applyTemplate,
    saveTemplate,
    deleteTemplate,
    autoFillDefaults,
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
