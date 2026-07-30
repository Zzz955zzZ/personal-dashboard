/**
 * 未知食材的类别推断。
 *
 * 设计原则（v1.0 定下的「透明启发式」）：宁可给一个带「参考值」标签的类别估算，
 * 也不要对用户的输入静默无反应；确实认不出时诚实返回 null，绝不编造数据。
 *
 * 判定顺序有意义：先判海鲜/乳制品/蛋类等强特征词，再落到「菜」「果」这类宽泛后缀，
 * 否则「鱼香茄子」之类会被错判。调整顺序前请先补测试。
 */
import type { CategoryEstimate } from '../types';

interface Rule {
  label: string;
  subs: string[];
  macros: CategoryEstimate['macros'];
  micros: CategoryEstimate['micros'];
  /** 提示语里用的名字，缺省同 label（豆类是历史遗留的唯一特例） */
  noteLabel?: string;
}

const RULES: Rule[] = [
  {
    label: '海鲜/水产',
    subs: ['蟹', '虾', '贝', '蛤', '蚬', '蚝', '牡蛎', '扇贝', '鱿', '章鱼', '海参', '海胆', '鱼', '三文', '吞拿', '鳕', '带鱼', '鲈', '鲤'],
    macros: { calories: 100, carbs: 0, protein: 18, fat: 2 },
    micros: [
      { cat: '脂肪酸', name: 'Omega-3' },
      { cat: '矿物质', name: '硒' },
    ],
  },
  {
    label: '乳制品',
    subs: ['奶', '酪', '乳', '芝士', '黄油', '奶油'],
    macros: { calories: 120, carbs: 5, protein: 6, fat: 8 },
    micros: [
      { cat: '矿物质', name: '钙' },
      { cat: '维生素', name: '维生素B12' },
    ],
  },
  {
    label: '蛋类',
    subs: ['蛋'],
    macros: { calories: 155, carbs: 1.1, protein: 13, fat: 11 },
    micros: [
      { cat: '维生素', name: '维生素D' },
      { cat: '功能性', name: '胆碱' },
    ],
  },
  {
    label: '畜禽肉',
    subs: ['肉', '鸡', '牛', '猪', '羊', '鸭', '鹅', '腿', '排', '里脊'],
    macros: { calories: 200, carbs: 0, protein: 22, fat: 12 },
    micros: [
      { cat: '矿物质', name: '铁' },
      { cat: '矿物质', name: '锌' },
    ],
  },
  {
    label: '豆类及制品',
    noteLabel: '豆类',
    subs: ['豆', '腐', '豌', '扁', '豆浆'],
    macros: { calories: 100, carbs: 10, protein: 8, fat: 4 },
    micros: [
      { cat: '功能性', name: '膳食纤维' },
      { cat: '矿物质', name: '钙' },
    ],
  },
  {
    label: '坚果种子',
    subs: ['坚果', '籽', '核桃', '腰果', '花生', '开心果', '杏仁', '巴旦木'],
    macros: { calories: 600, carbs: 20, protein: 18, fat: 50 },
    micros: [
      { cat: '脂肪酸', name: '不饱和脂肪酸' },
      { cat: '维生素', name: '维生素E' },
    ],
  },
  {
    label: '油脂',
    subs: ['油', '橄榄油', '菜籽油'],
    macros: { calories: 884, carbs: 0, protein: 0, fat: 100 },
    micros: [{ cat: '脂肪酸', name: '不饱和脂肪酸' }],
  },
  {
    label: '蔬菜',
    subs: ['菜', '蔬', '芹', '菠', '瓜', '萝卜', '茄', '椒', '葱', '蒜', '姜', '笋', '菇', '菌', '苗', '生菜', '白菜', '青菜', '韭菜', '苦'],
    macros: { calories: 25, carbs: 4, protein: 1.5, fat: 0.3 },
    micros: [
      { cat: '维生素', name: '维生素C' },
      { cat: '功能性', name: '膳食纤维' },
    ],
  },
  {
    label: '水果',
    subs: ['果', '蕉', '莓', '桃', '梨', '苹', '橙', '柚', '葡', '芒', '荔', '樱', '枣', '杏', '榴', '椰', '柿', '楂', '杨', '李'],
    macros: { calories: 55, carbs: 13, protein: 0.6, fat: 0.2 },
    micros: [
      { cat: '维生素', name: '维生素C' },
      { cat: '功能性', name: '膳食纤维' },
    ],
  },
  {
    label: '主食/谷物',
    subs: ['米', '面', '饭', '粥', '饼', '包', '麦', '谷', '薯', '粮', '粉', '馒头', '面条', '饺子'],
    macros: { calories: 220, carbs: 45, protein: 6, fat: 2 },
    micros: [{ cat: '功能性', name: '膳食纤维' }],
  },
  {
    label: '饮品',
    subs: ['茶', '咖啡', '饮', '汁', '汤', '水'],
    macros: { calories: 10, carbs: 2, protein: 0, fat: 0 },
    micros: [],
  },
  {
    label: '甜食/加工',
    subs: ['糖', '巧克力', '蜜', '糕', '甜', '可乐', '汽水', '薯片', '饼干', '蛋糕', '酒'],
    macros: { calories: 400, carbs: 70, protein: 4, fat: 12 },
    micros: [{ cat: '功能性', name: '糖' }],
  },
];

/**
 * 推断未知食材名的类别，认不出返回 null。
 */
export function inferCategory(name: string): CategoryEstimate | null {
  const n = String(name).toLowerCase();
  for (const rule of RULES) {
    if (rule.subs.some((s) => n.includes(s))) {
      return {
        label: rule.label,
        macros: { ...rule.macros },
        micros: rule.micros.map((m) => ({ ...m })),
        note: `按“${rule.noteLabel ?? rule.label}”类别估算`,
      };
    }
  }
  return null;
}

/** 暴露规则表，便于测试与将来做规则可视化 */
export const CATEGORY_RULES = RULES;
