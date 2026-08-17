/**
 * 首次运行的种子数据
 *
 * 与 v1.0 单文件版 seed() 逐字段一致（id 必须保持不变，
 * 老用户的 pantry / recipes / logs 都通过 id 引用食材）。
 */

import type {
  Ingredient,
  IngredientCategory,
  IngredientDbRow,
  MealTemplate,
  PantryItem,
  Recipe,
  ShoppingItem,
} from '../types';
import { ING_DB } from './ing-db';

/**
 * 22 条精选食材（id 1-22 固定，老用户数据通过 id 引用，不可改）。
 *
 * 营养数值基准：生重 / 可食部 / 每 100g（食物成分表通用口径）。
 * - 肉鱼蛋菜果、生豆腐、坚果、油脂 = 生重可食部
 * - 米面杂粮以干重计（熟重因吸水密度减半，见各 note）
 * - 面包等成品按制成品计
 * note 字段承载「有争议内容的解析」（皮/骨/水分/胆固醇/草酸等）。
 */
const CURATED_INGREDIENTS: Ingredient[] = [
  { id: 1, name: '鸡胸肉', category: 'protein', emoji: '🍗', image: '', tags: ['高蛋白', '低脂肪'], nutrition: { calories: 120, carbs: 0, protein: 23, fat: 2.6 }, note: '去皮去骨生鸡胸肉（可食部）。带皮煎制脂肪约翻倍（鸡皮脂肪≈40g/100g）；骨头不计入可食部，且骨中钙极难吸收；烹饪失水后熟重热量密度升至约165kcal/100g。' },
  { id: 2, name: '牛肉', category: 'protein', emoji: '🥩', image: '', tags: ['肌氨酸', '高蛋白', '补铁'], nutrition: { calories: 125, carbs: 0, protein: 21, fat: 4.5 }, note: '以瘦牛肉（里脊/后腿）生重计。部位差异极大：肥牛/牛腩脂肪可达25–35g、热量翻倍；筋膜不计入可食部。红肉适量，补铁补锌好。' },
  { id: 3, name: '三文鱼', category: 'protein', emoji: '🐟', image: '', tags: ['优质脂肪', 'Omega-3'], nutrition: { calories: 208, carbs: 0, protein: 20, fat: 13 }, note: '生食三文鱼可食部（带皮煎制脂肪略增）。富含 Omega-3 与维D；生食需经深度冷冻处理以除寄生虫。' },
  { id: 4, name: '鸡蛋', category: 'protein', emoji: '🥚', image: '', unit: '个', gramsPerUnit: 50, tags: ['完全蛋白', '性价比高'], nutrition: { calories: 144, carbs: 0.7, protein: 13, fat: 9.5 }, note: '整蛋生重，1枚≈50g。蛋黄含胆固醇，但膳食胆固醇对多数人血胆固醇影响有限；蛋白几乎为纯蛋白。数值为整蛋，非仅蛋白。' },
  { id: 5, name: '虾', category: 'protein', emoji: '🦐', image: '', tags: ['低脂肪', '高蛋白', '微量元素'], nutrition: { calories: 99, carbs: 0, protein: 24, fat: 0.3 }, note: '去头去壳虾仁生重。虾头/虾黄胆固醇与嘌呤偏高；虾线为消化道建议剔除。低脂高蛋白、富含锌硒。' },
  { id: 6, name: '豆腐', category: 'protein', emoji: '🫘', image: '', tags: ['植物蛋白'], nutrition: { calories: 76, carbs: 1.9, protein: 8, fat: 4.8 }, note: '常规北豆腐生重。水分不同热量悬殊：嫩豆腐更低（≈50–60kcal），千张/豆干更高（≈140kcal）；石膏或卤水点制，含钙。' },
  { id: 7, name: '希腊酸奶', category: 'protein', emoji: '🥛', image: '', tags: ['高蛋白'], nutrition: { calories: 59, carbs: 3.6, protein: 10, fat: 0.4 }, note: '无糖脱脂希腊酸奶（市售成品）。过滤乳清后蛋白密度高；风味/含糖款添加大量糖，注意看配料表。' },
  { id: 8, name: '糙米', category: 'carbs', emoji: '🌾', image: '', tags: ['全谷', '低GI', '膳食纤维'], nutrition: { calories: 362, carbs: 76, protein: 7.5, fat: 2.9 }, note: '生米/干重。煮熟吸水后约111kcal/100g（热量密度减半）；保留麸皮，膳食纤维与B族高于白米。按干重记录最准。' },
  { id: 9, name: '燕麦', category: 'carbs', emoji: '🥣', image: '', tags: ['饱腹', 'β-葡聚糖'], nutrition: { calories: 389, carbs: 66, protein: 17, fat: 7 }, note: '燕麦片干重。煮后吸水热量密度大降；传统燕麦片升糖慢于即食/打碎燕麦；β-葡聚糖助降脂。' },
  { id: 10, name: '全麦面包', category: 'carbs', emoji: '🍞', image: '', tags: ['复合碳水', '膳食纤维'], nutrition: { calories: 247, carbs: 41, protein: 13, fat: 3.4 }, note: '以成品计（非生面团）。"全麦"需看配料表首位是否为全麦粉，许多为白面+麦麸着色；真正全麦膳食纤维更高。' },
  { id: 11, name: '红薯', category: 'carbs', emoji: '🍠', image: '', tags: ['抗性淀粉'], nutrition: { calories: 86, carbs: 20, protein: 1.6, fat: 0.1 }, note: '生重。烤熟后约90kcal；放凉后抗性淀粉增加、升糖更缓；生吃难消化。优质复合碳水替代。' },
  { id: 12, name: '藜麦', category: 'carbs', emoji: '🌾', image: '', tags: ['完整蛋白', '无麸质'], nutrition: { calories: 368, carbs: 64, protein: 14, fat: 6 }, note: '生重/干重。煮熟后约120kcal/100g；含全部必需氨基酸的少有谷物，无麸质、矿物质丰富。' },
  { id: 13, name: '牛油果', category: 'fat', emoji: '🥑', image: '', tags: ['单不饱和脂肪'], nutrition: { calories: 160, carbs: 9, protein: 2, fat: 15 }, note: '果肉可食部。果皮与核不可食；成熟度影响脂肪与口感；以单不饱和脂肪酸为主的健康脂肪。' },
  { id: 14, name: '橄榄油', category: 'fat', emoji: '🫒', image: '', tags: ['抗氧化', '单不饱和脂肪'], nutrition: { calories: 884, carbs: 0, protein: 0, fat: 100 }, note: '纯脂肪。初榨适合凉拌（烟点≈190℃），精炼可炒菜（烟点≈240℃）；热量极高，按勺计量。' },
  { id: 15, name: '坚果', category: 'fat', emoji: '🥜', image: '', tags: ['不饱和脂肪'], nutrition: { calories: 607, carbs: 20, protein: 20, fat: 54 }, note: '原味生坚果。盐焗/油炸增加钠与脂肪；每日一小把（约25–30g）即可，热量密度高。' },
  { id: 16, name: '奇亚籽', category: 'fat', emoji: '🌰', image: '', tags: ['Omega-3', '膳食纤维'], nutrition: { calories: 486, carbs: 34, protein: 17, fat: 31 }, note: '干重。吸水膨胀约15倍增加饱腹；富含ALA型Omega-3（人体内转化率有限）；膳食纤维极高。' },
  { id: 17, name: '西兰花', category: 'veg', emoji: '🥦', image: '', tags: ['十字花科', '萝卜硫素'], nutrition: { calories: 34, carbs: 7, protein: 2.8, fat: 0.4 }, note: '生重。含萝卜硫素（切碎静置后更活跃）；十字花科大量生食可能影响甲状腺（适量无碍，甲减者注意）；蒸比煮保留更多维C。' },
  { id: 18, name: '菠菜', category: 'veg', emoji: '🥬', image: '', tags: ['叶黄素', '叶酸'], nutrition: { calories: 23, carbs: 3.6, protein: 2.9, fat: 0.4 }, note: '生重。含草酸，焯水去涩并提升钙/铁吸收；富含叶黄素与叶酸；草酸钙结石者适量。' },
  { id: 19, name: '番茄', category: 'veg', emoji: '🍅', image: '', tags: ['番茄红素'], nutrition: { calories: 18, carbs: 3.9, protein: 0.9, fat: 0.2 }, note: '生重。熟制（加油）番茄红素吸收率大幅提升；果皮与籽均可食。' },
  { id: 20, name: '胡萝卜', category: 'veg', emoji: '🥕', image: '', tags: ['β-胡萝卜素'], nutrition: { calories: 41, carbs: 10, protein: 0.9, fat: 0.2 }, note: '生重。β-胡萝卜素为脂溶性，与少量油脂同食吸收更好；生食脆甜、熟食更甜。' },
  { id: 21, name: '芦笋', category: 'veg', emoji: '🌱', image: '', tags: ['叶酸'], nutrition: { calories: 20, carbs: 4, protein: 2.2, fat: 0.1 }, note: '嫩茎可食，老根木质化弃去；含芦丁与叶酸；焯水易流失水溶性维C，宜快炒或蒸。' },
  { id: 22, name: '羽衣甘蓝', category: 'veg', emoji: '🥬', image: '', tags: ['十字花科', '维K'], nutrition: { calories: 49, carbs: 9, protein: 4.3, fat: 0.9 }, note: '生重。营养密度极高；含维生素K（服用华法林等抗凝药者注意）；沙拉前用手按摩软化口感。' },
];

