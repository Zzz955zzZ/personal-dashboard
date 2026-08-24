/**
 * 设置模块公开 API（跨模块一律从这里引用）。
 */
export { useSettingsStore } from './store/settings-store';
export { settingsRoutes } from './routes';
export {
  SETTINGS_DB_KEY,
  DEFAULT_SETTINGS,
  DEFAULT_COMPANY,
  DEFAULT_PDF_TEMPLATE,
  DEFAULT_CATEGORY_GROUPS,
  DEFAULT_SUBCATEGORIES,
  DEFAULT_CARPETAS,
} from './constants';
export type {
  Settings,
  CompanyProfile,
  CategoryGroup,
  SubCategory,
  Carpeta,
  PdfTemplate,
  SupabaseConfig,
  OpenaiConfig,
  LanguageCode,
  CurrencyCode,
  ProductStatusOption,
  ProductTemplate,
} from './types';
