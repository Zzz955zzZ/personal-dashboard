import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 客户端（按需创建）。
 * - 配置了 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY → 返回可用客户端。
 * - 未配置 → 返回 null，调用方应回退到 localStorage（单机模式）。
 */
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = supabase !== null;
