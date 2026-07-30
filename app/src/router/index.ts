import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

import { dietRoutes } from '@/modules/diet';

/**
 * 使用 hash 模式：保证 file:// 双击打开、静态托管、Capacitor 封装三种场景下
 * 路由都不需要服务端 fallback。
 *
 * 路由名与 SECTIONS 的 key 一一对应（home / food / work / life / knowledge），
 * 顶栏面包屑与抽屉高亮直接靠 route.name 匹配，不用再维护第二张映射表。
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
  },
  ...dietRoutes,
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
