import type { RouteRecordRaw } from 'vue-router';

export const quotationRoutes: RouteRecordRaw[] = [
  {
    path: '/quotation',
    name: 'quotation',
    component: () => import('./views/QuotationGridView.vue'),
  },
  {
    path: '/quotation/:projectId',
    name: 'quotation-edit',
    component: () => import('./views/QuotationEditView.vue'),
  },
];
