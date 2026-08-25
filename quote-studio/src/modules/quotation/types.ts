/** 报价模块类型定义。 */

export type QuotationStatus = 'draft' | 'confirmed';

/** 报价单（MVP 每项目 1 单）。 */
export interface Quotation {
  id: string;
  projectId: string; // 关联 Project（聚合根）
  title: string;
  status: QuotationStatus; // 'draft' | 'confirmed'
  confirmedAt: string | null; // 仅 confirmed 时有值
  quoteNumber: string; // 报价编号（如 LYD-2026-001）
  vatRate: number; // IVA 税率（默认 21）
  validityDays: number; // 报价有效期（天，默认 30）
  notes: string; // 报价底部备注
  totalAmount: number; // = Σ lineTotal（自动汇总）
  totalCost: number; // = Σ(cost*qty)（自动汇总）
  totalMargin: number; // = Σ(margin*qty)（自动汇总）
  includedGroupIds: string[]; // 本报价实际包含的大类（动态选择）
  items: QuoteItem[]; // 内联产品行
  /* ---- 报价单头信息（可编辑，并同步到项目）---- */
  projectNo: string; // 项目编号
  clientName: string; // 客户名（同步 Project.clientName）
  address: string; // 地址（同步 Project.address）
  createdAt: string;
  updatedAt: string;
}

/** 产品行（报价行）。 */
export interface QuoteItem {
  id: string;
  quotationId: string;
  categoryGroupId: string; // 引用全局 CategoryGroup
  name: string;
  nameEs: string; // 西文名称（PDF 用）
  model: string; // 型号
  photoUrls: string[]; // 产品照片（多张）
  customerNote: string; // 客户可见备注
  links: string[]; // 客户可见链接（仅客户视角显示/可点击；内部界面仅管理员可编辑，预览不显示）
  internalNote: string; // 仅管理员
  cost: number; // 进价（管理员字段；UI 标注「进价」）
  margin: number; // 毛利（管理员字段）
  salePrice: number; // = cost + margin（自动）
  quantity: number;
  unit: string; // 单位（个/米/套…）
  salePriceUnit?: string; // 售价单位（缺省回退 defaultSalePriceUnit → defaultUnit）
  dtoPct: number; // 折扣 %（默认 0）
  ivaPct: number; // 税率 %（默认 21，可按产品单独选择）
  lineTotal: number; // = salePrice * quantity（自动，税前小计）
  statusId: string; // 产品状态/阶段（对应 settings.productStatusOptions）
}

export interface QuotationPersistedState {
  quotations: Quotation[];
}
