/**
 * 设置模块持久化层（单 key：qs_settings_v1，内含 settings / companyProfile /
 * categoryGroups / subCategories 四块）。提供 isRecord + normalize* 守卫。
 */

import type {
  Carpeta,
  CategoryGroup,
  CompanyProfile,
  ProductStatusOption,
  ProductTemplate,
  Settings,
  SettingsPersistedState,
  SubCategory,
} from '../types';
import { SETTINGS_DB_KEY, DEFAULT_SETTINGS, DEFAULT_COMPANY } from '../constants';
import { normalizeUnitInput } from '@/shared/util';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, maxLen = 4000): string {
  if (typeof v === 'string') return v.slice(0, maxLen);
  if (v === null || v === undefined) return '';
  return String(v).slice(0, maxLen);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeProductStatusOption(raw: unknown): ProductStatusOption | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id) return null;
  return {
    id: raw.id,
    name: str(raw.name, 60) || '状态',
    color: str(raw.color, 20) || '#5C4F42',
  };
}

export function normalizeSettings(raw: unknown): Settings {
  const base = (isRecord(raw) ? raw : {}) as Record<string, unknown>;
  const pdf = isRecord(base.pdfTemplate) ? base.pdfTemplate : {};
  const sb = isRecord(base.supabaseConfig) ? base.supabaseConfig : null;
  const ai = isRecord(base.openaiConfig) ? base.openaiConfig : null;
  const defaultVatRate = num(base.defaultVatRate);
  const defaultValidityDays = num(base.defaultValidityDays);
  const rawUnitOptions = Array.isArray(base.unitOptions)
    ? base.unitOptions.map((u) => normalizeUnitInput(str(u, 20))).filter(Boolean)
    : [];
  const rawSalePriceUnitOptions = Array.isArray(base.salePriceUnitOptions)
    ? base.salePriceUnitOptions.map((u) => normalizeUnitInput(str(u, 20))).filter(Boolean)
    : [];
  // 迁移：把旧的中文/上标面积体积单位统一为 m2/m3
  const migratedUnitOptions = Array.from(
    new Set(
      rawUnitOptions.map((u) => {
        if (u === '平方米' || u === '平米') return 'm2';
        if (u === '立方米' || u === '立方') return 'm3';
        return u;
      }),
    ),
  );
  const rawStatusOptions = Array.isArray(base.productStatusOptions)
    ? base.productStatusOptions.map(normalizeProductStatusOption).filter((s): s is ProductStatusOption => s !== null)
    : [];
  return {
    id: 'settings',
    language: base.language === 'zh' ? 'zh' : 'zh',
    currency: base.currency === 'EUR' ? 'EUR' : 'EUR',
    defaultVatRate: defaultVatRate > 0 ? defaultVatRate : 21,
    defaultValidityDays: defaultValidityDays > 0 ? defaultValidityDays : 30,
    defaultUnit: normalizeUnitInput(str(base.defaultUnit, 20)) || DEFAULT_SETTINGS.defaultUnit,
    unitOptions: migratedUnitOptions.length > 0 ? migratedUnitOptions : DEFAULT_SETTINGS.unitOptions,
    salePriceUnitOptions:
      rawSalePriceUnitOptions.length > 0 ? rawSalePriceUnitOptions : DEFAULT_SETTINGS.salePriceUnitOptions,
    defaultSalePriceUnit:
      normalizeUnitInput(str(base.defaultSalePriceUnit, 20)) || DEFAULT_SETTINGS.defaultSalePriceUnit,
    productStatusOptions: rawStatusOptions.length > 0 ? rawStatusOptions : DEFAULT_SETTINGS.productStatusOptions,
    supabaseConfig:
      sb && str(sb.url) && str(sb.anonKey)
        ? { url: str(sb.url), anonKey: str(sb.anonKey) }
        : null,
    openaiConfig:
      ai && str(ai.baseUrl) && str(ai.apiKey)
        ? { baseUrl: str(ai.baseUrl), apiKey: str(ai.apiKey), model: str(ai.model) || 'gpt-4o-mini' }
        : null,
    pdfTemplate: {
      headerLayout: pdf.headerLayout === 'logo-center' || pdf.headerLayout === 'logo-left' || pdf.headerLayout === 'none' ? pdf.headerLayout : 'logo-left',
      showLogo: pdf.showLogo !== false,
      showFooter: pdf.showFooter !== false,
      footerNote: str(pdf.footerNote, 1000),
      accentColor: pdf.accentColor === 'brown' ? 'brown' : 'dark',
    },
  };
}

