/**
 * Lyd9 Studio 顶层导航。
 * 对应 vue-router 的路由名（home / projects / project-detail / quotation /
 * quotation-edit / settings）。顶栏面包屑与抽屉高亮直接靠 route.name 匹配。
 */

export interface NavItem {
  key: string;
  icon: string;
  title: string;
  desc: string;
}

/** 首页以外的四个主模块入口（首页由 Logo 进入）。 */
export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    icon: 'dashboard',
    title: '看板',
    desc: '数据汇总：报价、收益、利润与项目动态',
  },
  {
    key: 'quotation',
    icon: 'briefcase',
    title: '报价系统',
    desc: '编制报价、两级分类、客户视图与 PDF 导出',
  },
  {
    key: 'projects',
    icon: 'wallet',
    title: '项目收益',
    desc: '项目收益与利润看板，确认报价后实时入账',
  },
  {
    key: 'settings',
    icon: 'settings',
    title: '设置中心',
    desc: '分类管理、公司资料、PDF 模板、云同步与 AI',
  },
];
