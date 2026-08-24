<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
/**
 * AI 链接识别弹窗：粘贴 URL → 经代理识别 → 回填到报价行表单。
 * 识别结果 cost / margin 为 null，需人工确认（强约束 #8）。
 */
import { ref, watch } from 'vue';
import { useAIService, type AiRecognizedProduct } from '@/modules/ai-link';
import { icon } from '@/shared/icons';
import BaseModal from '@/shared/components/BaseModal.vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ apply: [product: AiRecognizedProduct]; close: [] }>();

const ai = useAIService();
const url = ref('');
const result = ref<AiRecognizedProduct | null>(null);

watch(
  () => props.open,
  (v) => {
    if (v) {
      url.value = '';
      result.value = null;
      ai.reset();
    }
  },
);

async function run(): Promise<void> {
  if (!ai.isConfigured()) {
    ai.error = '未配置 OpenAI 兼容 API，AI 识别已禁用。';
    ai.status = 'error';
    return;
  }
  try {
    result.value = await ai.recognize(url.value);
  } catch {
    result.value = null;
  }
}

function apply(): void {
  if (result.value) {
    emit('apply', result.value);
    emit('close');
  }
}
</script>

<template>
  <BaseModal :open="open" title="AI 链接识别" width="lg" @close="emit('close')">
    <div class="space-y-4 text-sm">
      <p class="text-paper-500 leading-relaxed">
        粘贴产品页面链接，AI 会提取名称 / 品牌 / 型号 / 图片等字段。<span class="text-coral-600"
          >价格与毛利不会自动填写，需人工确认。</span
        >
      </p>

      <div class="flex gap-2">
        <Input
          v-model="url"
          type="url"
          placeholder="https://example.com/product/..."
          class=""
          @keyup.enter="run"
         />
        <Button variant="default"
          class=" shrink-0"
          :disabled="ai.status === 'fetching' || ai.status === 'parsing'"
          @click="run">
          <span v-html="icon('sparkles')"></span> 识别
        </Button>
      </div>

      <div v-if="ai.status === 'fetching' || ai.status === 'parsing'" class="text-paper-500">
        {{ ai.status === 'fetching' ? '正在抓取页面…' : '正在解析结构化字段…' }}
      </div>

      <div v-if="ai.status === 'error' && ai.error" class="rounded-lg bg-rose-50 text-rose-700 p-3">
        {{ ai.error }}
      </div>

      <div v-if="result" class="qs-card p-4 space-y-1">
        <div class="font-medium">{{ result.name || '（未识别到名称）' }}</div>
        <div class="text-xs text-paper-500">
          {{ [result.brand, result.model].filter(Boolean).join(' · ') || '—' }}
        </div>
        <div class="text-xs text-paper-500">大类：{{ result.categoryGroup || '—' }} · 小类：{{ result.subCategory || '—' }}</div>
        <div v-if="result.description" class="text-xs text-paper-600 mt-1">{{ result.description }}</div>
        <div v-if="result.photoUrl" class="mt-2">
          <img :src="result.photoUrl" alt="识别图片" class="h-20 rounded-lg object-cover" />
        </div>
        <Button variant="default" class=" mt-3 w-full" @click="apply">应用到报价行</Button>
      </div>
    </div>
  </BaseModal>
</template>
