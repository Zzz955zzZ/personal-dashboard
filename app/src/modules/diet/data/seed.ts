/**
 * 首次运行的种子数据
 *
 * 与 v1.0 单文件版 seed() 逐字段一致（id 必须保持不变，
 * 老用户的 pantry / recipes / logs 都通过 id 引用食材）。
 */

import type {
  Ingredient,
  MealTemplate,
  PantryItem,
  Recipe,
  ShoppingItem,
} from '../types';

/** 种子食材（22 条），microns 在装载时由 detectMicrons 补齐 */
export const SEED_INGREDIENTS: Ingredient[] = [
  { id: 1, name: '鸡胸肉', category: 'protein', emoji: '🍗', image: '', tags: ['高蛋白', '低脂肪', '易吸收'], nutrition: { calories: 165, carbs: 0, protein: 31, fat: 3.6 }, note: '健身减脂期优质蛋白来源。' },
  { id: 2, name: '牛肉', category: 'protein', emoji: '🥩', image: '', tags: ['肌氨酸', '高蛋白'], nutrition: { calories: 250, carbs: 0, protein: 26, fat: 15 }, note: '红肉代表，补铁效果好。' },
  { id: 3, name: '三文鱼', category: 'protein', emoji: '🐟', image: '', tags: ['优质脂肪'], nutrition: { calories: 208, carbs: 0, protein: 20, fat: 13 }, note: '深海鱼，有益心血管健康。' },
  { id: 4, name: '鸡蛋', category: 'protein', emoji: '🥚', image: '', unit: '个', gramsPerUnit: 50, tags: ['完全蛋白', '性价比高'], nutrition: { calories: 155, carbs: 1.1, protein: 13, fat: 11 }, note: '氨基酸组成最接近人体需要。' },
  { id: 5, name: '虾', category: 'protein', emoji: '🦐', image: '', tags: ['低脂肪', '高蛋白', '微量元素'], nutrition: { calories: 99, carbs: 0, protein: 24, fat: 0.3 }, note: '富含锌与硒。' },
  { id: 6, name: '豆腐', category: 'protein', emoji: '🫘', image: '', tags: ['植物蛋白'], nutrition: { calories: 76, carbs: 1.9, protein: 8, fat: 4.8 }, note: '优质植物蛋白。' },
  { id: 7, name: '希腊酸奶', category: 'protein', emoji: '🥛', image: '', tags: ['高蛋白'], nutrition: { calories: 59, carbs: 3.6, protein: 10, fat: 0.4 }, note: '过滤去乳清，蛋白密度更高。' },
  { id: 8, name: '糙米', category: 'carbs', emoji: '🌾', image: '', tags: ['全谷', '低GI'], nutrition: { calories: 216, carbs: 45, protein: 5, fat: 1.8 }, note: '升糖更平稳。' },
  { id: 9, name: '燕麦', category: 'carbs', emoji: '🥣', image: '', tags: ['饱腹'], nutrition: { calories: 389, carbs: 66, protein: 17, fat: 7 }, note: '有助降低胆固醇。' },
  { id: 10, name: '全麦面包', category: 'carbs', emoji: '🍞', image: '', tags: ['复合碳水'], nutrition: { calories: 247, carbs: 41, protein: 13, fat: 3.4 }, note: '选择真正全麦产品。' },
  { id: 11, name: '红薯', category: 'carbs', emoji: '🍠', image: '', tags: [], nutrition: { calories: 86, carbs: 20, protein: 1.6, fat: 0.1 }, note: '优质主食替代。' },
  { id: 12, name: '藜麦', category: 'carbs', emoji: '🌾', image: '', tags: ['完整蛋白', '无麸质'], nutrition: { calories: 120, carbs: 21, protein: 4.4, fat: 1.9 }, note: '含全部必需氨基酸的谷物。' },
  { id: 13, name: '牛油果', category: 'fat', emoji: '🥑', image: '', tags: [], nutrition: { calories: 160, carbs: 9, protein: 2, fat: 15 }, note: '健康脂肪代表。' },
  { id: 14, name: '橄榄油', category: 'fat', emoji: '🫒', image: '', tags: ['抗氧化'], nutrition: { calories: 884, carbs: 0, protein: 0, fat: 100 }, note: '地中海饮食核心，适合凉拌。' },
  { id: 15, name: '坚果', category: 'fat', emoji: '🥜', image: '', tags: [], nutrition: { calories: 607, carbs: 20, protein: 20, fat: 54 }, note: '每日一小把即可。' },
  { id: 16, name: '奇亚籽', category: 'fat', emoji: '🌰', image: '', tags: [], nutrition: { calories: 486, carbs: 34, protein: 17, fat: 31 }, note: '泡发后形成凝胶增加饱腹感。' },
  { id: 17, name: '西兰花', category: 'veg', emoji: '🥦', image: '', tags: ['十字花科'], nutrition: { calories: 34, carbs: 7, protein: 2.8, fat: 0.4 }, note: '强力抗氧化蔬菜。' },
  { id: 18, name: '菠菜', category: 'veg', emoji: '🥬', image: '', tags: [], nutrition: { calories: 23, carbs: 3.6, protein: 2.9, fat: 0.4 }, note: '焯水去草酸后更佳。' },
  { id: 19, name: '番茄', category: 'veg', emoji: '🍅', image: '', tags: [], nutrition: { calories: 18, carbs: 3.9, protein: 0.9, fat: 0.2 }, note: '熟制后番茄红素更易吸收。' },
  { id: 20, name: '胡萝卜', category: 'veg', emoji: '🥕', image: '', tags: [], nutrition: { calories: 41, carbs: 10, protein: 0.9, fat: 0.2 }, note: '与少量油脂同食更好。' },
  { id: 21, name: '芦笋', category: 'veg', emoji: '🌱', image: '', tags: [], nutrition: { calories: 20, carbs: 4, protein: 2.2, fat: 0.1 }, note: '春季时令蔬菜。' },
  { id: 22, name: '羽衣甘蓝', category: 'veg', emoji: '🥬', image: '', tags: ['十字花科'], nutrition: { calories: 49, carbs: 9, protein: 4.3, fat: 0.9 }, note: '营养密度极高的深绿叶菜。' },
];

