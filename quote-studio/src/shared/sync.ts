/**
 * SyncAdapter（P1 云同步边界）。
 *
 * 设计：所有模块持久化时默认写入 localStorage；若用户在设置中心配置了
 * Supabase（EU 区域），则经本适配器双写到对应表。凭证未到前 supabaseConfig 为
 * null，仅走本地，功能不报错。
 *
 * 边界做 camelCase ↔ snake_case 映射（见 @/shared/format）。
 * 任何失败都吞掉并告警，绝不阻塞前端主流程。
 */

import type { SupabaseConfig } from '@/modules/settings';
import { snakeKeys } from '@/shared/format';

// 由 settings 模块在 hydrate / 更新时回调注入，避免运行时循环依赖。
let supabaseConfig: SupabaseConfig | null = null;

export function setSupabaseConfig(config: SupabaseConfig | null): void {
  supabaseConfig = config && config.url && config.anonKey ? config : null;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  return supabaseConfig;
}

/**
 * 把一组行推送到 Supabase 的 `table` 表（按 id upsert）。
 * 无凭证 / 空数据 / 任意异常时静默返回。
 */
export async function syncPush(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (!supabaseConfig || rows.length === 0) return;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(supabaseConfig.url, supabaseConfig.anonKey);
    const payload = rows.map((r) => snakeKeys(r)) as unknown[];
    const { error } = await client.from(table).upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn(`[sync] upsert 失败 (${table}):`, error.message);
    }
  } catch (e) {
    console.warn(`[sync] 推送失败 (${table}):`, e instanceof Error ? e.message : e);
  }
}
