<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import IngredientAvatar from '../components/IngredientAvatar.vue';
import IngredientChipPicker from '../components/IngredientChipPicker.vue';
import { fromGrams, round1, unitLabel } from '../engine';
import { useDietStore } from '../store/diet-store';

const store = useDietStore();

const mode = ref<'list' | 'add'>('list');

const ingredientId = ref<number | null>(null);
const qty = ref(500);
const search = ref('');
const pickerOpen = ref(false);

watch(mode, (m) => {
  if (m !== 'add') return;
  ingredientId.value = null;
  qty.value = 500;
  search.value = '';
  pickerOpen.value = true;
});

const selected = computed(() => (ingredientId.value === null ? undefined : store.findIng(ingredientId.value)));
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
  mode.value = 'list';
}

const pantryList = computed(() => [...store.pantry]);
</script>

<template>
  <div>
    <!-- 列表模式 -->
    <template v-if="mode === 'list'">
      <div class="flex items-center justify-between gap-3 mb-5">
        <p class="text-sm text-paper-500 font-light">库存追踪：采购入库自动增加，饮食消耗自动扣减。</p>
        <button
          class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-coral-400 text-white hover:opacity-90"
          @click="mode = 'add'"
        >
          + 添加
        </button>
      </div>

      <div v-if="store.zeroStockIds.length" class="mb-4 p-3 rounded-xl border border-yellow-300 bg-yellow-50 text-xs text-yellow-700">
        ⚠ 以下食材库存为空，已自动加入采购清单：
        <span
          v-for="z in store.zeroStockIds"
          :key="z"
          class="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-white border border-yellow-200"
        >
          {{ store.findIng(z)?.emoji || '?' }} {{ store.findIng(z)?.name || z }}
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div
          v-for="p in pantryList"
          :key="p.id"
          class="flex items-center gap-3 p-4 rounded-xl border border-paper-300/60 bg-white/70 group"
        >
          <IngredientAvatar :ing="store.findIng(p.ingredientId)" :size="36" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{{ store.findIng(p.ingredientId)?.name || p.ingredientId }}</div>
            <div class="text-[11px]" :class="p.quantity > 0 ? 'text-green-600' : 'text-red-400'">
              库存：<strong>{{ round1(fromGrams(store.findIng(p.ingredientId), p.quantity)) }}</strong>
              {{ unitLabel(store.findIng(p.ingredientId)) }}
            </div>
          </div>
          <div class="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button class="w-9 h-7 rounded-md bg-paper-200 text-xs hover:bg-red-50" @click="store.adjustPantry(p.id, -store.pantryStep(p.ingredientId))">
              −{{ store.pantryStep(p.ingredientId) }}
            </button>
            <button class="w-9 h-7 rounded-md bg-paper-200 text-xs hover:bg-green-50" @click="store.adjustPantry(p.id, store.pantryStep(p.ingredientId))">
              +{{ store.pantryStep(p.ingredientId) }}
            </button>
            <button class="w-7 h-7 rounded-md bg-red-50 text-red-500 text-xs" @click="store.removePantry(p.id)">×</button>
          </div>
        </div>
        <div v-if="!pantryList.length" class="col-span-full text-center text-paper-400 py-12 text-sm font-light">库存为空。</div>
      </div>
    </template>

    <!-- 添加模式 -->
    <template v-else>
      <div class="flex items-center gap-3 mb-5">
        <button class="text-paper-400 hover:text-ink text-sm" @click="mode = 'list'">‹ 返回</button>
        <h3 class="font-display text-lg">添加到库存</h3>
      </div>

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

        <div class="flex gap-3 mt-2">
          <button
            type="button"
            class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-paper-300 hover:bg-coral-50"
            @click="mode = 'list'"
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
    </template>
  </div>
</template>
