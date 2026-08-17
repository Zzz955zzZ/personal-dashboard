/**
 * 饮食模块领域类型
 *
 * 这些类型是模块的对外契约，抽离成独立包时随目录整体搬走。
 * 字段命名与 v1.0 单文件版 localStorage（DB_KEY = 'pdash_v4'）保持一致，
 * 以保证老数据可以无损读入，不允许在此处随意改名。
 */

/** 每 100g 的三大营养素 + 热量 */
export interface Nutrition {
  /** kcal / 100g */
  calories: number;
  /** g / 100g */
  carbs: number;
  /** g / 100g */
  protein: number;
  /** g / 100g */
  fat: number;
}

/** 微量营养素分类 */
export type MicroCategory = '维生素' | '矿物质' | '脂肪酸' | '功能性' | '主食';

/** 微量营养素条目 */
export interface Micro {
  cat: MicroCategory;
  name: string;
}

/** 计量单位：默认按克，鸡蛋一类按「个」并附 gramsPerUnit 换算 */
export type IngredientUnit = 'g' | '个';

/** 食材六大类（在四大类基础上补齐水果/饮品，便于精确归类与筛选） */
export type IngredientCategory = 'protein' | 'carbs' | 'fat' | 'veg' | 'fruit' | 'drink';

/** 食材 */
export interface Ingredient {
  id: number;
  name: string;
  /** 品牌：用于区分同一品类的不同产品（如不同牌子的牛奶），缺省为空 */
  brand?: string;
  category: IngredientCategory;
  emoji: string;
  image: string;
  tags: string[];
  nutrition: Nutrition;
  note: string;
  unit?: IngredientUnit;
  /** unit === '个' 时每单位克重 */
  gramsPerUnit?: number;
  /** 由 aiRecognize 推导出的微量营养素，持久化以避免重复计算 */
  microns?: Micro[];
}

/** 菜谱分类 */
export type RecipeCategory = 'meat' | 'veg' | 'staple' | 'dessert';

/** 菜谱 */
export interface Recipe {
  id: number;
  name: string;
  category: RecipeCategory;
  ingredientIds: number[];
  method: string;
  emoji?: string;
  image?: string;
}

/** 库存条目 */
export interface PantryItem {
  id: number;
  ingredientId: number;
  /** 始终以克为单位存储 */
  quantity: number;
}

/** 采购清单条目 */
export interface ShoppingItem {
  id: number;
  ingredientId: number;
  quantity: number;
  done: boolean;
}

/** 餐次 */
export type MealType = 'breakfast' | 'lunch' | 'dinner';

/** 单条进食记录 */
export interface LogEntry {
  ingredientId: number;
  /** 克 */
  amount: number;
  mealType: MealType;
}

/** 按日期分组的记录，key 为 YYYY-MM-DD */
export type DailyLogs = Record<string, LogEntry[]>;

/** 每日营养目标 */
export interface Targets {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

/** 组合餐模板 */
export interface MealTemplate {
  id: number;
  name: string;
  emoji: string;
  isDefault: boolean;
  defaultMealType: MealType;
  items: Array<{ ingredientId: number; amount: number }>;
}

/** 知识库单行：关键词 -> 微量营养素 + 每 100g 宏量 */
export interface IngredientDbRow {
  /** 匹配关键词，第一个作为展示用的类别名 */
  kw: string[];
  /** 微量营养素 */
  m: Micro[];
  macros: Nutrition;
  unit?: IngredientUnit;
  gramsPerUnit?: number;
  note?: string;
}

/** inferCategory 的估算结果 */
export interface CategoryEstimate {
  label: string;
  macros: Nutrition;
  micros: Micro[];
  note: string;
}

/** aiRecognize 的识别结果 */
export interface RecognizeResult {
  /** 命中（精确命中或类别估算）为 true */
  match: boolean;
  macros: Nutrition | null;
  micros: Micro[];
  unit: IngredientUnit | null;
  gramsPerUnit: number | null;
  note: string;
  /** true = 类别估算值（需在 UI 打「参考值」标签），false = 知识库核实值 */
  estimated: boolean;
  /** 命中关键词或推断出的类别名 */
  category: string;
}

/** 自动健康标签 */
export interface HealthTag {
  text: string;
  cls: string;
}
