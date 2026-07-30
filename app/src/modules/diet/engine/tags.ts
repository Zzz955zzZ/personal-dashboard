/**
 * 微量营养素的分组与配色。
 * 分类色板与 v1.0 一致，避免迁移后视觉跳变。
 */
import type { Ingredient, MicroCategory } from '../types';

export const TAG_CAT_CLASS: Record<string, string> = {
  维生素: 'bg-violet-50 text-violet-700 border-violet-200',
  矿物质: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  脂肪酸: 'bg-amber-50 text-amber-700 border-amber-200',
  功能性: 'bg-teal-50 text-teal-700 border-teal-200',
};

export function catClass(cat: string): string {
  return TAG_CAT_CLASS[cat] || 'bg-paper-100 text-paper-600 border-paper-300/60';
}

export interface MicronGroup {
  cat: string;
  items: string[];
}

/** 按分类分组并去重，用于层级化标签展示 */
export function micronGroups(ing: Pick<Ingredient, 'microns'> | null | undefined): MicronGroup[] {
  const ms = ing?.microns ?? [];
  const map: Record<string, string[]> = {};
  ms.forEach((m) => {
    (map[m.cat] = map[m.cat] || []).push(m.name);
  });
  return Object.keys(map).map((cat) => ({ cat, items: [...new Set(map[cat])] }));
}

const MINERALS = ['钾', '钙', '铁', '锌', '硒', '碘', '镁', '锰', '钠', '磷'];
const FUNCTIONALS = [
  '膳食纤维', '果胶', '花青素', '番茄红素', '萝卜硫素', '大豆异黄酮', '茶多酚',
  '大蒜素', '姜黄素', '白藜芦醇', '绿原酸', '卵磷脂', '胆碱', '益生菌', 'β-葡聚糖',
];

/** 把自由文本标签归类到已知分类，用于统一配色；归不了类返回 'custom' */
export function classifyTag(t: string): MicroCategory | 'custom' {
  const s = String(t);
  if (/维[生A-Z]/.test(s) || /β-胡萝卜素/.test(s)) return '维生素';
  if (MINERALS.some((x) => s.includes(x))) return '矿物质';
  if (/脂肪酸|Omega|不饱和|饱和/.test(s)) return '脂肪酸';
  if (FUNCTIONALS.some((x) => s.includes(x))) return '功能性';
  return 'custom';
}
