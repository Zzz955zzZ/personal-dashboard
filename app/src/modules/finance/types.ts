/**
 * 记账模块类型定义
 *
 * 简约收支追踪，参考鲨鱼记账风格。
 */

/** 交易类型 */
export type TxnType = 'expense' | 'income';

/** 交易状态 */
export type TxnStatus = 'active' | 'deleted';

/** 单条交易记录 */
export interface Transaction {
  id: number;
  type: TxnType;
  amount: number;         // 正数，type 区分收支
  category: string;       // 分类 key
  description: string;    // 备注
  date: string;           // YYYY-MM-DD
  createdAt: string;      // ISO datetime
}

/** 分类定义 */
export interface CategoryDef {
  key: string;
  label: string;
  emoji: string;
  icon: string;           // inline SVG
  type: TxnType | 'both'; // expense / income / both
}

/** 持久化 */
export interface FinancePersistedState {
  transactions: Transaction[];
  nextId: number;
}
