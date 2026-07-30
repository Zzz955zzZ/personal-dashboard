/**
 * 结构化食材识别。
 *
 * 三级结果，语义必须保持稳定：
 *   1. 知识库精确命中  -> match=true,  estimated=false（核实值）
 *   2. 类别启发式估算  -> match=true,  estimated=true （UI 必须打「参考值」标签）
 *   3. 认不出           -> match=false                （诚实无结果，不编数据）
 */
import { ING_DB } from '../data/ing-db';
import { inferCategory } from './infer-category';
import type { IngredientUnit, Micro, Nutrition, RecognizeResult } from '../types';

const EMPTY: RecognizeResult = {
  match: false,
  macros: null,
  micros: [],
  unit: null,
  gramsPerUnit: null,
  note: '',
  estimated: false,
  category: '',
};

function emptyResult(): RecognizeResult {
  return { ...EMPTY, micros: [] };
}

export function aiRecognize(name: string): RecognizeResult {
  if (!name || !name.trim()) return emptyResult();

  const low = String(name).toLowerCase();
  const allMicros: Record<string, Micro> = {};
  let foundMacros: Nutrition | null = null;
  let suggestedUnit: IngredientUnit | null = null;
  let suggestedGrams: number | null = null;
  let suggestedNote = '';
  let matchedKw = '';

  for (const row of ING_DB) {
    if (!row.kw.some((k) => low.includes(k.toLowerCase()))) continue;
    row.m.forEach((mt) => {
      allMicros[mt.name] = mt;
    });
    if (!foundMacros && row.macros) foundMacros = { ...row.macros };
    if (!suggestedUnit && row.unit) suggestedUnit = row.unit;
    if (!suggestedGrams && row.gramsPerUnit) suggestedGrams = row.gramsPerUnit;
    if (!suggestedNote && row.note) suggestedNote = row.note;
    if (!matchedKw && row.kw[0]) matchedKw = row.kw[0];
  }

  // 1) 知识库核实值
  if (Object.keys(allMicros).length > 0 || foundMacros) {
    return {
      match: true,
      macros: foundMacros,
      micros: Object.values(allMicros),
      unit: suggestedUnit,
      gramsPerUnit: suggestedGrams,
      note: suggestedNote,
      estimated: false,
      category: matchedKw,
    };
  }

  // 2) 类别估算，保证对用户输入永远有反馈
  const est = inferCategory(name);
  if (est) {
    return {
      match: true,
      macros: est.macros,
      micros: est.micros,
      unit: null,
      gramsPerUnit: null,
      note: est.note + '，仅供参考。',
      estimated: true,
      category: est.label,
    };
  }

  // 3) 认不出
  return emptyResult();
}

/** v1.0 的兼容别名，只取微量营养素 */
export function detectMicrons(name: string): Micro[] {
  return aiRecognize(name).micros;
}
