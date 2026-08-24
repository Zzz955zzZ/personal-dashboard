<script setup lang="ts">
/**
 * PWA 更新提示条（占位）。
 * 当前 VitePWA 暂未接入（依赖环境在 E:\ 盘安装时会回收 @rollup 的 cjs 文件，导致 workbox 收尾失败）。
 * 重新挂回 VitePWA 后，把下面这段恢复即可：
 *   import { useRegisterSW } from 'virtual:pwa-register/vue';
 *   const { needRefresh, updateServiceWorker } = useRegisterSW({ immediate: true });
 * 现在渲染为空，挂载不报错、不影响功能。
 */
</script>

<template>
  <div v-show="false" aria-hidden="true"></div>
</template>