/* ---------------- 知识库并入（非精选的 63 条） ---------------- */

const DRINK_KW = new Set([
  '绿茶', '茶', '咖啡', '可乐', '汽水', '雪碧', '啤酒', '红酒', '白酒', '酒', '果汁', '果味饮料',
]);
const FRUIT_KW = new Set([
  '西瓜', '哈密瓜', '甜瓜', '芒果', '菠萝', '木瓜', '桃子', '梨', '杏', '樱桃', '葡萄柚', '柚子',
  '猕猴桃', '奇异果', '火龙果', '香蕉', '橙', '橘子', '橙汁', '柠檬', '蓝莓', '草莓', '莓', '苹果', '葡萄', '葡萄干',
]);
const PROTEIN_KW = new Set([
  '鸡胸肉', '牛肉', '三文鱼', '金枪鱼', '鸡蛋', '虾', '豆腐', '希腊酸奶', '猪肝', '螃蟹', '龙虾', '蛤蜊',
  '生蚝', '扇贝', '鱿鱼', '章鱼', '海参', '鳗鱼', '沙丁鱼', '羊肉', '鸭肉', '火鸡', '猪里脊', '火腿',
  '五花肉', '排骨', '鸡翅', '带鱼', '豆腐干', '毛豆', '蛋白粉', '黄豆', '黑豆', '大豆', '牛奶', '酸奶',
]);
const FAT_KW = new Set([
  '牛油果', '橄榄油', '坚果', '奇亚籽', '芝麻', '巧克力', '花生', '核桃', '腰果', '开心果', '榛子',
  '黄油', '奶油', '芝士', '奶酪',
]);
const VEG_KW = new Set([
  '西兰花', '菠菜', '番茄', '胡萝卜', '芦笋', '羽衣甘蓝', '蘑菇', '紫菜', '海带', '海藻', '昆布', '南瓜',
  '大蒜', '姜', '生姜', '芹菜', '生菜', '油麦菜', '白菜', '青菜', '韭菜', '黄瓜', '冬瓜', '苦瓜',
  '茄子', '青椒', '彩椒', '玉米', '甜玉米', '豌豆', '扁豆', '辣椒',
]);

