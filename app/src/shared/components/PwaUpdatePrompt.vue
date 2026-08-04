<script setup lang="ts">
/**
 * PWA 更新提示条。
 * 使用 registerType: 'prompt' —— 发现新版本时不再静默刷新（会丢失正在填的数据），
 * 而是显示一条可手动确认的横幅，点击「立即更新」才激活新 Service Worker 并刷新。
 */
import { useRegisterSW } from 'virtual:pwa-register/vue';

const { needRefresh, updateServiceWorker } = useRegisterSW({ immediate: true });

function refresh(): void {
  // true = 跳过等待、激活新 SW 并重新加载页面
  updateServiceWorker(true);
}
function dismiss(): void {
  needRefresh.value = false;
}
</script>

<template>
  <transition name="fade">
    <div
      v-if="needRefresh"
      class="fixed top-16 inset-x-0 z-[60] px-4 py-2 flex items-center justify-center gap-3 bg-ink text-coral-50 text-sm shadow-lg"
    >
      <span>🔄 发现新版本，点击更新以获取最新功能</span>
      <button
        class="px-3 py-1 rounded-lg bg-coral-400 text-white text-xs font-medium hover:bg-coral-500 transition-colors shrink-0"
        @click="refresh"
      >
        立即更新
      </button>
      <button
        class="px-2 py-1 text-coral-50/70 text-xs hover:text-coral-50 transition-colors shrink-0"
        @click="dismiss"
      >
        ✕
      </button>
    </div>
  </transition>
</template>
