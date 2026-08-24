/**
 * QuoteItemRow 组件测试：#6 悬停删除按钮仅在 isRowHovered 时渲染、#3 售价单位回退显示。
 * 客户视图恒无删除按钮、无「操作」列。
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import QuoteItemRow from '@/modules/quotation/components/QuoteItemRow.vue';
import type { QuoteItem } from '@/modules/quotation/types';
import { genId } from '@/shared/util';
import { vFocusNext } from '@/shared/directives/focus-next';

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

const globalMount = {
  plugins: [createPinia()],
  directives: { 'focus-next': vFocusNext },
};

describe('#6 悬停删除按钮渲染', () => {
  it('管理态：未悬停不渲染，悬停后渲染，移出后消失', async () => {
    const wrapper = mount(QuoteItemRow, {
      props: { item: makeRow(), qid: 'q1', isCustomer: false },
      global: globalMount,
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
      global: globalMount,
    });
    const tr = wrapper.find('tr');
    await tr.trigger('mouseenter');
    expect(wrapper.find('[title="删除"]').exists()).toBe(false);
  });
});

describe('#3 售价单位回退显示', () => {
  it('客户视图：item.salePriceUnit 缺省 → 显示 settings.defaultSalePriceUnit（件）', () => {
    const wrapper = mount(QuoteItemRow, {
      props: { item: makeRow(), qid: 'q1', isCustomer: true },
      global: globalMount,
    });
    const priceTd = wrapper.findAll('td')[5]; // 客户视图第 6 列 = 售价
    expect(priceTd.text()).toContain('/ 件');
  });

  it('客户视图：item.salePriceUnit 优先于默认单位', () => {
    const wrapper = mount(QuoteItemRow, {
      props: { item: makeRow({ salePriceUnit: '米' }), qid: 'q1', isCustomer: true },
      global: globalMount,
    });
    const priceTd = wrapper.findAll('td')[5];
    expect(priceTd.text()).toContain('/ 米');
  });
});
