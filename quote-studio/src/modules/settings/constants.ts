import type {
  Carpeta,
  CategoryGroup,
  CompanyProfile,
  PdfTemplate,
  Settings,
  SubCategory,
} from './types';

/** localStorage 键（命名空间 qs_<module>_v1）。 */
export const SETTINGS_DB_KEY = 'qs_settings_v1';

export const DEFAULT_PDF_TEMPLATE: PdfTemplate = {
  headerLayout: 'logo-left',
  showLogo: true,
  showFooter: true,
  footerNote: '',
  accentColor: 'dark',
};

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  language: 'zh',
  currency: 'EUR',
  defaultVatRate: 21,
  defaultValidityDays: 30,
  defaultUnit: '个',
  unitOptions: ['个', '米', '套', '件', '组', 'm2', 'm3'],
  salePriceUnitOptions: ['件', 'm2', 'm3', 'h', '天'],
  defaultSalePriceUnit: '件',
  productStatusOptions: [
    { id: 'ps_ordered', name: '叫货', color: '#E8A33D' },
    { id: 'ps_arrived', name: '到货', color: '#4F8A5B' },
    { id: 'ps_paid', name: '已付', color: '#3d342b' },
  ],
  supabaseConfig: null,
  openaiConfig: null,
  pdfTemplate: DEFAULT_PDF_TEMPLATE,
};

export const DEFAULT_COMPANY: CompanyProfile = {
  id: 'company',
  logoUrl: '',
  name: 'Estudio 室内设计工作室',
  slogan: 'Arquitectura de interiores · Reformas integrales · Proyección',
  address: 'Madrid, España',
  phone: '',
  email: '',
  website: '',
  taxId: '',
  footerNote: '本报价单自开具之日起 30 个自然日内有效。',
};

/**
 * 默认大类（按工种分）。
 * 小类默认空，由用户按项目/需求自行添加。
 * 不使用 emoji，保持专业克制风格。
 */
export const DEFAULT_CATEGORY_GROUPS: CategoryGroup[] = [
  { id: 'cg_demolition', name: '拆除与土建', nameEs: 'Demolición y Estructura', icon: '', order: 1, products: [] },
  { id: 'cg_plumbing', name: '水电', nameEs: 'Fontanería y Electricidad', icon: '', order: 2, products: [] },
  { id: 'cg_masonry', name: '泥瓦', nameEs: 'Albañilería', icon: '', order: 3, products: [] },
  { id: 'cg_carpentry', name: '木工', nameEs: 'Carpintería', icon: '', order: 4, products: [] },
  { id: 'cg_painting', name: '油漆', nameEs: 'Pintura', icon: '', order: 5, products: [] },
  { id: 'cg_metal_glass', name: '玻璃 / 金属', nameEs: 'Cristal y Metal', icon: '', order: 6, products: [] },
  { id: 'cg_bathroom', name: '卫浴', nameEs: 'Baño', icon: '', order: 7, products: [] },
  { id: 'cg_kitchen', name: '厨房', nameEs: 'Cocina', icon: '', order: 8, products: [] },
  { id: 'cg_lighting', name: '灯具', nameEs: 'Iluminación', icon: '', order: 9, products: [] },
  { id: 'cg_furniture', name: '家具', nameEs: 'Mobiliario', icon: '', order: 10, products: [] },
  { id: 'cg_soft', name: '软装', nameEs: 'Decoración', icon: '', order: 11, products: [] },
  { id: 'cg_materials', name: '主材', nameEs: 'Materiales', icon: '', order: 12, products: [] },
  { id: 'cg_labor', name: '人工 / 分包', nameEs: 'Mano de Obra', icon: '', order: 13, products: [] },
  { id: 'cg_other', name: '其他', nameEs: 'Otros', icon: '', order: 14, products: [] },
];

export const DEFAULT_SUBCATEGORIES: SubCategory[] = [];

/**
 * 默认档案夹（报价单归档分类）。可按需改名 / 增删。
 * 色点取自棕调色板，无 emoji，保持专业克制。
 */
export const DEFAULT_CARPETAS: Carpeta[] = [
  { id: 'cf_follow', name: '待跟进', order: 1, color: '#8a7a66' },
  { id: 'cf_active', name: '制作中', order: 2, color: '#5C4F42' },
  { id: 'cf_done', name: '已完成', order: 3, color: '#3d342b' },
  { id: 'cf_archive', name: '资料归档', order: 4, color: '#a99c89' },
];
