/**
 * 报价核心逻辑测试（强约束 #1/#2/#3/#4 + normalize 守卫）：
 *  - recalc：利润 = 售价 - 成本、lineTotal=salePrice*qty、整单汇总
 *  - confirmQuotation → RevenueEntry 同步（草稿不写）
 *  - normalizeQuoteItem / normalizeQuotation 守卫与自洽重算
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import { useQuotationStore, recalc } from '@/modules/quotation/store/quotation-store';
import { useRevenueStore } from '@/modules/revenue/store/revenue-store';
import { normalizeQuoteItem, normalizeQuotation } from '@/modules/quotation/store/persistence';
import type { QuoteItem, Quotation } from '@/modules/quotation/types';
import { genId, nowIso } from '@/shared/util';

function makeItem(over: Partial<QuoteItem> = {}): QuoteItem {
  return {
    id: genId('qi'),
    quotationId: 'q1',
    categoryGroupId: 'cg',
    name: 'X',
    nameEs: '',
    model: '',
    photoUrls: [],
    customerNote: '',
    internalNote: '',
    cost: 100,
    margin: 20,
    salePrice: 120,
    quantity: 2,
    unit: '个',
    dtoPct: 0,
    ivaPct: 21,
    lineTotal: 240,
    statusId: '',
    ...over,
  };
}

function makeQuotation(items: QuoteItem[] = [], over: Partial<Quotation> = {}): Quotation {
  return {
    id: 'q1',
    projectId: 'p1',
    title: 'T',
    status: 'draft',
    confirmedAt: null,
    quoteNumber: '',
    vatRate: 21,
    validityDays: 30,
    notes: '',
    totalAmount: 0,
    totalCost: 0,
    totalMargin: 0,
    includedGroupIds: [],
    items,
    projectNo: '',
    clientName: '',
    address: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...over,
  };
}

function addPayload(over: Partial<QuoteItem> = {}) {
  return {
    quotationId: 'q1',
    categoryGroupId: 'cg',
    name: '沙发',
    nameEs: '',
    model: '',
    photoUrls: [],
    customerNote: '',
    internalNote: '',
    cost: 100,
    margin: 20,
    salePrice: 0,
    quantity: 2,
    unit: '个',
    dtoPct: 0,
    ivaPct: 21,
    statusId: '',
    ...over,
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

/* ============================ recalc ============================ */
describe('recalc 自动计算（强约束 #1/#2/#3）', () => {
  it('规则：margin = salePrice - cost', () => {
    const q = makeQuotation([makeItem({ cost: 100, salePrice: 125 })]);
    recalc(q);
    expect(q.items[0].margin).toBe(25);
  });

  it('规则：lineTotal = salePrice * quantity', () => {
    const q = makeQuotation([makeItem({ cost: 100, salePrice: 125, quantity: 3 })]);
    recalc(q);
    expect(q.items[0].lineTotal).toBe(375);
  });

  it('规则3：整单汇总 = Σ lineTotal / Σ(cost*qty) / Σ(margin*qty)', () => {
    const q = makeQuotation([
      makeItem({ cost: 100, salePrice: 120, quantity: 2 }), // line 240, cost 200, margin 40
      makeItem({ cost: 50, salePrice: 60, quantity: 1 }), // line 60, cost 50, margin 10
    ]);
    recalc(q);
    expect(q.totalAmount).toBe(300);
    expect(q.totalCost).toBe(250);
    expect(q.totalMargin).toBe(50);
  });

  it('脏数据（NaN/非数字）被兜底为 0', () => {
    const q = makeQuotation([
      makeItem({
        cost: NaN as unknown as number,
        margin: NaN as unknown as number,
        salePrice: 'x' as unknown as number,
        quantity: 'abc' as unknown as number,
      }),
    ]);
    recalc(q);
    expect(q.items[0].cost).toBe(0);
    expect(q.items[0].salePrice).toBe(0);
    expect(q.items[0].quantity).toBe(0);
    expect(q.items[0].lineTotal).toBe(0);
  });
});

