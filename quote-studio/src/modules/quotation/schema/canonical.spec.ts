import { describe, it, expect } from 'vitest';
import { buildRowContext, itemToRow, rowToBaseItem } from './canonical';
import type { CategoryGroup, ProductStatusOption } from '@/modules/settings';
import type { QuoteItem } from '../types';

const groups: CategoryGroup[] = [
  { id: 'g1', name: '绿植', nameEs: 'Plantas', icon: '', order: 0, products: [] },
];
const statuses: ProductStatusOption[] = [{ id: 's1', name: '待确认', color: '#000000' }];

const item: QuoteItem = {
  id: 'qi1',
  quotationId: 'q1',
  categoryGroupId: 'g1',
  name: '龟背竹',
  nameEs: 'Monstera',
  model: 'M1',
  photoUrls: [],
  customerNote: '大盆',
  internalNote: '',
  cost: 10,
  margin: 5,
  salePrice: 15,
  quantity: 2,
  unit: '盆',
  dtoPct: 0,
  ivaPct: 21,
  lineTotal: 30,
  statusId: 's1',
};

describe('canonical schema', () => {
  it('item -> row -> base item 往返一致', () => {
    const ctx = buildRowContext(groups, statuses);
    const row = itemToRow(item, ctx);
    expect(row.group).toBe('Plantas');
    expect(row.status).toBe('待确认');
    const base = rowToBaseItem(row, ctx);
    expect(base.categoryGroupId).toBe('g1');
    expect(base.statusId).toBe('s1');
    expect(base.salePrice).toBe(15);
    expect(base.quantity).toBe(2);
  });

  it('未知大类名称兜底到默认分组', () => {
    const ctx = buildRowContext(groups, statuses);
    const row = itemToRow(item, ctx);
    row.group = '不存在';
    const base = rowToBaseItem(row, ctx);
    expect(base.categoryGroupId).toBe('g1');
    expect(base.statusId).toBe('s1');
  });
});
