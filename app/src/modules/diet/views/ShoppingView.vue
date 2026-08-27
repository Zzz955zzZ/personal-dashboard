<script setup lang="ts">
import { computed, ref } from 'vue';

import IngredientAvatar from '../components/IngredientAvatar.vue';
import ShoppingFormModal from '../components/ShoppingFormModal.vue';
import { fromGrams, round1, unitLabel } from '../engine';
import { useDietStore } from '../store/diet-store';
import type { ShoppingItem } from '../types';

const store = useDietStore();

const shopOpen = ref(false);

const shoppingList = computed(() => [...store.shopping]);
const boughtCount = computed(() => store.shopping.filter((s) => s.done).length);

function onQtyChange(item: ShoppingItem, ev: Event): void {
  const el = ev.target as HTMLInputElement;
  const ok = store.updateShopQty(item, Number(el.value));
  if (!ok) el.value = String(round1(fromGrams(store.findIng(item.ingredientId), item.quantity)));
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3 mb-5">
      <p class="text-sm text-paper-500 font-light">采购清单：库存为空自动入库，采购后手动勾选已购。</p>
      <button
        class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-coral-400 text-white hover:opacity-90"
        @click="shopOpen = true"
      >
        + 添加采购
      </button>
    </div>

    <div class="flex flex-col gap-2">
      <div
        v-for="s in shoppingList"
        :key="s.id"
        class="flex items-center gap-3 p-4 rounded-xl border border-paper-300/60 bg-white/70 group"
      >
        <input v-model="s.done" type="checkbox" class="w-5 h-5 accent-coral-400 rounded" @change="store.onShopBought(s)" />
        <IngredientAvatar :ing="store.findIng(s.ingredientId)" :size="36" />
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <span class="text-sm truncate" :class="s.done ? 'line-through text-paper-400' : ''">
            {{ store.findIng(s.ingredientId)?.name || s.ingredientId }}
          </span>
          <div class="flex items-center gap-1 shrink-0">
            <input
              type="number"
              :value="round1(fromGrams(store.findIng(s.ingredientId), s.quantity))"
              min="0.1"
              step="0.1"
              class="w-16 px-2 py-1 rounded-lg border border-paper-300/60 bg-white text-xs focus:outline-none focus:border-coral-300"
              @change="onQtyChange(s, $event)"
            />
            <span class="text-xs text-paper-400">{{ unitLabel(store.findIng(s.ingredientId)) }}</span>
          </div>
        </div>
        <button class="sm:opacity-0 sm:group-hover:opacity-100 text-paper-400 hover:text-red-500 transition-all text-sm px-2" @click="store.removeShopping(s.id)">
          删除
        </button>
      </div>
      <div v-if="!shoppingList.length" class="text-center text-paper-400 py-12 text-sm font-light">清单为空。</div>
    </div>

    <div class="mt-5 flex items-center justify-between text-xs text-paper-500">
      <span>共 {{ shoppingList.length }} 项 · 已购 {{ boughtCount }} 项</span>
      <button v-if="shoppingList.length" class="hover:text-coral-500 transition-colors" @click="store.clearBought()">清除已购</button>
    </div>

    <ShoppingFormModal :open="shopOpen" @close="shopOpen = false" />
  </div>
</template>
