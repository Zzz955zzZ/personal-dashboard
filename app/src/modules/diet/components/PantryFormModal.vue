<script setup lang="ts">
/** 手动往库存里加一笔 */
import { computed, ref, watch } from 'vue';

import BaseModal from '@/shared/components/BaseModal.vue';
import IngredientChipPicker from './IngredientChipPicker.vue';
import { unitLabel } from '../engine';
import { useDietStore } from '../store/diet-store';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const store = useDietStore();

const ingredientId = ref<number | null>(null);
const qty = ref(500);
const search = ref('');
const pickerOpen = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    ingredientId.value = null;
    qty.value = 500;
    search.value = '';
    pickerOpen.value = true;
  },
  { immediate: true },
);

const selected = computed(() =>
  ingredientId.value === null ? undefined : store.findIng(ingredientId.value),
);

const qtyUnitLabel = computed(() => unitLabel(selected.value));

function pick(id: number): void {
  ingredientId.value = id;
  store.touchIngredient(id);
  pickerOpen.value = false;
}

function clearPick(): void {
  ingredientId.value = null;
  search.value = '';
  pickerOpen.value = true;
}

function submit(): void {
  if (ingredientId.value === null) return;
  store.restorePantry(ingredientId.value, qty.value);
  emit('close');
}
</script>

<template>
  <BaseModal :open="open" title="添加到库存" width="sm" @close="emit('close')">
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <IngredientChipPicker
        v-model:search="search"
        v-model:open="pickerOpen"
        :source="store.ingredients"
        :last-selected="store.ingLastSelected"
        :selected-id="ingredientId"
        placeholder="搜索并选择食材…"
        @pick="pick"
      />

      <div v-if="selected" class="flex items-center gap-2">
        <span class="text-sm font-medium truncate">{{ selected.emoji }} {{ selected.name }}</span>
        <button type="button" class="text-paper-400 hover:text-red-500 text-xs" @click="clearPick">×</button>
      </div>
      <div v-else class="text-xs text-paper-400">↑ 搜索或点击上方食材进行选择</div>

      <div>
        <label class="text-[11px] uppercase tracking-wide2 text-paper-500">数量（{{ qtyUnitLabel }}）</label>
        <input
          v-model.number="qty"
          type="number"
          required
          min="0"
          class="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
        />
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
          type="submit"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-coral-400 text-white hover:opacity-90 disabled:opacity-40"
          :disabled="ingredientId === null"
        >
          添加
        </button>
      </div>
    </form>
  </BaseModal>
</template>