/** 常见食材的精准 emoji；未命中则用分类默认 emoji */
const EMOJI_HINTS: Record<string, string> = {
  牛油果: '🥑', 橄榄油: '🫒', 鸡蛋: '🥚', 虾: '🦐', 三文鱼: '🐟', 金枪鱼: '🐟',
  牛肉: '🥩', 鸡胸肉: '🍗', 螃蟹: '🦀', 龙虾: '🦞', 生蚝: '🦪', 扇贝: '🐚',
  鱿鱼: '🦑', 章鱼: '🐙', 鳗鱼: '🐟', 沙丁鱼: '🐟', 羊肉: '🥩', 鸭肉: '🦆',
  火鸡: '🦃', 猪里脊: '🥩', 火腿: '🥓', 五花肉: '🥩', 排骨: '🍖', 鸡翅: '🍗',
  带鱼: '🐟', 豆腐: '🫘', 豆腐干: '🫘', 毛豆: '🫛', 希腊酸奶: '🥛', 猪肝: '🫀',
  糙米: '🌾', 燕麦: '🥣', 全麦: '🍞', 红薯: '🍠', 藜麦: '🌾', 坚果: '🥜',
  奇亚籽: '🌰', 芝麻: '🌰', 西兰花: '🥦', 菠菜: '🥬', 番茄: '🍅', 胡萝卜: '🥕',
  芦笋: '🌱', 羽衣甘蓝: '🥬', 蘑菇: '🍄', 紫菜: '🌿', 海带: '🌿', 香蕉: '🍌',
  橙: '🍊', 蓝莓: '🫐', 苹果: '🍎', 南瓜: '🎃', 大蒜: '🧄', 姜: '🫚',
  葡萄: '🍇', 绿茶: '🍵', 咖啡: '☕', 可乐: '🥤', 啤酒: '🍺', 红酒: '🍷',
  果汁: '🧃', 巧克力: '🍫', 蜂蜜: '🍯', 蛋糕: '🍰', 薯条: '🍟', 西瓜: '🍉',
  芒果: '🥭', 桃子: '🍑', 梨: '🍐', 樱桃: '🍒', 葡萄柚: '🍊', 猕猴桃: '🥝',
  火龙果: '🐉', 玉米: '🌽', 黄瓜: '🥒', 茄子: '🍆', 青椒: '🫑', 芹菜: '🥬',
  白菜: '🥬', 花生: '🥜', 核桃: '🌰', 牛奶: '🥛', 酸奶: '🥛', 茶: '🍵',
  白酒: '🍶', 酒: '🍶', 饺子: '🥟', 包子: '🥟', 面条: '🍜', 米饭: '🍚',
  面包: '🍞', 能量棒: '🍫', 代餐: '🥤', 果味饮料: '🧃', 雪碧: '🥤', 汽水: '🥤',
};

