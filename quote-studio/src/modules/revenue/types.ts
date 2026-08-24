/** 收益模块类型定义（项目为收益聚合根）。 */

export type CurrencyCode = 'EUR'; // MVP 仅 EUR；多币种列为 P2
export type ProjectStatus = 'active' | 'completed' | 'archived';

/** 项目（收益聚合根）。 */
export interface Project {
  id: string;
  projectNo: string; // 项目编号（与报价单共用）
  name: string;
  clientName: string;
  address: string;
  status: ProjectStatus;
  currency: CurrencyCode; // 默认 'EUR'
  coverUrl: string;
  carpetaId: string; // 所属档案夹（'' = 未归类）
  createdAt: string; // ISO 8601
  updatedAt: string;
}

/** 收益记录（报价确认时生成 / 刷新）。 */
export interface RevenueEntry {
  id: string;
  projectId: string;
  source: string; // 如 'quotation_confirmed'
  amount: number; // 销售额 = Quotation.totalAmount
  cost: number; // = Quotation.totalCost
  margin: number; // 利润 = Quotation.totalMargin
  linkedQuotationId: string;
  recordedAt: string;
}

/** 收益聚合视图（派生，不持久化）。 */
export interface ProjectRevenueSummary {
  projectId: string;
  totalSales: number; // Σ RevenueEntry.amount
  totalCost: number; // Σ RevenueEntry.cost
  totalProfit: number; // Σ RevenueEntry.margin
  entryCount: number;
  lastRecordedAt: string | null;
}

export interface ProjectsPersistedState {
  projects: Project[];
}

export interface RevenuePersistedState {
  entries: RevenueEntry[];
}
