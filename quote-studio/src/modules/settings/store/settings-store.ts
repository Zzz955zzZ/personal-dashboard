/**
 * 设置 Pinia Store（单例：Settings / CompanyProfile；全局：分类）。
 *
 * 分类全局唯一（强约束 #7）：仅此 store 维护大类 / 小类，报价行只引用 id。
 * 持久化经 SyncAdapter：默认写 localStorage；若 supabaseConfig 非空则双写到 Supabase 表。
 */

import { ref } from 'vue';
import { defineStore } from 'pinia';

import type {
  Carpeta,
  CategoryGroup,
  CompanyProfile,
  ProductStatusOption,
  ProductTemplate,
  Settings,
  SubCategory,
} from '../types';
import {
  DEFAULT_CARPETAS,
  DEFAULT_CATEGORY_GROUPS,
  DEFAULT_COMPANY,
  DEFAULT_SETTINGS,
  DEFAULT_SUBCATEGORIES,
} from '../constants';
import {
  loadSettingsState,
  normalizeCarpeta,
  normalizeCategoryGroup,
  normalizeCompanyProfile,
  normalizeSettings,
  normalizeSubCategory,
  saveSettingsState,
} from './persistence';
import { genId, normalizeUnitInput } from '@/shared/util';
import { setSupabaseConfig, syncPush } from '@/shared/sync';
import { notify } from '@/shared/notify';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({ ...DEFAULT_SETTINGS });
  const companyProfile = ref<CompanyProfile>({ ...DEFAULT_COMPANY });
  const categoryGroups = ref<CategoryGroup[]>([]);
  const subCategories = ref<SubCategory[]>([]);
  const carpetas = ref<Carpeta[]>([]);
  const carpetasSeeded = ref<boolean>(false);

  /* ---- 初始化（幂等）---- */
  let hydrated = false;
  function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    const { found, state } = loadSettingsState();
    if (!found) {
      // 首启：写入默认种子
      settings.value = { ...DEFAULT_SETTINGS };
      companyProfile.value = { ...DEFAULT_COMPANY };
      categoryGroups.value = DEFAULT_CATEGORY_GROUPS.map((g) => ({ ...g }));
      subCategories.value = DEFAULT_SUBCATEGORIES.map((s) => ({ ...s }));
      carpetas.value = DEFAULT_CARPETAS.map((c) => ({ ...c }));
      carpetasSeeded.value = true;
      persist();
    } else {
      settings.value = state.settings;
      companyProfile.value = state.companyProfile;
      categoryGroups.value = state.categoryGroups;
      subCategories.value = state.subCategories;
      carpetas.value = state.carpetas;
      if (!state.carpetasSeeded) {
        // 旧数据一次性迁移：补上默认档案夹（不会覆盖用户已有的自定义档案夹）
        carpetas.value = DEFAULT_CARPETAS.map((c) => ({ ...c }));
      }
      carpetasSeeded.value = true;
      persist();
    }
    // 加载时保留用户/仓库自定义的 order 序列号，不在 hydrate 时覆盖；
    // 重新编号仅在主动增删改/拖拽排序/恢复默认时进行。
    setSupabaseConfig(settings.value.supabaseConfig);
  }

  function persist(): void {
    if (
      !saveSettingsState({
        settings: settings.value,
        companyProfile: companyProfile.value,
        categoryGroups: categoryGroups.value,
        subCategories: subCategories.value,
        carpetas: carpetas.value,
        carpetasSeeded: carpetasSeeded.value,
      })
    ) {
      notify('error', '设置数据保存失败：本地存储不可用（可能磁盘已满或处于隐私模式）。');
    }
    setSupabaseConfig(settings.value.supabaseConfig);
    void syncPush('category_groups', categoryGroups.value as unknown as Record<string, unknown>[]);
    void syncPush('sub_categories', subCategories.value as unknown as Record<string, unknown>[]);
    void syncPush('company_profile', [companyProfile.value] as unknown as Record<string, unknown>[]);
    void syncPush('settings', [settings.value] as unknown as Record<string, unknown>[]);
  }

  /* ---- 设置 / 公司资料 ---- */
  function updateSettings(patch: Partial<Settings>): void {
    settings.value = { ...settings.value, ...patch };
    persist();
  }
  function updateCompanyProfile(patch: Partial<CompanyProfile>): void {
    companyProfile.value = { ...companyProfile.value, ...patch };
    persist();
  }

  /* ---- 分类（全局唯一）---- */
  function sortedGroups(): CategoryGroup[] {
    return categoryGroups.value.slice().sort((a, b) => a.order - b.order);
  }
  function renumberCategoryGroups(): void {
    sortedGroups().forEach((g, idx) => {
      const target = categoryGroups.value.find((x) => x.id === g.id);
      if (target) target.order = idx + 1;
    });
  }
  function addCategoryGroup(payload: { name: string; nameEs?: string; icon?: string }): CategoryGroup {
    renumberCategoryGroups();
    const order = categoryGroups.value.length + 1;
    const g: CategoryGroup = {
      id: genId('cg'),
      name: payload.name.trim() || '未命名大类',
      nameEs: (payload.nameEs ?? '').trim(),
      icon: (payload.icon ?? '').trim(),
      order,
      products: [],
    };
    categoryGroups.value.push(g);
    persist();
    return g;
  }
  function updateCategoryGroup(id: string, patch: Partial<CategoryGroup>): void {
    const g = categoryGroups.value.find((x) => x.id === id);
    if (!g) return;
    Object.assign(g, patch);
    persist();
  }
  function removeCategoryGroup(id: string): void {
    categoryGroups.value = categoryGroups.value.filter((g) => g.id !== id);
    subCategories.value = subCategories.value.filter((s) => s.groupId !== id);
    renumberCategoryGroups();
    persist();
  }
  function resetCategoryGroupsToDefaults(): void {
    categoryGroups.value = DEFAULT_CATEGORY_GROUPS.map((g) => ({ ...g }));
    subCategories.value = DEFAULT_SUBCATEGORIES.map((s) => ({ ...s }));
    renumberCategoryGroups();
    persist();
  }

  /* ---- 产品模板（归属大类，设置中心集中维护）---- */
  function getGroup(gid: string): CategoryGroup | undefined {
    return categoryGroups.value.find((g) => g.id === gid);
  }
  function addProductTemplate(groupId: string, payload?: Partial<ProductTemplate>): ProductTemplate {
    const g = getGroup(groupId);
    const t: ProductTemplate = {
      id: genId('pt'),
      name: (payload?.name ?? '').trim() || '新产品模板',
      nameEs: (payload?.nameEs ?? '').trim(),
      model: (payload?.model ?? '').trim(),
      note: (payload?.note ?? '').trim(),
      defaultCost: Number(payload?.defaultCost) || 0,
      defaultSalePrice: Number(payload?.defaultSalePrice) || 0,
      defaultUnit: (payload?.defaultUnit ?? '').trim() || settings.value.defaultUnit,
      photoUrls: Array.isArray(payload?.photoUrls) ? payload.photoUrls.filter(Boolean) : [],
    };
    if (g) {
      g.products.push(t);
      persist();
    }
    return t;
  }
  function updateProductTemplate(groupId: string, templateId: string, patch: Partial<ProductTemplate>): void {
    const g = getGroup(groupId);
    const t = g?.products.find((x) => x.id === templateId);
    if (!t) return;
    Object.assign(t, patch);
    persist();
  }
  function removeProductTemplate(groupId: string, templateId: string): void {
    const g = getGroup(groupId);
    if (!g) return;
    g.products = g.products.filter((x) => x.id !== templateId);
    persist();
  }
  function moveProductTemplate(groupId: string, templateId: string, dir: -1 | 1): void {
    const g = getGroup(groupId);
    if (!g) return;
    const list = g.products.slice();
    const idx = list.findIndex((x) => x.id === templateId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= list.length) return;
    const a = list[idx];
    list[idx] = list[swap];
    list[swap] = a;
    g.products = list;
    persist();
  }
  function reorderProductTemplates(groupId: string, sourceId: string, targetId: string): void {
    const g = getGroup(groupId);
    if (!g || sourceId === targetId) return;
    const list = g.products.slice();
    const sIdx = list.findIndex((x) => x.id === sourceId);
    const tIdx = list.findIndex((x) => x.id === targetId);
    if (sIdx < 0 || tIdx < 0) return;
    const [moved] = list.splice(sIdx, 1);
    list.splice(tIdx, 0, moved);
    g.products = list;
    persist();
  }

  /* ---- 产品状态选项（可自定义）---- */
  function getProductStatus(id: string): ProductStatusOption | undefined {
    return settings.value.productStatusOptions.find((s) => s.id === id);
  }
  function addProductStatusOption(payload: { name: string; color?: string }): ProductStatusOption {
    const opts = settings.value.productStatusOptions;
    const s: ProductStatusOption = {
      id: genId('ps'),
      name: payload.name.trim() || '状态',
      color: (payload.color ?? '#5C4F42').trim() || '#5C4F42',
    };
    opts.push(s);
    updateSettings({ productStatusOptions: opts.slice() });
    return s;
  }
  function updateProductStatusOption(id: string, patch: Partial<ProductStatusOption>): void {
    const opts = settings.value.productStatusOptions;
    const idx = opts.findIndex((s) => s.id === id);
    if (idx < 0) return;
    opts[idx] = { ...opts[idx], ...patch };
    updateSettings({ productStatusOptions: opts.slice() });
  }
  function removeProductStatusOption(id: string): void {
    const opts = settings.value.productStatusOptions.filter((s) => s.id !== id);
    updateSettings({ productStatusOptions: opts });
  }

  /* ---- 单位选项（可自定义）---- */
  function addUnitOption(name: string): void {
    const n = normalizeUnitInput(name.trim());
    if (!n) return;
    const opts = settings.value.unitOptions.slice();
    if (opts.includes(n)) return;
    opts.push(n);
    updateSettings({ unitOptions: opts });
  }
  function removeUnitOption(name: string): void {
    const opts = settings.value.unitOptions.filter((u) => u !== name);
    updateSettings({ unitOptions: opts });
  }
  function setDefaultUnit(name: string): void {
    const n = name.trim();
    if (!n) return;
    updateSettings({ defaultUnit: n });
  }

  /* ---- 售价单位选项（可自定义，与数量单位同构）---- */
  function addSalePriceUnitOption(name: string): void {
    const n = normalizeUnitInput(name.trim());
    if (!n) return;
    const opts = settings.value.salePriceUnitOptions.slice();
    if (opts.includes(n)) return;
    opts.push(n);
    updateSettings({ salePriceUnitOptions: opts });
  }
  function removeSalePriceUnitOption(name: string): void {
    const opts = settings.value.salePriceUnitOptions.filter((u) => u !== name);
    updateSettings({ salePriceUnitOptions: opts });
  }
  function setDefaultSalePriceUnit(name: string): void {
    const n = name.trim();
    if (!n) return;
    updateSettings({ defaultSalePriceUnit: n });
  }

  /* ---- 档案夹（可自定义归档分类）---- */
  const CARPETA_PALETTE = ['#5C4F42', '#8a7a66', '#3d342b', '#a99c89', '#7d6e5d', '#4a4640'];
  function sortedCarpetas(): Carpeta[] {
    return carpetas.value.slice().sort((a, b) => a.order - b.order);
  }
  function addCarpeta(payload: { name: string; color?: string }): Carpeta {
    const order = carpetas.value.length
      ? Math.max(...carpetas.value.map((c) => c.order)) + 1
      : 1;
    const c: Carpeta = {
      id: genId('cf'),
      name: payload.name.trim() || '未命名档案夹',
      order,
      color: (payload.color ?? CARPETA_PALETTE[(order - 1) % CARPETA_PALETTE.length]).trim() || '#5C4F42',
    };
    carpetas.value.push(c);
    persist();
    return c;
  }
  function updateCarpeta(id: string, patch: Partial<Carpeta>): void {
    const c = carpetas.value.find((x) => x.id === id);
    if (!c) return;
    Object.assign(c, patch);
    persist();
  }
  function removeCarpeta(id: string): void {
    carpetas.value = carpetas.value.filter((c) => c.id !== id);
    persist();
  }
  function moveCarpeta(id: string, dir: -1 | 1): void {
    const list = sortedCarpetas();
    const idx = list.findIndex((c) => c.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= list.length) return;
    const a = list[idx].order;
    list[idx].order = list[swap].order;
    list[swap].order = a;
    carpetas.value = list.slice().sort((x, y) => x.order - y.order);
    persist();
  }
  function getCarpeta(id: string): Carpeta | undefined {
    return carpetas.value.find((c) => c.id === id);
  }
  function resetCarpetasToDefaults(): void {
    carpetas.value = DEFAULT_CARPETAS.map((c) => ({ ...c }));
    persist();
  }
  function moveGroup(id: string, dir: -1 | 1): void {
    const list = sortedGroups();
    const idx = list.findIndex((g) => g.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= list.length) return;
    [list[idx], list[swap]] = [list[swap], list[idx]];
    list.forEach((g, i) => {
      const target = categoryGroups.value.find((x) => x.id === g.id);
      if (target) target.order = i + 1;
    });
    categoryGroups.value = sortedGroups();
    persist();
  }

  function reorderCategoryGroups(orderedIds: string[]): void {
    const map = new Map(categoryGroups.value.map((g) => [g.id, g]));
    const list = orderedIds.map((id) => map.get(id)).filter((g): g is CategoryGroup => !!g);
    list.forEach((g, i) => {
      const target = map.get(g.id);
      if (target) target.order = i + 1;
    });
    categoryGroups.value = sortedGroups();
    persist();
  }

  function subsOf(groupId: string): SubCategory[] {
    return subCategories.value
      .filter((s) => s.groupId === groupId)
      .sort((a, b) => a.order - b.order);
  }
  function addSubCategory(
    groupId: string,
    payload: { name: string; nameEs?: string },
  ): SubCategory {
    const order = subsOf(groupId).length ? Math.max(...subsOf(groupId).map((s) => s.order)) + 1 : 1;
    const s: SubCategory = {
      id: genId('sc'),
      groupId,
      name: payload.name.trim() || '未命名小类',
      nameEs: (payload.nameEs ?? '').trim(),
      order,
    };
    subCategories.value.push(s);
    persist();
    return s;
  }
  function updateSubCategory(id: string, patch: Partial<SubCategory>): void {
    const s = subCategories.value.find((x) => x.id === id);
    if (!s) return;
    Object.assign(s, patch);
    persist();
  }
  function removeSubCategory(id: string): void {
    subCategories.value = subCategories.value.filter((s) => s.id !== id);
    persist();
  }
  function moveSub(id: string, dir: -1 | 1): void {
    const sub = subCategories.value.find((x) => x.id === id);
    if (!sub) return;
    const list = subsOf(sub.groupId);
    const idx = list.findIndex((s) => s.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= list.length) return;
    const a = list[idx].order;
    list[idx].order = list[swap].order;
    list[swap].order = a;
    subCategories.value = subCategories.value.slice().sort((x, y) => {
      if (x.groupId !== y.groupId) return 0;
      return x.order - y.order;
    });
    persist();
  }

  /* ---- 查询 ---- */
  function getCategoryGroup(id: string): CategoryGroup | undefined {
    return categoryGroups.value.find((g) => g.id === id);
  }
  function ensureCatchAllGroup(): CategoryGroup {
    const name = '其他';
    const nameEs = 'Otros';
    const found = categoryGroups.value.find(
      (g) => g.name.trim() === name || (g.nameEs && g.nameEs.trim() === nameEs),
    );
    if (found) return found;
    return addCategoryGroup({ name, nameEs });
  }
  function getSubCategory(id: string): SubCategory | undefined {
    return subCategories.value.find((s) => s.id === id);
  }
  function findGroupByName(name: string): CategoryGroup | undefined {
    const n = name.trim().toLowerCase();
    return categoryGroups.value.find((g) => g.name.trim().toLowerCase() === n);
  }
  function findSubByName(groupId: string, name: string): SubCategory | undefined {
    const n = name.trim().toLowerCase();
    return subCategories.value.find(
      (s) => s.groupId === groupId && s.name.trim().toLowerCase() === n,
    );
  }

  /* ---- 快照导入导出（DataModal 用）---- */
  function exportState() {
    return {
      settings: settings.value,
      companyProfile: companyProfile.value,
      categoryGroups: categoryGroups.value,
      subCategories: subCategories.value,
      carpetas: carpetas.value,
    };
  }
  function importState(state: Partial<{
    settings: unknown;
    companyProfile: unknown;
    categoryGroups: unknown;
    subCategories: unknown;
    carpetas: unknown;
  }>): void {
    if (state?.settings) settings.value = normalizeSettings(state.settings);
    if (state?.companyProfile) companyProfile.value = normalizeCompanyProfile(state.companyProfile);
    if (Array.isArray(state?.categoryGroups)) {
      categoryGroups.value = state.categoryGroups
        .map((r) => normalizeCategoryGroup(r))
        .filter((g): g is CategoryGroup => g !== null);
    }
    if (Array.isArray(state?.subCategories)) {
      subCategories.value = state.subCategories
        .map((r) => normalizeSubCategory(r))
        .filter((s): s is SubCategory => s !== null);
    }
    if (Array.isArray(state?.carpetas)) {
      carpetas.value = state.carpetas
        .map((r) => normalizeCarpeta(r))
        .filter((c): c is Carpeta => c !== null);
    }
    persist();
  }

  return {
    settings,
    companyProfile,
    categoryGroups,
    subCategories,
    hydrate,
    persist,
    updateSettings,
    updateCompanyProfile,
    addCategoryGroup,
    updateCategoryGroup,
    removeCategoryGroup,
    moveGroup,
    reorderCategoryGroups,
    renumberCategoryGroups,
    resetCategoryGroupsToDefaults,
    ensureCatchAllGroup,
    addProductTemplate,
    updateProductTemplate,
    removeProductTemplate,
    moveProductTemplate,
    reorderProductTemplates,
    getGroup,
    sortedCarpetas,
    addCarpeta,
    updateCarpeta,
    removeCarpeta,
    moveCarpeta,
    getCarpeta,
    resetCarpetasToDefaults,
    addSubCategory,
    updateSubCategory,
    removeSubCategory,
    moveSub,
    getCategoryGroup,
    getSubCategory,
    findGroupByName,
    findSubByName,
    getProductStatus,
    addProductStatusOption,
    updateProductStatusOption,
    removeProductStatusOption,
    addUnitOption,
    removeUnitOption,
    setDefaultUnit,
    addSalePriceUnitOption,
    removeSalePriceUnitOption,
    setDefaultSalePriceUnit,
    exportState,
    importState,
  };
});
