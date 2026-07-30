/**
 * 单位系统：内部一律以克存储，仅在展示/输入层做「个 ↔ g」换算。
 * 行为与 v1.0 单文件版逐行等价。
 */
import type { Ingredient } from '../types';

/** 参与换算所需的最小食材形状，便于传入部分对象 */
type UnitLike = Pick<Ingredient, 'unit' | 'gramsPerUnit'> | null | undefined;

/** 展示用单位标签 */
export function unitLabel(ing: UnitLike): '个' | 'g' {
  return ing && ing.unit === '个' ? '个' : 'g';
}

/** 用户输入值 -> 克 */
export function toGrams(ing: UnitLike, val: number): number {
  if (ing && ing.unit === '个') return val * (Number(ing.gramsPerUnit) || 1);
  return val;
}

/** 克 -> 展示值 */
export function fromGrams(ing: UnitLike, g: number): number {
  if (ing && ing.unit === '个') {
    const gp = Number(ing.gramsPerUnit) || 1;
    return gp ? g / gp : g;
  }
  return g;
}

/** 保留一位小数 */
export function round1(n: number): number {
  return Math.round((Number(n) || 0) * 10) / 10;
}

/** 格式化为一位小数，非正数显示破折号 */
export function fmt1(n: number): string {
  const v = Number(n);
  return v > 0 ? v.toFixed(1) : '—';
}
