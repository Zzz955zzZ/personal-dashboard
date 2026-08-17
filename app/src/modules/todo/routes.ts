import type { RouteRecordRaw } from 'vue-router';

export const todoRoutes: RouteRecordRaw[] = [
  {
    path: '/work',
    name: 'work',
    component: () => import('./views/TodoView.vue'),
  },
];
