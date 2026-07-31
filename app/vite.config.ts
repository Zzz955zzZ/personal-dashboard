import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { VitePWA } from 'vite-plugin-pwa';

// mode === 'single' -> 自包含单文件 HTML（拷一个文件就能跑，替代旧的 dashboard.html 形态）
// 其余 mode        -> 常规多文件构建（部署 / PWA / Capacitor 封装用）
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    plugins: [
      vue(),
      ...(single
        ? [viteSingleFile()]
        : [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
              manifest: {
                name: 'Personal Dashboard · 工作台',
                short_name: '工作台',
                description: '饮食与个人管理 · 多设备可安装',
                theme_color: '#fef5f4',
                background_color: '#fef5f4',
                display: 'standalone',
                start_url: './',
                scope: './',
                icons: [
                  { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                  { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                  {
                    src: 'icons/icon-512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
              },
            }),
          ]),
    ],
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
