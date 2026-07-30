/**
 * 基于每 100g 营养素自动生成健康标签。
 * 阈值与 v1.0 单文件版保持一致，改动请同步更新测试。
 */
import type { HealthTag, Ingredient } from '../types';

type NutritionLike = Pick<Ingredient, 'nutrition'> | null | undefined;

export function healthTags(ing: NutritionLike): HealthTag[] {
  if (!ing?.nutrition) return [];
  const n = ing.nutrition;
  const tags: HealthTag[] = [];
  if (n.protein >= 20) tags.push({ text: '高蛋白', cls: 'bg-blue-50 text-blue-700 border-blue-200' });
  if (n.fat <= 3 && n.calories > 0) tags.push({ text: '低脂', cls: 'bg-green-50 text-green-700 border-green-200' });
  if (n.calories <= 100 && n.calories > 0) tags.push({ text: '低卡', cls: 'bg-coral-50 text-coral-700 border-coral-200' });
  if (n.carbs <= 5 && n.calories > 0) tags.push({ text: '低碳水', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' });
  if (n.protein >= 10 && n.protein < 20 && n.calories > 0)
    tags.push({ text: '中蛋白', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' });
  if (n.calories >= 300) tags.push({ text: '高热量', cls: 'bg-orange-50 text-orange-700 border-orange-200' });
  return tags;
}
