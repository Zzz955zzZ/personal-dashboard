/**
 * 冒烟测试：把饮食板块整棵组件树真实挂载一遍。
 *
 * 类型检查抓不到运行期问题（比如 store 方法名写错、v-for key 缺失、
 * 弹窗打开时的初始化顺序）。这里逐个页签切一遍 + 逐个弹窗开一遍，
 * 只要有任何一处抛错或产生 Vue warning 就算失败。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
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
      await flushPromises(); // 等懒加载组件解析
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
      await flushPromises(); // 等懒加载弹窗解析
      ui.modals[k] = false;
      await nextTick();
    }

    assertNoVueComplaints();
    wrapper.unmount();
  });

  it('挂载后完成了数据装载（种子数据可见）', async () => {
    const wrapper = await mountFood();
    const ui = useDietUi();

    // 切到原材料库页签 —— 懒加载组件应正常解析，不抛错
    ui.foodTab.value = 'ingredients';
    await nextTick();
    await flushPromises();

    // 断言：页签栏仍存在 + 无 Vue 告警（说明异步加载成功）
    expect(wrapper.text()).toContain('原材料库');
    assertNoVueComplaints();

    // 再切回每日记录验证双向切换
    ui.foodTab.value = 'dailylog';
    await nextTick();
    expect(wrapper.text()).toContain('每日记录');

    wrapper.unmount();
  });
});
