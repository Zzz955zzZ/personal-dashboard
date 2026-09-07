<script setup lang="ts">
/**
 * PWA 更新提示条。
 * 使用 registerType: 'prompt' —— 发现新版本时不再静默刷新（会丢失正在填的数据），
 * 而是显示一条可手动确认的横幅，点击「立即更新」才激活新 Service Worker 并刷新。
 *
 * 移动端可靠性设计（相较旧版的核心改进）：
 * 1. 双信号检测，解耦 SW 生命周期：
 *    - 信号A：SW 自身 waiting 事件（needRefresh）—— 标准路径；
 *    - 信号B：构建版本戳比对。运行时打包了 __APP_BUILD_ID__，并定期/回到前台时
 *      拉取线上 dist/version.json，二者不一致即认为有更新。
 *    信号B 不依赖 SW 是否正确触发 waiting，规避 iOS 上 SW 更新被系统吞掉、弹窗始终不出现的问题。
 * 2. iOS 从主屏恢复检测：iOS 常把 PWA 冻结在页面缓存里，重新打开时不一定触发
 *    visibilitychange，但一定会触发 pageshow（persisted=true）。故监听 pageshow 主动探活。
 * 3. 重载竞态修复：needRefresh 时走 skipWaiting + controllerchange 驱动刷新；否则（多为
 *    iOS 没拉到新 SW）直接强刷拉取最新资源，绕开卡住的 SW。两种路径都有兜底超时强刷。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

const BUILD_ID: string = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';

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
const versionMismatch = ref(false);
const updating = ref(false);
/** 本次会话内用户手动关闭后，不再弹出（直到下一次检测到新版本） */
const dismissed = ref(false);

const visible = computed(
  () => (needRefresh.value || versionMismatch.value) && !dismissed.value && !updating.value,
);

// ---- 版本信号检测（与 SW 生命周期解耦，移动端更可靠）----
async function checkVersion(): Promise<void> {
  try {
    const res = await fetch('version.json', { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as { version?: string };
    if (data.version && data.version !== BUILD_ID) versionMismatch.value = true;
  } catch {
    /* 单文件版/离线/无 version.json 时静默忽略 */
  }
}

// 周期性 + 回到前台时主动检测新版本（移动端关键）
function checkUpdates(): void {
  void swReg.value?.update?.();
  void checkVersion();
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
pollTimer = setInterval(checkUpdates, 60_000);
document.addEventListener('visibilitychange', onVisible);
// iOS 从主屏/后台恢复时可靠触发（frozen page 不一定发 visibilitychange）
window.addEventListener('pageshow', onPageShow);

function onVisible(): void {
  if (document.visibilityState === 'visible') checkUpdates();
}
function onPageShow(e: PageTransitionEvent): void {
  if (e.persisted || document.visibilityState === 'visible') checkUpdates();
}

onMounted(() => {
  void checkVersion();
});

function dismiss(): void {
  dismissed.value = true;
  needRefresh.value = false;
  versionMismatch.value = false;
}

function refresh(): void {
  if (updating.value) return;
  updating.value = true;
  let reloaded = false;
  const reload = (): void => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  };
  if (needRefresh.value) {
    // SW 已处于 waiting：驱动 skipWaiting，待 controllerchange 后刷新
    navigator.serviceWorker?.addEventListener('controllerchange', reload, { once: true });
    updateServiceWorker(true);
  } else {
    // 多为 iOS 未拉到新 SW：直接强刷，绕开卡住的 SW 更新流程
    window.setTimeout(reload, 300);
  }
  // 兜底：个别浏览器 controllerchange 不触发时仍可更新，避免「点了没反应」
  window.setTimeout(reload, 4000);
}

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
  document.removeEventListener('visibilitychange', onVisible);
  window.removeEventListener('pageshow', onPageShow);
});
</script>

<template>
  <transition name="fade">
    <div
      v-if="visible || updating"
      class="fixed top-16 inset-x-0 z-[70] px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] flex items-center justify-center gap-2 flex-wrap
             bg-ink text-coral-50 text-sm shadow-lg
             pb-[calc(0.5rem+env(safe-area-inset-top))]"
      role="alert"
      aria-live="assertive"
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