const CAT_DEFAULT_EMOJI: Record<IngredientCategory, string> = {
  protein: '🥩', carbs: '🌾', fat: '🥑', veg: '🥬', fruit: '🍎', drink: '🥤',
};

/** 把知识库行归入六大类并推导 emoji（仅用于「非精选」的并入条目） */
function classifyRow(row: IngredientDbRow): { category: IngredientCategory; emoji: string } {
  const kws = row.kw;
  let cat: IngredientCategory = 'carbs';
  if (kws.some((k) => DRINK_KW.has(k))) cat = 'drink';
  else if (kws.some((k) => FRUIT_KW.has(k))) cat = 'fruit';
  else if (kws.some((k) => PROTEIN_KW.has(k))) cat = 'protein';
  else if (kws.some((k) => FAT_KW.has(k))) cat = 'fat';
  else if (kws.some((k) => VEG_KW.has(k))) cat = 'veg';
  const name = kws[0] ?? '';
  return { category: cat, emoji: (name && EMOJI_HINTS[name]) || CAT_DEFAULT_EMOJI[cat] };
}

/** 精选之外的知识库行并入种子库，分配稳定 id 23+（按知识库顺序，跨版本不变） */
const CURATED_NAMES = new Set(CURATED_INGREDIENTS.map((c) => c.name));
const EXTRA_INGREDIENTS: Ingredient[] = (() => {
  const out: Ingredient[] = [];
  const used = new Set(CURATED_NAMES);
  let nextId = 23;
  for (const row of ING_DB) {
    const name = row.kw[0];
    if (!name || used.has(name)) continue;
    used.add(name);
    const { category, emoji } = classifyRow(row);
    out.push({
      id: nextId++,
      name,
      category,
      emoji,
      image: '',
      tags: [],
      nutrition: { ...row.macros },
      note: row.note ?? '',
      unit: row.unit,
      gramsPerUnit: row.gramsPerUnit,
    });
  }
  return out;
})();

/** 种子食材 = 精选 22 + 知识库并入 ≈ 86 条，microns 在装载时由 detectMicrons 补齐 */
export const SEED_INGREDIENTS: Ingredient[] = [...CURATED_INGREDIENTS, ...EXTRA_INGREDIENTS];

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
    isDefault: false,
    defaultMealType: 'breakfast',
    items: [
      { ingredientId: 4, amount: 50 },
      { ingredientId: 7, amount: 200 },
      { ingredientId: 9, amount: 40 },
      { ingredientId: 11, amount: 100 },
    ],
  },
];
