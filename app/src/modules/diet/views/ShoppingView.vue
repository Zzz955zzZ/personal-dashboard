<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import IngredientAvatar from '../components/IngredientAvatar.vue';
import IngredientChipPicker from '../components/IngredientChipPicker.vue';
import { fromGrams, round1, unitLabel } from '../engine';
import { useDietStore } from '../store/diet-store';
import type { ShoppingItem } from '../types';

const store = useDietStore();

const mode = ref<'list' | 'add'>('list');

const form = ref<{ ingredientId: number | null; qty: number | null }>({ ingredientId: null, qty: null });
const search = ref('');
const pickerOpen = ref(false);

watch(mode, (m) => {
  if (m !== 'add') return;
  form.value = { ingredientId: null, qty: null };
  search.value = '';
  pickerOpen.value = true;
});

const selected = computed(() => (form.value.ingredientId === null ? undefined : store.findIng(form.value.ingredientId)));
const qtyUnitLabel = computed(() => unitLabel(selected.value));
const qtyPlaceholder = computed(() => (qtyUnitLabel.value === '个' ? '1' : '500'));
const canSubmit = computed(() => form.value.ingredientId !== null && form.value.qty !== null && form.value.qty > 0);

function pick(id: number): void {
  form.value.ingredientId = id;
  store.touchIngredient(id);
  if (form.value.qty === null) form.value.qty = store.findIng(id)?.unit === '个' ? 1 : 500;
  pickerOpen.value = false;
}

function clearPick(): void {
  form.value.ingredientId = null;
  search.value = '';
  pickerOpen.value = true;
}

function submit(): void {
  if (!canSubmit.value) return;
  store.addShoppingItem(form.value.ingredientId as number, form.value.qty as number);
  mode.value = 'list';
}

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
    <!-- 列表模式 -->
    <template v-if="mode === 'list'">
      <div class="flex items-center justify-between gap-3 mb-5">
        <p class="text-sm text-paper-500 font-light">采购清单：库存为空自动入库，采购后手动勾选已购。</p>
        <button
          class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-coral-400 text-white hover:opacity-90"
          @click="mode = 'add'"
        >
          + 添加
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
    </template>

    <!-- 添加模式 -->
    <template v-else>
      <div class="flex items-center gap-3 mb-5">
        <button class="text-paper-400 hover:text-ink text-sm" @click="mode = 'list'">‹ 返回</button>
        <h3 class="font-display text-lg">添加采购项</h3>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <IngredientChipPicker
          v-model:search="search"
          v-model:open="pickerOpen"
          :source="store.ingredients"
          :last-selected="store.ingLastSelected"
          :selected-id="form.ingredientId"
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
            v-model.number="form.qty"
            type="number"
            :placeholder="qtyPlaceholder"
            min="0.1"
            step="0.1"
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
            :disabled="!canSubmit"
          >
            添加
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
