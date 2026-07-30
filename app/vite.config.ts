import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';

// mode === 'single' -> 自包含单文件 HTML（拷一个文件就能跑，替代旧的 dashboard.html 形态）
// 其余 mode        -> 常规多文件构建（部署 / PWA / Capacitor 封装用）
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: [vue(), ...(single ? [viteSingleFile()] : [])],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      outDir: single ? 'dist-single' : 'dist',
      emptyOutDir: true,
      target: 'es2019',
      cssCodeSplit: !single,
      assetsInlineLimit: single ? 100_000_000 : 4096,
    },
    test: {
      // 持久化与组件用例都需要 DOM（localStorage / 挂载）
      environment: 'jsdom',
      include: ['src/**/*.spec.ts'],
    },
  };
});
