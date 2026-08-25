/** 设置模块类型定义（单例：Settings / CompanyProfile；全局：分类）。 */

export type CurrencyCode = 'EUR'; // MVP 仅 EUR
export type LanguageCode = 'zh';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface OpenaiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface PdfTemplate {
  headerLayout: 'logo-left' | 'logo-center' | 'none';
  showLogo: boolean;
  showFooter: boolean;
  footerNote: string; // 覆盖公司资料里的 footerNote
  accentColor: 'dark' | 'brown'; // 强调色：深黑 / 棕
}

/** 产品状态/阶段选项（可自定义名称与颜色）。 */
export interface ProductStatusOption {
  id: string;
  name: string;
  color: string; // hex 颜色
}

export interface Settings {
  id: 'settings'; // 固定主键
  language: LanguageCode;
  currency: CurrencyCode;
  defaultVatRate: number; // 默认 IVA 税率（%）
  defaultValidityDays: number; // 默认报价有效期（天）
  defaultUnit: string; // 新建产品时的默认单位
  unitOptions: string[]; // 可选单位列表（如 ['个','米','套','件','组']）
  salePriceUnitOptions: string[]; // 可选售价单位列表
  defaultSalePriceUnit: string; // 新建/默认售价单位
  productStatusOptions: ProductStatusOption[]; // 产品状态选项
  supabaseConfig: SupabaseConfig | null;
  openaiConfig: OpenaiConfig | null;
  pdfTemplate: PdfTemplate;
}

export interface CompanyProfile {
  id: 'company'; // 固定主键
  logoUrl: string;
  name: string;
  slogan: string; // 公司副标题 / 业务描述
  address: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  footerNote: string;
}

/** 分类下产品模板（在设置中心维护，添加产品时可直接多选插入）。 */
export interface ProductTemplate {
  id: string;
  name: string; // 名称
  nameEs: string; // 西文名称（PDF 用）
  model: string; // 型号
  note: string; // 备注
  link?: string; // 客户可见链接（可选，添加到报价单时带入）
  defaultCost: number; // 默认成本
  defaultSalePrice: number; // 默认售价
  defaultUnit: string; // 默认单位
  photoUrls: string[]; // 照片（可选，data URL 数组）
}

/** 大类（全局唯一，设置中心集中管理）。每个大类下直接维护一组产品模板。 */
export interface CategoryGroup {
  id: string;
  name: string;
  nameEs: string;
  icon: string;
  order: number;
  products: ProductTemplate[]; // 该大类下的产品模板
}

/** 档案夹（可自定义的报价单归档分类）。用于长期归类项目，避免平铺堆叠。 */
export interface Carpeta {
  id: string;
  name: string;
  order: number;
  color: string; // 色点标记（无 emoji），如 '#5C4F42'
}

/** 小类（归属大类）。 */
export interface SubCategory {
  id: string;
  groupId: string;
  name: string;
  nameEs: string;
  order: number;
}

export interface SettingsPersistedState {
  settings: Settings;
  companyProfile: CompanyProfile;
  categoryGroups: CategoryGroup[];
  subCategories: SubCategory[];
  carpetas: Carpeta[];
  carpetasSeeded: boolean; // 是否已写入过默认档案夹（用于旧数据一次性迁移）
}
