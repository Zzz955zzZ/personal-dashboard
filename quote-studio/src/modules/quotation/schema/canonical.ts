/**
 * 报价单导入/导出的「单一格式契约」。
 *
 * 两条录入动线（AI 映射 / 手动填写）都汇到这里定义的平面行 QuoteItemRow，
 * 因此导出天然同格式。预览/报价单展示格式以后想微调，只动 QUOTE_EXCEL_COLUMNS
 * 与渲染层，不动核心数据模型。
 */

import type { QuoteItem } from '../types';
import type { CategoryGroup, ProductStatusOption } from '@/modules/settings';

/** Excel 平面行：报价单导入/导出的统一格式。 */
export interface QuoteItemRow {
  group: string; // 大类名称（nameEs 或 name）
  name: string;
  nameEs: string;
  model: string;
  cost: number;
  margin: number;
  salePrice: number;
  quantity: number;
  unit: string;
  dtoPct: number;
  ivaPct: number;
  customerNote: string;
  internalNote: string;
  status: string; // 状态名称
  links: string; // 多个链接用换行分隔
}

export interface ExcelColumn {
  key: keyof QuoteItemRow;
  header: string;
  numeric?: boolean;
}

/**
 * 单一格式契约：改这里即可微调 Excel 列、顺序与表头。
 * 注意：照片(photoUrls)不进 Excel（data URL 过大），保留在 App 内。
 */
export const QUOTE_EXCEL_COLUMNS: ExcelColumn[] = [
  { key: 'group', header: '大类' },
  { key: 'name', header: '名称' },
  { key: 'nameEs', header: '西文名' },
  { key: 'model', header: '型号' },
  { key: 'cost', header: '进价', numeric: true },
  { key: 'margin', header: '毛利', numeric: true },
  { key: 'salePrice', header: '售价', numeric: true },
  { key: 'quantity', header: '数量', numeric: true },
  { key: 'unit', header: '单位' },
  { key: 'dtoPct', header: 'DTO%', numeric: true },
  { key: 'ivaPct', header: 'IVA%', numeric: true },
  { key: 'customerNote', header: '客户备注' },
  { key: 'internalNote', header: '内部备注' },
  { key: 'status', header: '状态' },
  { key: 'links', header: '客户链接' },
];

export interface RowContext {
  groups: CategoryGroup[];
  statuses: ProductStatusOption[];
  groupNameToId: Map<string, string>;
  groupIdToName: Map<string, string>;
  statusNameToId: Map<string, string>;
  statusIdToName: Map<string, string>;
  defaultGroupId: string;
}

export function buildRowContext(
  groups: CategoryGroup[],
  statuses: ProductStatusOption[],
  fallbackGroupId?: string,
): RowContext {
  const groupNameToId = new Map<string, string>();
  const groupIdToName = new Map<string, string>();
  for (const g of groups) {
    groupNameToId.set(g.name, g.id);
    if (g.nameEs) groupNameToId.set(g.nameEs, g.id);
    groupIdToName.set(g.id, g.nameEs || g.name);
  }
  const statusNameToId = new Map<string, string>();
  const statusIdToName = new Map<string, string>();
  for (const s of statuses) {
    statusNameToId.set(s.name, s.id);
    statusIdToName.set(s.id, s.name);
  }
  return {
    groups,
    statuses,
    groupNameToId,
    groupIdToName,
    statusNameToId,
    statusIdToName,
    defaultGroupId:
      fallbackGroupId && groups.some((g) => g.id === fallbackGroupId)
        ? fallbackGroupId
        : groups[0]?.id ?? '',
  };
}

export function itemToRow(item: QuoteItem, ctx: RowContext): QuoteItemRow {
  return {
    group: ctx.groupIdToName.get(item.categoryGroupId) ?? '',
    name: item.name,
    nameEs: item.nameEs,
    model: item.model,
    cost: item.cost,
    margin: item.margin,
    salePrice: item.salePrice,
    quantity: item.quantity,
    unit: item.unit,
    dtoPct: item.dtoPct,
    ivaPct: item.ivaPct,
    customerNote: item.customerNote,
    internalNote: item.internalNote,
    status: ctx.statusIdToName.get(item.statusId) ?? '',
    links: (item.links || []).join('\n'),
  };
}

/** 返回不含 id/quotationId/lineTotal 的基础项，供 store.addItem 使用。 */
export function rowToBaseItem(
  row: QuoteItemRow,
  ctx: RowContext,
): Omit<QuoteItem, 'id' | 'quotationId' | 'lineTotal'> {
  const groupId = (row.group && ctx.groupNameToId.get(row.group.trim())) || ctx.defaultGroupId;
  const statusId = (row.status && ctx.statusNameToId.get(row.status.trim())) || '';
  return {
    categoryGroupId: groupId,
    name: row.name?.toString() ?? '',
    nameEs: row.nameEs?.toString() ?? '',
    model: row.model?.toString() ?? '',
    photoUrls: [],
    customerNote: row.customerNote?.toString() ?? '',
    internalNote: row.internalNote?.toString() ?? '',
    links: typeof row.links === 'string' ? row.links.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [],
    cost: Number(row.cost) || 0,
    margin: Number(row.margin) || 0,
    salePrice: Number(row.salePrice) || 0,
    quantity: Number(row.quantity) || 1,
    unit: row.unit?.toString() ?? '',
    dtoPct: Number(row.dtoPct) || 0,
    ivaPct: Number(row.ivaPct) || 21,
    statusId,
  };
}
