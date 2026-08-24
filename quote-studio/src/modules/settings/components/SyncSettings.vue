<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
/** 云同步设置（Supabase 可切换）。未配置时仅本地存储，不报错。 */
import { computed, ref } from 'vue';

import { useSettingsStore } from '@/modules/settings';
import { getSupabaseConfig } from '@/shared/sync';
import { icon } from '@/shared/icons';

const store = useSettingsStore();

const url = ref(store.settings.supabaseConfig?.url ?? '');
const anonKey = ref(store.settings.supabaseConfig?.anonKey ?? '');

const active = computed(() => getSupabaseConfig() !== null);

function save(): void {
  const cfg =
    url.value.trim() && anonKey.value.trim()
      ? { url: url.value.trim(), anonKey: anonKey.value.trim() }
      : null;
  store.updateSettings({ supabaseConfig: cfg });
}
function disable(): void {
  url.value = '';
  anonKey.value = '';
  store.updateSettings({ supabaseConfig: null });
}
</script>

<template>
  <div class="qs-card p-5 space-y-4">
    <div class="flex items-center gap-2 text-paper-500">
      <span v-html="icon('cloud')"></span>
      <span class="text-sm">配置 Supabase（EU）后双写到云端；留空则仅本地存储。</span>
    </div>

    <div class="flex items-center gap-2 text-sm">
      <span
        class="inline-block w-2.5 h-2.5 rounded-full"
        :class="active ? 'bg-emerald-500' : 'bg-paper-300'"
      ></span>
      <span :class="active ? 'text-emerald-600' : 'text-paper-400'">
        {{ active ? '已连接 Supabase' : '仅本地存储' }}
      </span>
    </div>

    <div>
      <Label>Supabase URL</Label>
      <Input v-model="url" type="text" placeholder="https://xxxx.supabase.co"  />
    </div>
    <div>
      <Label>Anon Key</Label>
      <Input v-model="anonKey" type="password" placeholder="public anon key"  />
    </div>

    <div class="flex gap-2">
      <Button variant="default" @click="save">
        <span v-html="icon('check')"></span> 保存同步配置
      </Button>
      <Button variant="default" v-if="active" class="-danger" @click="disable">关闭云同步</Button>
    </div>
  </div>
</template>
