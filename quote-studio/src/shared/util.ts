/** 通用工具：ID 生成与时间戳。 */

/** 生成唯一 ID（优先用 crypto.randomUUID，降级用随机串）。 */
export function genId(prefix = ''): string {
  let rnd: string;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    rnd = crypto.randomUUID();
  } else {
    rnd = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return prefix ? `${prefix}_${rnd}` : rnd;
}

/** 当前时间的 ISO 字符串。 */
export function nowIso(): string {
  return new Date().toISOString();
}

/** 把任意输入安全地转为有限数字（非法返回 0）。 */
export function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** 把任意输入转为非空字符串（截断到 maxLen）。 */
export function str(value: unknown, maxLen = 4000): string {
  if (typeof value === 'string') return value.slice(0, maxLen);
  if (value === null || value === undefined) return '';
  return String(value).slice(0, maxLen);
}

/**
 * 规范化单位输入：把 m² / m³ / ㎡ 等上标/全角变体统一为 m2 / m3，
 * 避免用户粘贴特殊字符导致单位列表出现重复或不可识别的项。
 */
export function normalizeUnitInput(input: string): string {
  return input
    .replace(/m\s*[²\u2072\u1d57]/gi, 'm2')
    .replace(/m\s*[³\u2073]/gi, 'm3')
    .replace(/㎡/g, 'm2')
    .replace(/m³/gi, 'm3')
    .trim();
}
