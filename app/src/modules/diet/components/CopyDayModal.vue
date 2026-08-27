<script setup lang="ts">
/** 把某一天的整日记录复制到当前查看日期（从后往前复制） */
import { computed, ref, watch } from 'vue';

import BaseModal from '@/shared/components/BaseModal.vue';
import { localDateStr, todayStr } from '../constants';
import { useDietStore } from '../store/diet-store';
import { useDietUi } from '../composables/use-diet-ui';
import { useUndo } from '@/shared/composables/use-undo';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const store = useDietStore();
const { logDate } = useDietUi();
const { pushUndo } = useUndo();

const sourceDate = ref(todayStr());
const withPantryDeduct = ref(false);

const sourceCount = computed(() => store.getDayLog(sourceDate.value).length);

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateStr(d);
}

watch(
  () => props.open,
  (open) => {
    if (open) sourceDate.value = yesterdayStr();
  },
);

function execute(): void {
  if (!sourceDate.value || !sourceCount.value) return;
  const from = sourceDate.value;
  const to = logDate.value;
  const { count, revert } = store.copyDay(from, to, withPantryDeduct.value);
  pushUndo(`从 ${from} 复制 ${count} 条记录`, revert);
  emit('close');
}
</script>

<template>
  <BaseModal :open="open" title="复制往日记录" width="md" :closable="false" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <div>
        <label class="text-[11px] uppercase tracking-wide2 text-paper-500 block mb-1">目标日期</label>
        <div class="text-sm font-medium text-paper-700">{{ logDate }}</div>
        <div class="text-[11px] text-paper-400 mt-1">复制到此日期</div>
      </div>

      <div>
        <label class="text-[11px] uppercase tracking-wide2 text-paper-500 block mb-1">来源日期</label>
        <input
          v-model="sourceDate"
          type="date"
          class="w-full px-4 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
        />
        <div class="flex gap-2 mt-2">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs border border-paper-300 hover:bg-coral-50 text-paper-600"
            @click="sourceDate = yesterdayStr()"
          >
            昨天
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs border border-paper-300 hover:bg-coral-50 text-paper-600"
            @click="sourceDate = todayStr()"
          >
            今天
          </button>
        </div>
        <div class="text-[11px] text-paper-400 mt-2">共 {{ sourceCount }} 条记录可复制</div>
      </div>

      <div>
        <label class="text-[11px] uppercase tracking-wide2 text-paper-500 block mb-1">复制选项</label>
        <label class="flex items-center gap-2 cursor-pointer select-none text-xs text-paper-600 mt-2">
          <input v-model="withPantryDeduct" type="checkbox" class="accent-coral-400 rounded" />
          同时扣减库存（模拟真实食用）
        </label>
      </div>

      <div class="flex gap-3 mt-1">
        <button
          type="button"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-paper-300 hover:bg-coral-50"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          type="button"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-coral-400 text-white hover:opacity-90 disabled:opacity-40"
          :disabled="!sourceCount"
          @click="execute"
        >
          确认复制
        </button>
      </div>
    </div>
  </BaseModal>
</template>
