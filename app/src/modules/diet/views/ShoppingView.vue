<script setup lang="ts">
import { computed, ref } from 'vue';

import IngredientAvatar from '../components/IngredientAvatar.vue';
import IngredientChipPicker from '../components/IngredientChipPicker.vue';
import { fromGrams, round1, unitLabel } from '../engine';
import { useDietStore } from '../store/diet-store';
import type { ShoppingItem } from '../types';

const store = useDietStore();

const shopForm = ref<{ ingredientId: number | ''; qty: number | '' }>({ ingredientId: '', qty: '' });
const shopSearch = ref('');
const shopPickerOpen = ref(false);

const selected = computed(() =>
  shopForm.value.ingredientId === '' ? undefined : store.findIng(Number(shopForm.value.ingredientId)),
);
const shopUnitLabel = computed(() => unitLabel(selected.value));
const shopUnitPlaceholder = computed(() => (shopUnitLabel.value === '个' ? '1' : '500'));

const shoppingList = computed(() => [...store.shopping]);
const boughtCount = computed(() => store.shopping.filter((s) => s.done).length);

function selectShopIngredient(id: number): void {
  shopForm.value.ingredientId = id;
  store.touchIngredient(id);
  shopSearch.value = '';
  shopPickerOpen.value = false;
  if (!shopForm.value.qty) shopForm.value.qty = store.findIng(id)?.unit === '个' ? 1 : 500;
}

function submit(): void {
  if (shopForm.value.ingredientId === '' || !shopForm.value.qty) return;
  store.addShoppingItem(Number(shopForm.value.ingredientId), Number(shopForm.value.qty));
  shopForm.value = { ingredientId: '', qty: '' };
  shopSearch.value = '';
}

function onQtyChange(item: ShoppingItem, ev: Event): void {
  const el = ev.target as HTMLInputElement;
  const ok = store.updateShopQty(item, Number(el.value));
  if (!ok) el.value = String(round1(fromGrams(store.findIng(item.ingredientId), item.quantity)));
}
</script>

<template>
  <div>
    <form class="mb-5" @submit.prevent="submit">
      <div class="p-4 rounded-xl border border-paper-300/60 bg-white/70">
        <IngredientChipPicker
          v-model:search="shopSearch"
          v-model:open="shopPickerOpen"
          :source="store.ingredients"
          :last-selected="store.ingLastSelected"
          :selected-id="shopForm.ingredientId === '' ? null : Number(shopForm.ingredientId)"
          @pick="selectShopIngredient"
        />
        <div v-if="shopForm.ingredientId !== ''" class="flex gap-2 flex-wrap items-center pt-3 border-t border-paper-200/60">
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            <span class="shrink-0 text-sm font-medium truncate">{{ selected?.emoji }} {{ selected?.name }}</span>
            <button type="button" class="shrink-0 text-paper-400 hover:text-red-500 text-xs" @click="shopForm.ingredientId = ''; shopSearch = ''">
              &times; 清除
            </button>
          </div>
          <div class="flex items-center gap-1.5">
            <input
              v-model.number="shopForm.qty"
              type="number"
              :placeholder="shopUnitPlaceholder"
              min="0.1"
              step="0.1"
              class="w-24 px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
            />
            <span class="text-sm text-paper-500 whitespace-nowrap">{{ shopUnitLabel }}</span>
          </div>
          <button type="submit" class="px-4 py-2 rounded-xl text-sm font-medium bg-coral-400 text-white hover:opacity-90">添加</button>
        </div>
        <div v-else class="text-xs text-paper-400 pt-2">↑ 搜索或点击上方食材进行选择</div>
      </div>
    </form>

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
  </div>
</template>
