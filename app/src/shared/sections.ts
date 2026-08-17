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
  { key: 'work', icon: 'briefcase', title: '待办', desc: '四象限矩阵：工作与生活任务管理', dev: false },
  { key: 'life', icon: 'wallet', title: '记账', desc: '收支追踪、分类统计、日流水记录', dev: false },
  { key: 'knowledge', icon: 'book', title: '知识', desc: '知识库构建、提炼要点、每日日记', dev: false },
];