/* ===================== confirmQuotation → 收益同步 ===================== */
describe('confirmQuotation 触发收益同步（强约束 #4）', () => {
  it('草稿编辑不写收益；确认后 upsert 一条 RevenueEntry', () => {
    const qs = useQuotationStore();
    const rev = useRevenueStore();

    const q = qs.getOrCreate('p1');
    qs.addItem(q.id, addPayload({ cost: 100, salePrice: 120, quantity: 2 }));

    // 草稿阶段：收益为空
    expect(rev.byProject('p1').length).toBe(0);

    qs.confirmQuotation(q.id);
    const entries = rev.byProject('p1');
    expect(entries.length).toBe(1);
    expect(entries[0].amount).toBe(240);
    expect(entries[0].cost).toBe(200);
    expect(entries[0].margin).toBe(40);
    expect(entries[0].linkedQuotationId).toBe(q.id);
    expect(entries[0].source).toBe('quotation_confirmed');
    expect(q.status).toBe('confirmed');
    expect(q.confirmedAt).not.toBeNull();
  });

  it('重复确认同一报价：更新而非新增收益记录', () => {
    const qs = useQuotationStore();
    const rev = useRevenueStore();

    const q = qs.getOrCreate('p1');
    qs.addItem(q.id, addPayload({ cost: 100, salePrice: 120, quantity: 2 }));
    qs.confirmQuotation(q.id);
    const firstId = rev.byProject('p1')[0].id;

    // 加一行后再次确认
    qs.addItem(q.id, addPayload({ name: '茶几', cost: 50, salePrice: 60, quantity: 1 }));
    qs.confirmQuotation(q.id);

    const entries = rev.byProject('p1');
    expect(entries.length).toBe(1);
    expect(entries[0].id).toBe(firstId); // 同一条
    expect(entries[0].amount).toBe(300); // 240 + 60
    expect(entries[0].cost).toBe(250);
    expect(entries[0].margin).toBe(50);
  });

  it('unconfirm 移除对应收益记录', () => {
    const qs = useQuotationStore();
    const rev = useRevenueStore();

    const q = qs.getOrCreate('p1');
    qs.addItem(q.id, addPayload({ cost: 100, salePrice: 120, quantity: 2 }));
    qs.confirmQuotation(q.id);
    expect(rev.byProject('p1').length).toBe(1);

    qs.unconfirmQuotation(q.id);
    expect(rev.byProject('p1').length).toBe(0);
    expect(q.status).toBe('draft');
  });
});

/* ============================ normalize 守卫 ============================ */
describe('normalize 持久化守卫', () => {
  it('normalizeQuoteItem：非法输入返回 null', () => {
    expect(normalizeQuoteItem(null)).toBeNull();
    expect(normalizeQuoteItem(undefined)).toBeNull();
    expect(normalizeQuoteItem('not-an-object')).toBeNull();
    expect(normalizeQuoteItem(123)).toBeNull();
    expect(normalizeQuoteItem([])).toBeNull();
    expect(normalizeQuoteItem({ name: 'no id' })).toBeNull();
  });

  it('normalizeQuoteItem：合法输入自动重算 salePrice / lineTotal', () => {
    const it = normalizeQuoteItem({ id: 'qi1', cost: 100, salePrice: 125, quantity: 2 });
    expect(it).not.toBeNull();
    if (it) {
      expect(it.salePrice).toBe(125);
      expect(it.margin).toBe(25);
      expect(it.lineTotal).toBe(250);
      expect(it.name).toBe('未命名产品'); // 缺省兜底
    }
  });

  it('normalizeQuoteItem：兼容旧 photoUrl → photoUrls', () => {
    const it = normalizeQuoteItem({ id: 'qi1', photoUrl: 'data:image/x' });
    expect(it).not.toBeNull();
    if (it) {
      expect(it.photoUrls).toEqual(['data:image/x']);
    }
  });

  it('normalizeQuotation：缺 items 归为 [] 且汇总按规则重算', () => {
    const q = normalizeQuotation({
      id: 'q1',
      projectId: 'p1',
      items: [{ id: 'qi1', cost: 100, salePrice: 120, quantity: 1 }],
    });
    expect(q).not.toBeNull();
    if (q) {
      expect(q.items.length).toBe(1);
      expect(q.totalAmount).toBe(120);
      expect(q.totalCost).toBe(100);
      expect(q.totalMargin).toBe(20);
      expect(q.status).toBe('draft');
      expect(q.confirmedAt).toBeNull();
    }
  });

  it('normalizeQuotation：confirmed 状态保留 confirmedAt', () => {
    const q = normalizeQuotation({
      id: 'q1',
      projectId: 'p1',
      status: 'confirmed',
      confirmedAt: '2024-01-01T00:00:00.000Z',
      items: [],
    });
    expect(q).not.toBeNull();
    if (q) {
      expect(q.status).toBe('confirmed');
      expect(q.confirmedAt).toBe('2024-01-01T00:00:00.000Z');
    }
  });

  it('normalizeQuotation：非法输入返回 null', () => {
    expect(normalizeQuotation(null)).toBeNull();
    expect(normalizeQuotation({ noId: true })).toBeNull();
    expect(normalizeQuotation('x')).toBeNull();
  });
});
