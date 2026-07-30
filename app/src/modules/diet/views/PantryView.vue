<script setup lang="ts">
import { computed } from 'vue';

import IngredientAvatar from '../components/IngredientAvatar.vue';
import { fromGrams, round1, unitLabel } from '../engine';
import { useDietStore } from '../store/diet-store';
import { useDietUi } from '../composables/use-diet-ui';

const store = useDietStore();
const { modals } = useDietUi();

const pantryList = computed(() => [...store.pantry]);
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3 mb-5">
      <p class="text-sm text-paper-500 font-light">库存追踪：采购入库自动增加，饮食消耗自动扣减。</p>
      <button
        class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-coral-400 text-white hover:opacity-90"
        @click="modals.pantryForm = true"
      >
        + 手动添加
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
  </div>
</template>
