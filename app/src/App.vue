<script setup lang="ts">
/** 工作台外壳：顶栏 + 侧边抽屉 + 撤销条 + 路由出口 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { icon } from '@/shared/icons';
import { SECTIONS } from '@/shared/sections';
import { useUndo } from '@/shared/composables/use-undo';
import DataModal from '@/modules/diet/components/DataModal.vue';

const route = useRoute();
const router = useRouter();
const { undoToast, executeUndo, dismissUndo } = useUndo();

const navOpen = ref(false);
const dataOpen = ref(false);

const breadcrumb = computed(() => {
  const s = SECTIONS.find((x) => x.key === route.name);
  return s ? `工作台 / ${s.title}` : '首页';
});

/* ---- 顶栏时钟 ---- */
const clock = ref('');
let timer: ReturnType<typeof setInterval> | null = null;

function tick(): void {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  clock.value = `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

onMounted(() => {
  tick();
  timer = setInterval(tick, 30_000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});

function goHome(): void {
  navOpen.value = false;
  void router.push('/');
}

function openSection(key: string): void {
  navOpen.value = false;
  const s = SECTIONS.find((x) => x.key === key);
  if (!s || s.dev) return;
  void router.push({ name: key });
}
</script>

<template>
  <div>
    <!-- 顶栏 -->
    <header
      class="fixed top-0 inset-x-0 z-40 h-16 px-4 sm:px-8 flex items-center justify-between border-b border-paper-300/60 bg-coral-50/85 backdrop-blur-xl"
    >
      <div class="flex items-center gap-3">
        <button
          class="w-10 h-10 flex flex-col items-center justify-center rounded-xl hover:bg-coral-100 transition-colors"
          aria-label="菜单"
          @click="navOpen = !navOpen"
        >
          <span
            class="block w-5 h-px bg-ink transition-all"
            :class="navOpen ? 'rotate-45 translate-y-[3px]' : ''"
          ></span>
          <span class="block w-5 h-px bg-ink my-[3px] transition-all" :class="navOpen ? 'opacity-0' : ''"></span>
          <span
            class="block w-5 h-px bg-ink transition-all"
            :class="navOpen ? '-rotate-45 -translate-y-[3px]' : ''"
          ></span>
        </button>
        <div class="leading-tight">
          <div class="text-[11px] tracking-wide2 uppercase text-paper-500">Personal Dashboard</div>
          <div class="text-sm font-medium">{{ breadcrumb }}</div>
        </div>
      </div>

      <div class="hidden sm:block text-sm tabular-nums text-paper-500 font-light">{{ clock }}</div>
    </header>

    <!-- 侧边抽屉 -->
    <div v-if="navOpen" class="fixed inset-0 z-50" @click="navOpen = false">
      <div class="absolute inset-0 bg-black/25 backdrop-blur-sm"></div>
      <transition name="slide" appear>
        <aside
          class="absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-coral-50 border-r border-paper-300/60 p-6 flex flex-col"
          @click.stop
        >
          <div class="mb-10">
            <div class="font-display text-3xl tracking-wide">工作台</div>
            <div class="text-[11px] tracking-wide2 uppercase text-paper-500 mt-1">Navigation</div>
          </div>
          <nav class="flex flex-col gap-1">
            <button
              class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-coral-100 transition-colors"
              :class="route.name === 'home' ? 'bg-coral-100' : ''"
              @click="goHome()"
            >
              <span class="text-paper-500">⌂</span><span class="text-sm font-medium">首页</span>
            </button>
            <div class="h-px bg-paper-300/60 my-3"></div>
            <button
              v-for="s in SECTIONS"
              :key="s.key"
              class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-coral-100 transition-colors"
              :class="route.name === s.key ? 'bg-coral-100' : ''"
              @click="openSection(s.key)"
            >
              <span class="text-lg" v-html="icon(s.icon)"></span>
              <span class="text-sm font-medium flex-1 text-left">{{ s.title }}</span>
              <span
                v-if="s.dev"
                class="text-[10px] uppercase tracking-wide text-paper-400 border border-paper-300 rounded px-1.5 py-0.5"
              >
                dev
              </span>
            </button>
          </nav>

          <div class="h-px bg-paper-300/60 my-3"></div>
          <button
            class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-coral-100 transition-colors text-left"
            @click="dataOpen = true; navOpen = false"
          >
            <span class="text-lg" v-html="icon('doc')"></span>
            <span class="text-sm font-medium">数据 · 备份</span>
          </button>

          <div class="mt-auto text-[11px] text-paper-500 leading-relaxed">
            955's workspace v2 · Vite + Vue 3 + TypeScript
          </div>
        </aside>
      </transition>
    </div>

    <!-- 撤销条 -->
    <transition name="fade">
      <div v-if="undoToast.visible" class="undo-toast">
        <span>{{ undoToast.message }}</span>
        <button @click="executeUndo()">撤销</button>
        <button
          style="background: transparent; color: #9e907e; border: none; cursor: pointer; font-size: 12px"
          @click="dismissUndo()"
        >
          ✕
        </button>
      </div>
    </transition>

    <main class="pt-16 min-h-screen">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <DataModal :open="dataOpen" @close="dataOpen = false" />
  </div>
</template>
