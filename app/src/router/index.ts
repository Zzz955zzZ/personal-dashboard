import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

/**
 * 使用 hash 模式：保证 file:// 双击打开、静态托管、Capacitor 封装三种场景下
 * 路由都不需要服务端 fallback。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/diet',
    name: 'diet',
    component: () => import('@/modules/diet/views/EngineCheckView.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
