import type { RouteRecordRaw } from 'vue-router';

/**
 * 饮食模块自带路由表。
 *
 * 由模块自己声明路由，外层 router 只做拼装 —— 这样 app 层不需要知道
 * FoodView.vue 在模块内部的具体位置，整目录搬成独立包时路由跟着一起走。
 * component 仍是动态 import，懒加载不受影响。
 */
export const dietRoutes: RouteRecordRaw[] = [
  {
    path: '/food',
    name: 'food',
    component: () => import('./views/FoodView.vue'),
  },
  {
    // P1 阶段的引擎自检页，保留作排查入口
    path: '/dev/engine',
    name: 'dev-engine',
    component: () => import('./views/EngineCheckView.vue'),
  },
];
