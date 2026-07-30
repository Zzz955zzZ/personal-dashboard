/** 工作台顶层板块。饮食已落地，其余为占位。 */
export interface Section {
  key: string;
  icon: string;
  title: string;
  desc: string;
  dev: boolean;
}

export const SECTIONS: Section[] = [
  { key: 'food', icon: 'leaf', title: '饮食', desc: '食材、菜谱、库存与采购的一体化管理', dev: false },
  { key: 'work', icon: 'briefcase', title: '工作', desc: '任务、项目与专注时钟', dev: true },
  { key: 'life', icon: 'sprout', title: '生活', desc: '习惯、日程与随手记', dev: true },
  { key: 'knowledge', icon: 'book', title: '知识', desc: '收藏、笔记与阅读追踪', dev: true },
];
