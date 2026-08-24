import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';

// mode === 'single' -> 自包含单文件 HTML（拷一个文件就能跑，便于离线分发）
// 其余 mode        -> 常规多文件构建（部署用）
// 注：VitePWA / workbox 暂未接入。E:\ 盘 safe-delete 在 npm install 时会回收
// @rollup/* 的 dist/cjs/index.js，导致 workbox-build 收尾失败。SW/可安装性为 P1 增强，
// 不影响功能预览；待依赖环境稳定后在 vite.config 重新挂回 VitePWA 即可（PwaUpdatePrompt 已留好无操作占位）。
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: [
      vue(),
      // 单文件模式：自包含 HTML（拷贝即跑，离线分发）
      ...(single ? [viteSingleFile()] : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      outDir: single ? 'dist-single' : 'dist',
      emptyOutDir: false, // E:\ 盘 safe-delete 会拦截 rm，构建前用 scripts/clean.mjs 手动清理
      target: 'es2019',
      cssCodeSplit: !single,
      assetsInlineLimit: single ? 100_000_000 : 4096,
    },
    test: {
      // 持久化守卫与组件用例都需要 DOM（localStorage / 挂载）
      environment: 'jsdom',
      include: ['src/**/*.spec.ts'],
    },
  };
});
