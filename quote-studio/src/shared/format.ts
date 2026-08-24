/**
 * 全局格式化工具。
 *
 * 货币统一走 formatEUR（Intl.NumberFormat('es-ES', EUR)），禁止在组件内手拼 €。
 * 另提供 snakeKeys/camelKeys 供云同步边界（camelCase ↔ snake_case）使用。
 */

const eurFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

/** 欧元格式化（西班牙语区域，得到「1.234,56 €」式样）。 */
export function formatEUR(value: number): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return eurFormatter.format(n);
}

/** 普通数字格式化（千分位）。 */
export function formatNumber(value: number, fractionDigits = 0): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return n.toLocaleString('es-ES', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** 从 ISO 字符串取 YYYY-MM-DD（本地日期）。 */
export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 从 ISO 字符串取 YYYY-MM-DD HH:mm。 */
export function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${formatDate(iso)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toSnakeCaseKey(key: string): string {
  return key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
}

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** 将对象（含一层嵌套）的键由 camelCase 转为 snake_case，供 Supabase 边界使用。 */
export function snakeKeys<T = Record<string, unknown>>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((v) => snakeKeys(v)) as unknown as T;
  }
  if (input && typeof input === 'object' && !(input instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[toSnakeCaseKey(k)] = snakeKeys(v);
    }
    return out as T;
  }
  return input as T;
}

/** 将对象（含一层嵌套）的键由 snake_case 转为 camelCase，供从 Supabase 取回使用。 */
export function camelKeys<T = Record<string, unknown>>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((v) => camelKeys(v)) as unknown as T;
  }
  if (input && typeof input === 'object' && !(input instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[toCamelCaseKey(k)] = camelKeys(v);
    }
    return out as T;
  }
  return input as T;
}
