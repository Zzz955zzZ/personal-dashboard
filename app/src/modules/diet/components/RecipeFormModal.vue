<script setup lang="ts">
/** 新增 / 编辑菜谱 */
import { reactive, ref, watch } from 'vue';

import BaseModal from '@/shared/components/BaseModal.vue';
import IngredientChipPicker from './IngredientChipPicker.vue';
import { RECIPE_CATS } from '../constants';
import { useDietStore } from '../store/diet-store';
import type { Recipe, RecipeCategory } from '../types';

const props = defineProps<{ open: boolean; editing: Recipe | null }>();
const emit = defineEmits<{ close: [] }>();

const store = useDietStore();

const form = reactive<{
  name: string;
  category: RecipeCategory;
  ingredientIds: number[];
  method: string;
}>({ name: '', category: 'meat', ingredientIds: [], method: '' });

const search = ref('');

watch(
  () => [props.open, props.editing] as const,
  ([open, editing]) => {
    if (!open) return;
    search.value = '';
    if (editing) {
      Object.assign(form, {
        name: editing.name,
        category: editing.category,
        ingredientIds: [...(editing.ingredientIds || [])],
        method: editing.method || '',
      });
    } else {
      Object.assign(form, { name: '', category: 'meat', ingredientIds: [], method: '' });
    }
  },
  { immediate: true },
);

function toggle(id: number): void {
  const idx = form.ingredientIds.indexOf(id);
  if (idx > -1) form.ingredientIds.splice(idx, 1);
  else {
    form.ingredientIds.push(id);
    store.touchIngredient(id);
  }
}

function submit(): void {
  store.saveRecipe(
    {
      name: form.name.trim(),
      category: form.category,
      ingredientIds: [...form.ingredientIds],
      method: form.method.trim(),
    },
    props.editing ? props.editing.id : null,
  );
  emit('close');
}

const INPUT_CLS =
  'w-full px-4 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300';
const LABEL_CLS = 'text-[11px] uppercase tracking-wide2 text-paper-500';
</script>

<template>
  <BaseModal
    :open="open"
    :title="editing ? '编辑菜谱' : '新增菜谱'"
    width="lg"
    scrollable
    @close="emit('close')"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <div>
        <label :class="LABEL_CLS">菜名 *</label>
        <input v-model="form.name" required type="text" placeholder="香煎三文鱼" :class="['mt-1.5', INPUT_CLS]" />
      </div>

      <div>
        <label :class="LABEL_CLS">分类 *</label>
        <select v-model="form.category" :class="['mt-1.5', INPUT_CLS]">
          <option v-for="(rc, key) in RECIPE_CATS" :key="key" :value="key">{{ rc.emoji }} {{ rc.label }}</option>
        </select>
      </div>

      <div>
        <label :class="LABEL_CLS">所需食材（从原材料库选择）</label>
        <div class="mt-1.5 p-3 rounded-xl border border-paper-300/60 bg-white">
          <IngredientChipPicker
            v-model:search="search"
            :source="store.ingredients"
            :last-selected="store.ingLastSelected"
            :selected-ids="form.ingredientIds"
            placeholder="搜索食材…"
            always-open
            max-height="max-h-48"
            @pick="toggle"
          />
        </div>
        <p class="mt-1 text-[11px] text-paper-400">已选 {{ form.ingredientIds.length }} 种食材</p>
      </div>

      <div>
        <label :class="LABEL_CLS">做法</label>
        <textarea
          v-model="form.method"
          rows="3"
          placeholder="两面撒盐煎至金黄，挤柠檬汁即可。"
          :class="['mt-1.5 resize-none', INPUT_CLS]"
        ></textarea>
      </div>

      <div class="flex gap-3 mt-1">
        <button
          type="button"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-paper-300 hover:bg-coral-50 transition-colors"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          type="submit"
          class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-coral-400 text-white hover:opacity-90 transition-opacity"
        >
          保存
        </button>
      </div>
    </form>
  </BaseModal>
</template>