export const SEED_RECIPES: Recipe[] = [
  { id: 1, name: '香煎三文鱼', category: 'meat', ingredientIds: [3], method: '鱼排两面撒盐与黑胡椒，热锅少油每面煎2分钟，出锅挤柠檬汁。' },
  { id: 2, name: '红烧牛肉', category: 'meat', ingredientIds: [2], method: '牛肉焯水后与调料炖煮40分钟至软烂收汁。' },
  { id: 3, name: '清炒西兰花', category: 'veg', ingredientIds: [17], method: '西兰花焯水1分钟，蒜末爆香后快炒加盐调味。' },
  { id: 4, name: '凉拌菠菜', category: 'veg', ingredientIds: [18], method: '菠菜焯水去草酸，挤干切段拌入调料与芝麻。' },
  { id: 5, name: '藜麦饭', category: 'staple', ingredientIds: [12], method: '藜麦洗净按1:2加水煮15分钟焖5分钟松散。' },
  { id: 6, name: '希腊酸奶杯', category: 'dessert', ingredientIds: [7], method: '酸奶打底铺莓果坚果淋少许蜂蜜。' },
];

export const SEED_PANTRY: PantryItem[] = [
  { id: 1, ingredientId: 1, quantity: 500 },
  { id: 2, ingredientId: 8, quantity: 1000 },
  { id: 3, ingredientId: 13, quantity: 0 },
  { id: 4, ingredientId: 17, quantity: 300 },
  { id: 5, ingredientId: 4, quantity: 600 },
];

export const SEED_SHOPPING: ShoppingItem[] = [
  { id: 1, ingredientId: 14, quantity: 500, done: false },
  { id: 2, ingredientId: 13, quantity: 300, done: true },
  { id: 3, ingredientId: 21, quantity: 200, done: false },
];

export const SEED_MEAL_TEMPLATES: MealTemplate[] = [
  {
    id: 1,
    name: '经典早餐',
    emoji: '🌅',
    isDefault: true,
    defaultMealType: 'breakfast',
    items: [
      { ingredientId: 4, amount: 50 },
      { ingredientId: 7, amount: 200 },
      { ingredientId: 9, amount: 40 },
      { ingredientId: 11, amount: 100 },
    ],
  },
];
