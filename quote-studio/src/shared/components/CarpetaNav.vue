<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
/**
 * 档案夹导航（侧栏）。
 * 可复用于「报价系统」与「项目收益」两页，保证报价与盈利共用同一套归类。
 * 选中项通过 v-model 上报：'all' | 'uncategorized' | 具体 carpetaId。
 */
import { computed, ref } from 'vue';

import { useSettingsStore } from '@/modules/settings';
import { useProjectsStore } from '@/modules/revenue';
import { icon } from '@/shared/icons';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [v: string] }>();

const settings = useSettingsStore();
const projectsStore = useProjectsStore();

const carpetas = computed(() => settings.sortedCarpetas());

function isUncategorized(carpetaId: string): boolean {
  return !carpetaId || !settings.getCarpeta(carpetaId);
}

const counts = computed(() => {
  const all = projectsStore.projects.length;
  const unc = projectsStore.projects.filter((p) => isUncategorized(p.carpetaId)).length;
  const byId: Record<string, number> = {};
  for (const c of carpetas.value) byId[c.id] = 0;
  for (const p of projectsStore.projects) {
    if (p.carpetaId && byId[p.carpetaId] !== undefined) byId[p.carpetaId]++;
  }
  return { all, unc, byId };
});

function select(key: string): void {
  emit('update:modelValue', key);
}

/* ---- 内联新建 ---- */
const adding = ref(false);
const newName = ref('');
function startAdd(): void {
  adding.value = true;
}
function commitAdd(): void {
  const name = newName.value.trim();
  if (name) {
    const c = settings.addCarpeta({ name });
    newName.value = '';
    adding.value = false;
    select(c.id);
  }
}
</script>

<template>
  <nav class="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible lg:gap-0.5 pb-2 lg:pb-0 no-scrollbar">
    <!-- 全部 -->
    <button
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors shrink-0 leading-none"
      :class="props.modelValue === 'all' ? 'bg-[#3d342b] text-white' : 'text-paper-600 hover:bg-paper-100'"
      @click="select('all')"
    >
      <span v-html="icon('catalog')" class="shrink-0"></span>
      <span class="font-medium">全部</span>
      <span class="ml-auto text-xs opacity-60 tabular-nums">{{ counts.all }}</span>
    </button>

    <!-- 未归类 -->
    <button
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors shrink-0 leading-none"
      :class="props.modelValue === 'uncategorized' ? 'bg-[#3d342b] text-white' : 'text-paper-600 hover:bg-paper-100'"
      @click="select('uncategorized')"
    >
      <span class="w-2 h-2 rounded-full bg-paper-300 shrink-0"></span>
      <span class="font-medium">未归类</span>
      <span class="ml-auto text-xs opacity-60 tabular-nums">{{ counts.unc }}</span>
    </button>

    <div class="hidden lg:block h-px bg-paper-200/70 my-1"></div>

    <!-- 档案夹 -->
    <button
      v-for="c in carpetas"
      :key="c.id"
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors shrink-0 leading-none"
      :class="props.modelValue === c.id ? 'bg-[#3d342b] text-white' : 'text-paper-600 hover:bg-paper-100'"
      @click="select(c.id)"
    >
      <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: c.color }"></span>
      <span class="font-medium truncate max-w-[9rem]">{{ c.name }}</span>
      <span class="ml-auto text-xs opacity-60 tabular-nums">{{ counts.byId[c.id] ?? 0 }}</span>
    </button>

    <!-- 新建 -->
    <div class="shrink-0 lg:mt-0.5 flex items-center gap-1 px-1">
      <template v-if="!adding">
        <button
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-paper-500 hover:bg-paper-100 transition-colors whitespace-nowrap"
          @click="startAdd"
        >
          <span v-html="icon('plus')"></span> 新建
        </button>
      </template>
      <template v-else>
        <Input
          v-model="newName"
          type="text"
          placeholder="档案夹名称"
          class=" !py-1 !text-xs flex-1 min-w-[6rem]"
          @keyup.enter="commitAdd"
          @keyup.esc="adding = false"
         />
        <Button variant="default" class=" !py-1 !text-xs" @click="commitAdd">添加</Button>
      </template>
    </div>
  </nav>
</template>
