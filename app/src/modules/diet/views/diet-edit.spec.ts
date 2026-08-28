/**
 * 回归测试：记录模块「修改食物」入口能否正常打开编辑抽屉并可保存。
 * 编辑抽屉是 Teleport 到 body 的，所以要从 document.body 查询，而非 wrapper。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

import FoodView from './FoodView.vue';
import { useDietStore } from '../store/diet-store';
import { useDietUi } from '../composables/use-diet-ui';

let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

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
  await flushPromises();
  return wrapper;
}

function bodySheet(): Element | null {
  return document.body.querySelector('[data-testid="edit-sheet"]');
}

describe('记录页修改食物', () => {
  it('点击记录列表中的食材行能打开编辑抽屉', async () => {
    const wrapper = await mountFood();
    const store = useDietStore();
    const ui = useDietUi();
    const ing = store.ingredients[0]!;
    store.addLogEntry(ui.logDate.value, { ingredientId: ing.id, amount: 100, mealType: 'breakfast' });
    await nextTick();

    const row = wrapper.find('[data-testid="log-row"]');
    expect(row.exists()).toBe(true);
    await row.trigger('click');
    await nextTick();
    await flushPromises();

    expect(bodySheet()).not.toBeNull();
    expect(bodySheet()!.textContent).toContain('修改分量 / 餐次');
    wrapper.unmount();
  });

  it('从餐次详情页点击食材也能打开编辑抽屉', async () => {
    const wrapper = await mountFood();
    const store = useDietStore();
    const ui = useDietUi();
    const ing = store.ingredients[0]!;
    store.addLogEntry(ui.logDate.value, { ingredientId: ing.id, amount: 100, mealType: 'breakfast' });
    await nextTick();

    // 打开早餐详情
    const detailBtn = wrapper.findAll('button').find((b) => b.text() === '详情');
    expect(detailBtn).toBeTruthy();
    await detailBtn!.trigger('click');
    await nextTick();
    await flushPromises();

    const detailRow = wrapper.find('[data-testid="detail-row"]');
    expect(detailRow.exists()).toBe(true);
    await detailRow.trigger('click');
    await nextTick();
    await flushPromises();

    expect(bodySheet()).not.toBeNull();
    wrapper.unmount();
  });

  it('在编辑抽屉改分量后保存，数据回写 store', async () => {
    const wrapper = await mountFood();
    const store = useDietStore();
    const ui = useDietUi();
    const ing = store.ingredients[0]!;
    store.addLogEntry(ui.logDate.value, { ingredientId: ing.id, amount: 100, mealType: 'breakfast' });
    await nextTick();

    await wrapper.find('[data-testid="log-row"]').trigger('click');
    await nextTick();
    await flushPromises();

    const sheet = bodySheet()!;
    const input = sheet.querySelector('input[type="number"]') as HTMLInputElement;
    input.value = '250';
    input.dispatchEvent(new Event('input'));
    await nextTick();

    const saveBtn = Array.from(sheet.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('保存'),
    ) as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();
    saveBtn.click();
    await nextTick();
    await flushPromises();

    const updated = store.getDayLog(ui.logDate.value)[0];
    expect(updated.amount).toBe(250);
    expect(bodySheet()).toBeNull(); // 保存后抽屉关闭
    wrapper.unmount();
  });
});
