/**
 * 冒烟测试：把饮食板块整棵组件树真实挂载一遍。
 *
 * 类型检查抓不到运行期问题（比如 store 方法名写错、v-for key 缺失、
 * 弹窗打开时的初始化顺序）。这里逐个页签切一遍 + 逐个弹窗开一遍，
 * 只要有任何一处抛错或产生 Vue warning 就算失败。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

import FoodView from './FoodView.vue';
import { FOOD_TABS } from '../constants';
import { useDietUi } from '../composables/use-diet-ui';

let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

function assertNoVueComplaints(): void {
  const msgs = [...warnSpy.mock.calls, ...errorSpy.mock.calls].map((c) => String(c[0]));
  expect(msgs).toEqual([]);
}

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

async function mountFood(): Promise<VueWrapper> {
  const wrapper = mount(FoodView, { attachTo: document.body });
  await nextTick();
  return wrapper;
}

describe('FoodView 冒烟', () => {
  it('五个页签都能渲染且不产生告警', async () => {
    const wrapper = await mountFood();
    const ui = useDietUi();

    for (const tab of FOOD_TABS) {
      ui.foodTab.value = tab.key;
      await nextTick();
      await nextTick();
      expect(wrapper.html()).toContain('饮食');
    }

    assertNoVueComplaints();
    wrapper.unmount();
  });

  it('每个弹窗都能打开', async () => {
    const wrapper = await mountFood();
    const ui = useDietUi();

    const keys = ['ingForm', 'recipeForm', 'pantryForm', 'copyDay', 'copyMeal', 'template'] as const;
    for (const k of keys) {
      ui.modals[k] = true;
      await nextTick();
      await nextTick();
      ui.modals[k] = false;
      await nextTick();
    }

    assertNoVueComplaints();
    wrapper.unmount();
  });

  it('挂载后完成了数据装载（种子数据可见）', async () => {
    const wrapper = await mountFood();
    const ui = useDietUi();
    ui.foodTab.value = 'ingredients';
    await nextTick();
    await nextTick();

    // 原材料库页签应渲染出若干食材卡片
    expect(wrapper.text()).toMatch(/蛋白质|碳水|脂肪|蔬菜/);
    wrapper.unmount();
  });
});
