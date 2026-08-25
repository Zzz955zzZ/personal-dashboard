/**
 * QuoteItemRow 组件测试：#6 悬停删除按钮仅在 isRowHovered 时渲染、#3 售价单位回退显示。
 * 客户视图恒无删除按钮、无「操作」列。
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import QuoteItemRow from '@/modules/quotation/components/QuoteItemRow.vue';
import type { QuoteItem } from '@/modules/quotation/types';
import { genId } from '@/shared/util';
import { vFocusNext } from '@/shared/directives/focus-next';
import { useQuotationStore } from '@/modules/quotation';
import { useSettingsStore } from '@/modules/settings';

let pinia: ReturnType<typeof createPinia>;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  localStorage.clear();
});

/* reka-ui 在 jsdom 下的常见 API 打桩（不影响逻辑断言）。 */
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = () =>
      ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      }) as unknown as MediaQueryList;
  }
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

function makeRow(over: Partial<QuoteItem> = {}): QuoteItem {
  return {
    id: genId('qi'),
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
    salePrice: 120,
    quantity: 2,
    unit: '件',
    dtoPct: 0,
    ivaPct: 21,
    lineTotal: 240,
    statusId: '',
    ...over,
  };
}

function globalMount() {
  return {
    plugins: [pinia],
    directives: { 'focus-next': vFocusNext },
  };
}

describe('#6 悬停删除按钮渲染', () => {
  it('管理态：未悬停不渲染，悬停后渲染，移出后消失', async () => {
    const wrapper = mount(QuoteItemRow, {
      props: { item: makeRow(), qid: 'q1', isCustomer: false },
      global: globalMount(),
    });
    const tr = wrapper.find('tr');
    expect(wrapper.find('[title="删除"]').exists()).toBe(false);

    await tr.trigger('mouseenter');
    expect(wrapper.find('[title="删除"]').exists()).toBe(true);

    await tr.trigger('mouseleave');
    expect(wrapper.find('[title="删除"]').exists()).toBe(false);
  });

  it('客户视图：永不渲染删除按钮（无「操作」列）', async () => {
    const wrapper = mount(QuoteItemRow, {
      props: { item: makeRow(), qid: 'q1', isCustomer: true },
      global: globalMount(),
    });
    const tr = wrapper.find('tr');
    await tr.trigger('mouseenter');
    expect(wrapper.find('[title="删除"]').exists()).toBe(false);
  });
});

function addRowToStore(over: Partial<QuoteItem> = {}): QuoteItem {
  const qs = useQuotationStore();
  const ss = useSettingsStore();
  ss.hydrate();
  const q = qs.getOrCreate('p1');
  qs.addItem(q.id, {
    quotationId: q.id,
    categoryGroupId: 'cg',
    name: '沙发',
    nameEs: '',
    model: '',
    photoUrls: [],
    customerNote: '',
    internalNote: '',
    cost: 100,
    margin: 20,
    salePrice: 120,
    unit: '件',
    dtoPct: 0,
    ivaPct: 21,
    statusId: '',
    ...over,
  } as Omit<QuoteItem, 'id' | 'lineTotal' | 'quotationId'>);
  return q.items[q.items.length - 1];
}

describe('#5 数量步进按钮', () => {
  it('点击 + 数量从 1 增加到 2', async () => {
    const qs = useQuotationStore();
    addRowToStore({ quantity: 1 });
    const q = qs.quotations[0];
    const wrapper = mount(QuoteItemRow, {
      props: { item: q.items[0], qid: q.id, isCustomer: false },
      global: globalMount(),
    });
    const plus = wrapper.findAll('button').find((b) => b.attributes('title') === '增加数量');
    expect(plus).toBeTruthy();
    await plus!.trigger('click');
    expect(q.items[0].quantity).toBe(2);
  });

  it('quantity 为 1 时减号禁用，点击不减少', async () => {
    const qs = useQuotationStore();
    addRowToStore({ quantity: 1 });
    const q = qs.quotations[0];
    const wrapper = mount(QuoteItemRow, {
      props: { item: q.items[0], qid: q.id, isCustomer: false },
      global: globalMount(),
    });
    const minus = wrapper.findAll('button').find((b) => b.attributes('title') === '减少数量');
    expect(minus).toBeTruthy();
    expect(minus!.attributes('disabled')).toBeDefined();
    await minus!.trigger('click');
    expect(q.items[0].quantity).toBe(1);
  });
});

describe('默认数值渲染', () => {
  it('空白行也应在输入框内显示默认值（quantity=1, dto=0, iva=21）', async () => {
    const qs = useQuotationStore();
    const ss = useSettingsStore();
    ss.hydrate();
    const q = qs.getOrCreate('p1');
    qs.addItem(q.id, {
      quotationId: q.id,
      categoryGroupId: 'cg',
      name: '',
      nameEs: '',
      model: '',
      photoUrls: [],
      customerNote: '',
      internalNote: '',
      cost: 0,
      margin: 0,
      salePrice: 0,
      quantity: 1,
      unit: '件',
      salePriceUnit: '',
      dtoPct: 0,
      ivaPct: 21,
      statusId: '',
    } as Omit<QuoteItem, 'id' | 'lineTotal' | 'quotationId'>);
    const item = q.items[0];
    const wrapper = mount(QuoteItemRow, {
      props: { item, qid: q.id, isCustomer: false },
      global: globalMount(),
    });
    const inputs = wrapper.findAll('input');
    const qty = inputs.find((i) => i.attributes('title') === '数量' || i.attributes('type') === 'number');
    expect(inputs.some((i) => i.element.value === '1')).toBe(true);
    expect(inputs.some((i) => i.element.value === '0')).toBe(true);
    expect(inputs.some((i) => i.element.value === '21')).toBe(true);
  });
});

describe('#3 售价单位回退显示', () => {
  it('客户视图：item.salePriceUnit 缺省 → 显示 settings.defaultSalePriceUnit（件）', () => {
    const wrapper = mount(QuoteItemRow, {
      props: { item: makeRow(), qid: 'q1', isCustomer: true },
      global: globalMount(),
    });
    const priceTd = wrapper.findAll('td')[5]; // 客户视图第 6 列 = 售价
    expect(priceTd.text()).toContain('/ 件');
  });

  it('客户视图：item.salePriceUnit 优先于默认单位', () => {
    const wrapper = mount(QuoteItemRow, {
      props: { item: makeRow({ salePriceUnit: '米' }), qid: 'q1', isCustomer: true },
      global: globalMount(),
    });
    const priceTd = wrapper.findAll('td')[5];
    expect(priceTd.text()).toContain('/ 米');
  });
});
