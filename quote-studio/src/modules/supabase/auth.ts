import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { supabase } from './client';

export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * 登录 / 会话 store。
 * 无 Supabase 配置时所有方法安全 no-op（返回错误提示），由调用方决定降级行为。
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const studioId = ref<string | null>(null);
  const loading = ref(false);

  const isAuthed = computed(() => user.value !== null);

  async function loadProfile(): Promise<void> {
    if (!supabase || !user.value) return;
    const { data } = await supabase
      .from('profiles')
      .select('studio_id')
      .eq('id', user.value.id)
      .single();
    studioId.value = (data?.studio_id as string | null) ?? null;
  }

  async function init(): Promise<void> {
    if (!supabase) return;
    loading.value = true;
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        user.value = { id: data.user.id, email: data.user.email ?? null };
        await loadProfile();
      }
    } finally {
      loading.value = false;
    }
  }

  async function login(email: string, password: string): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase 未配置' };
    loading.value = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        user.value = { id: data.user.id, email: data.user.email ?? null };
        await loadProfile();
      }
      return {};
    } finally {
      loading.value = false;
    }
  }

  async function signup(email: string, password: string): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Supabase 未配置' };
    loading.value = true;
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        user.value = { id: data.user.id, email: data.user.email ?? null };
        await loadProfile();
      }
      return {};
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    if (!supabase) return;
    await supabase.auth.signOut();
    user.value = null;
    studioId.value = null;
  }

  function bind(): void {
    if (!supabase) return;
    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
      if (user.value) void loadProfile();
      else studioId.value = null;
    });
  }

  return { user, studioId, loading, isAuthed, init, login, signup, logout, loadProfile, bind };
});
