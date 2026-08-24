<script setup lang="ts">
/** Lyd9 Studio 外壳：顶栏 + 抽屉导航 + 撤销条 + 路由出口 + PWA 更新 + 数据弹窗 */
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { icon } from '@/shared/icons';
import { NAV_ITEMS } from '@/shared/nav';
import { useUndo } from '@/shared/composables/use-undo';
import { hydrateAll } from '@/modules';
import DataModal from '@/shared/components/DataModal.vue';
import PwaUpdatePrompt from '@/shared/components/PwaUpdatePrompt.vue';
import logoUrl from '@/assets/logo.png';
import { useToasts, dismiss } from '@/shared/notify';

const route = useRoute();
const router = useRouter();
const { undoToast, executeUndo, dismissUndo } = useUndo();
const toasts = useToasts();

const navOpen = ref(false);
const dataOpen = ref(false);

// #1 修复「进入不显示」根因：父组件 setup 先于子路由视图挂载执行，
// 在顶层同步注水可保证所有视图首帧即渲染已保存数据（无需等待 onMounted）。
hydrateAll();

const title = computed(() => {
  const m = NAV_ITEMS.find((x) => x.key === route.name);
  return m ? m.title : 'Lyd9 Studio';
});

function goHome(): void {
  navOpen.value = false;
  void router.push('/');
}

function openNav(key: string): void {
  navOpen.value = false;
  if (key === 'home') return goHome();
  void router.push({ name: key });
}
</script>

<template>
  <div>
    <!-- 顶栏 -->
    <header
      class="fixed top-0 inset-x-0 z-40 h-[4.5rem] px-6 sm:px-10 flex items-center justify-between border-b border-paper-200/70 bg-white/85 backdrop-blur-xl"
    >
      <div class="flex items-center gap-3">
        <button
          class="w-10 h-10 flex flex-col items-center justify-center rounded-xl hover:bg-paper-100 transition-colors"
          aria-label="菜单"
          @click="navOpen = !navOpen"
        >
          <span class="block w-5 h-px bg-ink transition-all" :class="navOpen ? 'rotate-45 translate-y-[3px]' : ''"></span>
          <span class="block w-5 h-px bg-ink my-[3px] transition-all" :class="navOpen ? 'opacity-0' : ''"></span>
          <span class="block w-5 h-px bg-ink transition-all" :class="navOpen ? '-rotate-45 -translate-y-[3px]' : ''"></span>
        </button>
        <button
          class="flex items-center justify-center h-9 px-2 rounded-lg hover:bg-paper-100 transition-colors"
          :title="title"
          @click="goHome"
        >
          <img :src="logoUrl" alt="Lyd9 Studio" class="h-5 w-auto opacity-90" />
        </button>
        <span class="text-[15px] font-semibold tracking-wide text-ink/90">{{ title }}</span>
      </div>
    </header>

    <!-- 抽屉 -->
    <div v-if="navOpen" class="fixed inset-0 z-50" @click="navOpen = false">
      <div class="absolute inset-0 bg-black/25 backdrop-blur-sm"></div>
      <transition name="slide" appear>
        <aside
          class="absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-white border-r border-paper-300/60 p-6 flex flex-col"
          @click.stop
        >
          <div class="mb-10 flex items-center gap-3">
            <img :src="logoUrl" alt="Lyd9 Studio" class="h-7 w-auto" />
            <div class="font-display text-xl tracking-wide">Lyd9 Studio</div>
          </div>
          <nav class="flex flex-col gap-1">
            <button
              class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-paper-100 transition-colors"
              :class="route.name === 'home' ? 'bg-paper-100' : ''"
              @click="goHome()"
            >
              <span class="text-paper-500" v-html="icon('home')"></span>
              <span class="text-sm font-medium">首页</span>
            </button>
            <div class="h-px bg-paper-300/60 my-3"></div>
            <button
              v-for="s in NAV_ITEMS"
              :key="s.key"
              class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-paper-100 transition-colors"
              :class="route.name === s.key || (s.key === 'projects' && route.name === 'project-detail') || (s.key === 'quotation' && route.name === 'quotation-edit') ? 'bg-paper-100' : ''"
              @click="openNav(s.key)"
            >
              <span class="text-lg" v-html="icon(s.icon)"></span>
              <span class="text-sm font-medium flex-1 text-left">{{ s.title }}</span>
            </button>
          </nav>

          <div class="h-px bg-paper-300/60 my-3"></div>
          <button
            class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-paper-100 transition-colors text-left"
            @click="dataOpen = true; navOpen = false"
          >
            <span class="text-lg" v-html="icon('doc')"></span>
            <span class="text-sm font-medium">数据 · 备份</span>
          </button>

          <div class="mt-auto text-[11px] text-paper-500 leading-relaxed">
            Lyd9 Studio · 报价与收益管理
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

    <main class="pt-[4.5rem] min-h-screen">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <PwaUpdatePrompt />
    <DataModal :open="dataOpen" @close="dataOpen = false" />

    <!-- 全局提示 -->
    <transition-group name="fade" tag="div" class="toast-stack">
      <div v-for="t in toasts.items" :key="t.id" class="toast" :class="`toast--${t.type}`">
        <span class="toast__msg">{{ t.message }}</span>
        <button class="toast__close" type="button" aria-label="关闭" @click="dismiss(t.id)">✕</button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: min(92vw, 24rem);
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.7rem 0.85rem;
  border-radius: 0.75rem;
  background: #2b2520;
  color: #f5efe6;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  font-size: 0.82rem;
  line-height: 1.45;
}
.toast--error { background: #7a2e2e; }
.toast--warn { background: #7a5a2e; }
.toast--success { background: #2e5a3a; }
.toast--info { background: #3d342b; }
.toast__msg { flex: 1; }
.toast__close {
  flex: none;
  background: transparent;
  border: none;
  color: inherit;
  opacity: 0.7;
  cursor: pointer;
  font-size: 0.75rem;
  line-height: 1;
  padding: 0;
}
.toast__close:hover { opacity: 1; }
</style>