export function normalizeCompanyProfile(raw: unknown): CompanyProfile {
  const base = (isRecord(raw) ? raw : {}) as Record<string, unknown>;
  return {
    id: 'company',
    logoUrl: str(base.logoUrl),
    name: str(base.name) || DEFAULT_COMPANY.name,
    slogan: str(base.slogan),
    address: str(base.address),
    phone: str(base.phone),
    email: str(base.email),
    website: str(base.website),
    taxId: str(base.taxId),
    footerNote: str(base.footerNote),
  };
}

export function normalizeProductTemplate(raw: unknown): ProductTemplate | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id) return null;
  const arr = Array.isArray(raw.photoUrls)
    ? raw.photoUrls.map((u) => str(u, 4000)).filter(Boolean)
    : [];
  const legacy = str(raw.photoUrl, 4000);
  const photoUrls = arr.length > 0 ? arr : legacy ? [legacy] : [];
  return {
    id: raw.id,
    name: str(raw.name, 300) || '新产品模板',
    nameEs: str(raw.nameEs, 300),
    model: str(raw.model, 300),
    note: str(raw.note, 2000),
    defaultCost: num(raw.defaultCost),
    defaultSalePrice: num(raw.defaultSalePrice),
    defaultUnit: normalizeUnitInput(str(raw.defaultUnit, 20)) || '',
    photoUrls,
  };
}

export function normalizeCategoryGroup(raw: unknown): CategoryGroup | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id) return null;
  const products = Array.isArray(raw.products)
    ? raw.products
        .map(normalizeProductTemplate)
        .filter((p): p is ProductTemplate => p !== null)
    : [];
  return {
    id: raw.id,
    name: str(raw.name).slice(0, 100) || '未命名大类',
    nameEs: str(raw.nameEs).slice(0, 100),
    icon: str(raw.icon).slice(0, 20),
    order: num(raw.order),
    products,
  };
}

export function normalizeSubCategory(raw: unknown): SubCategory | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id) return null;
  return {
    id: raw.id,
    groupId: str(raw.groupId),
    name: str(raw.name).slice(0, 100) || '未命名小类',
    nameEs: str(raw.nameEs).slice(0, 100),
    order: num(raw.order),
  };
}

export function normalizeCarpeta(raw: unknown): Carpeta | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id) return null;
  return {
    id: raw.id,
    name: str(raw.name).slice(0, 60) || '未命名档案夹',
    order: num(raw.order),
    color: str(raw.color).slice(0, 20) || '#5C4F42',
  };
}

export interface SettingsLoadResult {
  found: boolean;
  state: SettingsPersistedState;
}

export function loadSettingsState(
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): SettingsLoadResult {
  if (!storage) {
    return {
      found: false,
      state: {
        settings: DEFAULT_SETTINGS,
        companyProfile: DEFAULT_COMPANY,
        categoryGroups: [],
        subCategories: [],
        carpetas: [],
        carpetasSeeded: false,
      },
    };
  }
  let raw: string | null = null;
  try {
    raw = storage.getItem(SETTINGS_DB_KEY);
  } catch {
    return { found: false, state: emptyState() };
  }
  if (!raw) return { found: false, state: emptyState() };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { found: false, state: emptyState() };
  }
  if (!isRecord(parsed)) return { found: false, state: emptyState() };

  const settings = normalizeSettings(parsed.settings);
  const companyProfile = normalizeCompanyProfile(parsed.companyProfile);
  const categoryGroups = Array.isArray(parsed.categoryGroups)
    ? parsed.categoryGroups.map(normalizeCategoryGroup).filter((g): g is CategoryGroup => g !== null)
    : [];
  const subCategories = Array.isArray(parsed.subCategories)
    ? parsed.subCategories.map(normalizeSubCategory).filter((s): s is SubCategory => s !== null)
    : [];
  const carpetas = Array.isArray(parsed.carpetas)
    ? parsed.carpetas.map(normalizeCarpeta).filter((c): c is Carpeta => c !== null)
    : [];
  const carpetasSeeded = parsed.carpetasSeeded === true;
  return {
    found: true,
    state: { settings, companyProfile, categoryGroups, subCategories, carpetas, carpetasSeeded },
  };
}

function emptyState(): SettingsPersistedState {
  return {
    settings: DEFAULT_SETTINGS,
    companyProfile: DEFAULT_COMPANY,
    categoryGroups: [],
    subCategories: [],
    carpetas: [],
    carpetasSeeded: false,
  };
}

export function saveSettingsState(
  state: SettingsPersistedState,
  storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SETTINGS_DB_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
