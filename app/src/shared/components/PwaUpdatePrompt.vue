<script setup lang="ts">
/**
 * PWA 更新提示条。
 * 使用 registerType: 'prompt' —— 发现新版本时不再静默刷新（会丢失正在填的数据），
 * 而是显示一条可手动确认的横幅，点击「立即更新」才激活新 Service Worker 并刷新。
 *
 * 移动端可靠性修复：
 * - 安装型 PWA 常驻后台时浏览器不会自动重新检测更新，故：
 *   ① 捕获 registration，定时（60s）主动 registration.update()；
 *   ② 在页面 visibilitychange → visible 时再触发一次，回到前台即可拿到新版本。
 * - 点击「更新」时先置 updating 状态、下一帧(rAF)再触发 reload，避免主线程被同步
 *   reload 卡住、且保证用户立刻看到「正在更新…」反馈；并设 1.5s 兜底强制刷新，
 *   防止个别浏览器未真正 reload 而表现为「点了没反应」。
 */
import { computed, onBeforeUnmount, ref } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

const { needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    // 记下注册对象以便主动轮询更新
    swReg.value = registration;
    // 注册成功后立即探测一次（覆盖首屏已错过的情况）
    void swReg.value?.update?.();
  },
});

const swReg = ref<ServiceWorkerRegistration | undefined>(undefined);
const updating = ref(false);
/** 本次会话内用户手动关闭后，不再弹出（直到下一次检测到新版本） */
const dismissed = ref(false);

const visible = computed(() => needRefresh.value && !dismissed.value && !updating.value);

// 周期性 + 回到前台时主动检测新版本（移动端关键）
let pollTimer: ReturnType<typeof setInterval> | null = null;
function checkUpdates(): void {
  void swReg.value?.update?.();
}
pollTimer = setInterval(checkUpdates, 60_000);
document.addEventListener('visibilitychange', onVisible);
function onVisible(): void {
  if (document.visibilityState === 'visible') checkUpdates();
}

function dismiss(): void {
  dismissed.value = true;
  needRefresh.value = false;
}

function refresh(): void {
  if (updating.value) return;
  updating.value = true;
  // 下一帧再触发重载：先让按钮渲染出「正在更新…」状态，避免点击无反馈的卡顿感
  requestAnimationFrame(() => {
    updateServiceWorker(true);
    // 兜底：若 1.5s 内页面尚未重载（极个别浏览器未真正 reload），强制刷新拿到最新资源
    window.setTimeout(() => window.location.reload(), 1500);
  });
}

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
  document.removeEventListener('visibilitychange', onVisible);
});
</script>

<template>
  <transition name="fade">
    <div
      v-if="visible || updating"
      class="fixed top-16 inset-x-0 z-[70] px-3 py-2 flex items-center justify-center gap-2 flex-wrap
             bg-ink text-coral-50 text-sm shadow-lg
             pb-[calc(0.5rem+env(safe-area-inset-top))]"
      role="alert"
      aria-live="polite"
    >
      <span class="flex-1 min-w-0 text-center sm:text-left">
        <template v-if="updating">🔄 正在更新…</template>
        <template v-else>🔄 发现新版本，点击更新以获取最新功能</template>
      </span>
      <button
        class="px-3 py-1.5 rounded-lg bg-coral-400 text-white text-xs font-medium
               hover:bg-coral-500 active:scale-95 transition-all shrink-0
               touch-manipulation disabled:opacity-60"
        :disabled="updating"
        @click="refresh"
      >
        <span v-if="updating" class="inline-flex items-center gap-1">
          <span class="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          更新中
        </span>
        <span v-else>立即更新</span>
      </button>
      <button
        v-if="!updating"
        class="px-2 py-1.5 text-coral-50/70 text-xs hover:text-coral-50 transition-colors shrink-0 touch-manipulation"
        aria-label="关闭更新提示"
        @click="dismiss"
      >
        ✕
      </button>
    </div>
  </transition>
</template>
