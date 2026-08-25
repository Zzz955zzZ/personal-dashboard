/**
 * QuoteItemRow 组件测试：#6 悬停删除按钮仅在 isRowHovered 时渲染、#3 售价单位回退显示。
 * 客户视图恒无删除按钮、无「操作」列。
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
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
    links: [],
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
    links: [],
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
      links: [],
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
    expect(inputs.some((i) => i.element.value === '1')).toBe(true);
    expect(inputs.some((i) => i.element.value === '0')).toBe(true);
    expect(inputs.some((i) => i.element.value === '21')).toBe(true);
  });
});

describe('客户链接字段显示逻辑', () => {
  it('管理态：链接以紧凑 🔗 按钮呈现', () => {
    const wrapper = mount(QuoteItemRow, {
      props: { item: makeRow({ links: ['https://example.com/p/1'] }), qid: 'q1', isCustomer: false },
      global: globalMount(),
    });
    expect(wrapper.findAll('button').some((b) => b.attributes('title')?.includes('客户链接'))).toBe(true);
    expect(wrapper.findAll('input').find((i) => i.attributes('placeholder') === '客户链接')).toBeFalsy();
  });

  it('客户视角：有链接时渲染可点击图标，无链接时也展示紧凑 🔗 图标', async () => {
    const withLink = mount(QuoteItemRow, {
      props: { item: makeRow({ links: ['https://example.com/p/1'] }), qid: 'q1', isCustomer: true },
      global: globalMount(),
      attachTo: document.body,
    });
    const linkBtn = withLink.findAll('button').find((b) => b.attributes('title')?.includes('客户链接'));
    expect(linkBtn).toBeTruthy();
    await linkBtn!.trigger('click');
    await flushPromises();
    const a = document.querySelector('a[href="https://example.com/p/1"]');
    expect(a).toBeTruthy();

    const withoutLink = mount(QuoteItemRow, {
      props: { item: makeRow({ links: [] }), qid: 'q1', isCustomer: true },
      global: globalMount(),
    });
    const emptyIcon = withoutLink.find('[title="无客户链接"]');
    expect(emptyIcon.exists()).toBe(true);
    // 链接单元格自身不应再显示旧占位符
    expect(withoutLink.findAll('td')[5].text()).not.toContain('—');
  });
});

describe('客户视角照片展开行', () => {
  it('客户视角也渲染第二行照片列表', () => {
    const wrapper = mount(QuoteItemRow, {
      props: {
        item: makeRow({ photoUrls: ['data:image/png;base64,aaa', 'data:image/png;base64,bbb'] }),
        qid: 'q1',
        isCustomer: true,
      },
      global: globalMount(),
    });
    const photoRows = wrapper.findAll('img');
    expect(photoRows.length).toBeGreaterThan(1);
  });
});

describe('#3 售价单位回退显示', () => {
  it('客户视图：item.salePriceUnit 缺省 → 显示 settings.defaultSalePriceUnit（件）', () => {
    const wrapper = mount(QuoteItemRow, {
      props: { item: makeRow(), qid: 'q1', isCustomer: true },
      global: globalMount(),
    });
    const priceTd = wrapper.findAll('td')[6]; // 客户视角：状态/照片/产品/型号/备注/链接/售价 → 售价=第 7 列
    expect(priceTd.text()).toContain('/ 件');
  });

  it('客户视图：item.salePriceUnit 优先于默认单位', () => {
    const wrapper = mount(QuoteItemRow, {
      props: { item: makeRow({ salePriceUnit: '米' }), qid: 'q1', isCustomer: true },
      global: globalMount(),
    });
    const priceTd = wrapper.findAll('td')[6];
    expect(priceTd.text()).toContain('/ 米');
  });
});
