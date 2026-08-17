import type { DomainDef, MoodType } from './types';

/**
 * 领域分类 — 基于用户实际兴趣定制
 *
 * 可扩展，用户后续可自定义。
 */
export const DOMAINS: DomainDef[] = [
  { key: 'finance_invest', label: '金融投资', emoji: '📈', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'business', label: '创业/商业', emoji: '🚀', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'cognition', label: '认知提升', emoji: '🧠', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'inner_logic', label: '内在逻辑', emoji: '💡', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'fitness', label: '篮球健身', emoji: '🏀', color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'realestate', label: '房产中介', emoji: '🏘️', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'plant_business', label: '植物批发', emoji: '🌿', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'language', label: '语言学习', emoji: '🗣️', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { key: 'tech', label: '技术/AI', emoji: '💻', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  { key: 'life_madrid', label: '马德里生活', emoji: '🇪🇸', color: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'other', label: '其他', emoji: '📌', color: 'bg-gray-50 text-gray-600 border-gray-200' },
];

/** 心情选项 */
export const MOODS: { key: MoodType; label: string; emoji: string }[] = [
  { key: 'great', label: '很棒', emoji: '😄' },
  { key: 'good', label: '不错', emoji: '🙂' },
  { key: 'okay', label: '一般', emoji: '😐' },
  { key: 'meh', label: '低落', emoji: '😔' },
  { key: 'bad', label: '糟糕', emoji: '😞' },
];

/** localStorage 键 */
export const KNOWLEDGE_DB_KEY = 'pdash_knowledge_v1';
