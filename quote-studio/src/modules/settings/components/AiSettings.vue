<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
/** AI 配置（OpenAI 兼容）。未配置时识别按钮在前端被禁用。 */
import { computed, ref } from 'vue';

import { useSettingsStore } from '@/modules/settings';
import { useAIService } from '@/modules/ai-link';
import { DEFAULT_PROXY_URL } from '@/modules/ai-link/constants';
import { icon } from '@/shared/icons';

const store = useSettingsStore();
const ai = useAIService();

const baseUrl = ref(store.settings.openaiConfig?.baseUrl ?? 'https://api.openai.com/v1');
const apiKey = ref(store.settings.openaiConfig?.apiKey ?? '');
const model = ref(store.settings.openaiConfig?.model ?? 'gpt-4o-mini');

const configured = computed(() => ai.isConfigured());

function save(): void {
  const cfg =
    baseUrl.value.trim() && apiKey.value.trim()
      ? { baseUrl: baseUrl.value.trim(), apiKey: apiKey.value.trim(), model: model.value.trim() || 'gpt-4o-mini' }
      : null;
  store.updateSettings({ openaiConfig: cfg });
}
function clear(): void {
  baseUrl.value = 'https://api.openai.com/v1';
  apiKey.value = '';
  model.value = 'gpt-4o-mini';
  store.updateSettings({ openaiConfig: null });
}
</script>

<template>
  <div class="qs-card p-5 space-y-4">
    <div class="flex items-center gap-2 text-paper-500">
      <span v-html="icon('sparkles')"></span>
      <span class="text-sm">填写 OpenAI 兼容 API 后，可在报价行用链接自动识别产品。</span>
    </div>

    <div class="flex items-center gap-2 text-sm">
      <span
        class="inline-block w-2.5 h-2.5 rounded-full"
        :class="configured ? 'bg-emerald-500' : 'bg-paper-300'"
      ></span>
      <span :class="configured ? 'text-emerald-600' : 'text-paper-400'">
        {{ configured ? 'AI 已可用' : 'AI 未配置' }}
      </span>
    </div>

    <div>
      <Label class="">Base URL（OpenAI 兼容）</Label>
      <Input v-model="baseUrl" type="text" class="" placeholder="https://api.openai.com/v1"  />
    </div>
    <div>
      <Label class="">API Key</Label>
      <Input v-model="apiKey" type="password" class="" placeholder="sk-..."  />
    </div>
    <div>
      <Label class="">模型</Label>
      <Input v-model="model" type="text" class="" placeholder="gpt-4o-mini"  />
    </div>

    <div class="text-xs text-paper-400">
      代理地址：<code class="break-all">{{ DEFAULT_PROXY_URL }}</code>
      <div class="mt-1">需先启动本地代理：<code>npm run proxy</code></div>
    </div>

    <div class="flex gap-2">
      <Button variant="default" class="" @click="save">
        <span v-html="icon('check')"></span> 保存 AI 配置
      </Button>
      <Button variant="default" v-if="configured" class="-danger" @click="clear">清除配置</Button>
    </div>
  </div>
</template>
