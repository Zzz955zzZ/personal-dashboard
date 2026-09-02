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
import { useUndo } from '@/shared/composables/use-undo';

let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let pinia: ReturnType<typeof createPinia>;

beforeEach(() => {
  localStorage.clear();
  pinia = createPinia();
  setActivePinia(pinia);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

async function mountFood(): Promise<VueWrapper> {
  // transition: true 让 <transition mode="out-in"> 直接渲染子节点，
  // 避免 jsdom 下离场动画不结束导致异步组件迟迟不挂载。
  // 显式注入 pinia，保证挂载的组件与测试中 useDietStore() 指向同一实例
  // （否则组件内部会解析到独立的 store，导致记录数断言对不上）。
  const wrapper = mount(FoodView, {
    attachTo: document.body,
    global: { stubs: { transition: true }, plugins: [pinia] },
  });
  await nextTick();
  await flushPromises();

  // 隔离 autoFill：挂载完成后清空当天记录并取消所有默认套餐标记，
  // 让各 UI 测试完全掌控条目集合。否则 autoFill 自动套用的默认早餐会
  // 抢占首行与 [0] 下标、抬高 before 计数，导致「改分量/孤儿/删除/添加」断言错位。
  // （store 层对 autoFill 的覆盖测试在 diet-profiles.spec.ts 单独进行。）
  const s = useDietStore();
  const u = useDietUi();
  s.mealTemplates.forEach((t) => {
    t.isDefault = false;
  });
  s.getDayLog(u.logDate.value).splice(0);
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

describe('孤儿记录（食材已不存在）：显示与编辑', () => {
  it('引用已删除食材的记录在列表中显示兜底名且能打开编辑', async () => {
    const wrapper = await mountFood();
    const store = useDietStore();
    const ui = useDietUi();
    // 引用一个不存在的食材 id（模拟被删除 / 老数据损坏）
    store.addLogEntry(ui.logDate.value, { ingredientId: 999999, amount: 120, mealType: 'breakfast' });
    await nextTick();

    const row = wrapper.find('[data-testid="log-row"]');
    expect(row.exists()).toBe(true);
    // safeIng 兜底：不再显示空白名
    expect(row.text()).toContain('未知食材');

    await row.trigger('click');
    await nextTick();
    await flushPromises();

    const sheet = bodySheet();
    expect(sheet).not.toBeNull();
    // 旧逻辑会 toast 并直接 return；新逻辑必须能打开并给出重关联入口
    expect(sheet!.textContent).toContain('该食材已不存在');
    expect(sheet!.textContent).toContain('重新选择食材');
    wrapper.unmount();
  });

  it('点击「重新选择食材」可在食材页把孤儿记录重新关联', async () => {
    const wrapper = await mountFood();
    const store = useDietStore();
    const ui = useDietUi();
    // 先放一个真实食材供重新关联
    store.saveIngredient(
      { name: '真实食材', category: 'protein', emoji: '🍗', nutrition: { calories: 100, carbs: 0, protein: 20, fat: 5 }, note: '', tags: [], image: '' },
      null,
    );
    store.addLogEntry(ui.logDate.value, { ingredientId: 999999, amount: 120, mealType: 'breakfast' });
    await nextTick();

    await wrapper.find('[data-testid="log-row"]').trigger('click');
    await nextTick();
    await flushPromises();

    const sheet = bodySheet()!;
    const relinkBtn = Array.from(sheet.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('重新选择食材'),
    ) as HTMLButtonElement;
    expect(relinkBtn).toBeTruthy();
    relinkBtn.click();
    await nextTick();
    await flushPromises();

    // 异步组件（IngredientsView）动态导入 + out-in 过渡，轮询等待其挂载
    let card: ReturnType<VueWrapper['find']> | null = null;
    for (let i = 0; i < 40; i++) {
      await nextTick();
      await flushPromises();
      const c = wrapper.find('[data-testid="ing-card"]');
      if (c.exists()) {
        card = c;
        break;
      }
      await new Promise((r) => setTimeout(r, 20));
    }

    // 应跳到食材页
    expect(ui.foodTab.value).toBe('ingredients');
    expect(card).not.toBeNull();
    const cardEl = card!;
    await cardEl.trigger('click');
    await nextTick();
    await flushPromises();

    const entry = store.getDayLog(ui.logDate.value)[0]!;
    expect(entry.ingredientId).not.toBe(999999);
    expect(store.findIng(entry.ingredientId)).toBeTruthy();
    // 关联后回到记录页
    expect(ui.foodTab.value).toBe('dailylog');
    wrapper.unmount();
  });
});

describe('store：孤儿数据预防与兜底', () => {
  it('safeIng 对缺失 id 返回幽灵占位而非 undefined', () => {
    const store = useDietStore();
    const g = store.safeIng(123456);
    expect(g.name).toBe('未知食材');
    expect(g.nutrition.calories).toBe(0);
  });

  it('连续新增食材 id 不碰撞', () => {
    const store = useDietStore();
    store.saveIngredient(
      { name: 'A', category: 'protein', emoji: '', nutrition: { calories: 0, carbs: 0, protein: 0, fat: 0 }, note: '', tags: [], image: '' },
      null,
    );
    store.saveIngredient(
      { name: 'B', category: 'protein', emoji: '', nutrition: { calories: 0, carbs: 0, protein: 0, fat: 0 }, note: '', tags: [], image: '' },
      null,
    );
    const ids = store.ingredients.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('deleteIngredient 级联删除其记录（杜绝新孤儿）', () => {
    const store = useDietStore();
    store.saveIngredient(
      { name: 'A', category: 'protein', emoji: '', nutrition: { calories: 0, carbs: 0, protein: 0, fat: 0 }, note: '', tags: [], image: '' },
      null,
    );
    const ing = store.ingredients[0]!;
    store.addLogEntry('2026-01-01', { ingredientId: ing.id, amount: 100, mealType: 'breakfast' });
    const count = store.deleteIngredient(ing.id);
    expect(count).toBe(1);
    expect(store.findIng(ing.id)).toBeUndefined();
    expect(store.getDayLog('2026-01-01').length).toBe(0);
  });
});

describe('修复：非首个餐次的记录可正常打开编辑（位置定位）', () => {
  it('点击午餐记录仍能打开编辑抽屉，且不报「位置已变」', async () => {
    const wrapper = await mountFood();
    const store = useDietStore();
    const ui = useDietUi();
    const { undoToast, dismissUndo } = useUndo();
    dismissUndo();

    // 确保存在一条「午餐」记录（真实食材）
    const ing = store.ingredients[0]!;
    store.addLogEntry(ui.logDate.value, { ingredientId: ing.id, amount: 80, mealType: 'lunch' });
    await nextTick();

    const rows = wrapper.findAll('[data-testid="log-row"]');
    const row = rows.find((r) => r.text().includes(ing.name));
    expect(row).toBeTruthy();
    await row!.trigger('click');
    await nextTick();
    await flushPromises();

    // 修复后：编辑抽屉应打开，且不应出现「位置已变」提示
    expect(bodySheet()).not.toBeNull();
    expect(undoToast.visible).toBe(false);
    expect(undoToast.message).not.toContain('记录位置已变');
    wrapper.unmount();
  });
});

describe('修复：删除记录可撤回', () => {
  it('删除记录后弹出撤回条，点「撤销」可恢复该条目', async () => {
    const wrapper = await mountFood();
    const store = useDietStore();
    const ui = useDietUi();
    const { undoToast, executeUndo, dismissUndo } = useUndo();
    dismissUndo();

    const ing = store.ingredients[0]!;
    const before = store.getDayLog(ui.logDate.value).length;
    store.addLogEntry(ui.logDate.value, { ingredientId: ing.id, amount: 100, mealType: 'breakfast' });
    await nextTick();

    await wrapper.find('[data-testid="log-row"]').trigger('click');
    await nextTick();
    await flushPromises();

    const sheet = bodySheet();
    expect(sheet).not.toBeNull();
    const delBtn = Array.from(sheet!.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('×'),
    ) as HTMLButtonElement | undefined;
    expect(delBtn).toBeTruthy();
    delBtn!.click();
    await nextTick();
    await flushPromises();

    // 删除后：撤回条弹出、记录数回到 +0、抽屉关闭
    expect(undoToast.visible).toBe(true);
    expect(undoToast.mode).toBe('undo');
    expect(store.getDayLog(ui.logDate.value).length).toBe(before);
    expect(bodySheet()).toBeNull();

    // 执行撤回 → 条目恢复
    executeUndo();
    await nextTick();
    expect(store.getDayLog(ui.logDate.value).length).toBe(before + 1);
    expect(undoToast.visible).toBe(false);
    wrapper.unmount();
  });
});

describe('修复：添加记录可撤回', () => {
  it('从食材页添加记录后弹出撤回条，点「撤销」可移除该条目', async () => {
    const wrapper = await mountFood();
    const store = useDietStore();
    const ui = useDietUi();
    const { undoToast, executeUndo, dismissUndo } = useUndo();
    dismissUndo();

    // 触发一次 DailyLogView 重挂载，让 hydrated 后的自动套用逻辑稳定
    ui.foodTab.value = 'ingredients';
    await nextTick();
    await flushPromises();
    ui.foodTab.value = 'dailylog';
    await nextTick();
    await flushPromises();

    const before = store.getDayLog(ui.logDate.value).length;

    // 进入 picker 模式（跳到食材页选择）
    ui.startIngredientPicker(ui.logDate.value, 'breakfast');
    await nextTick();
    await flushPromises();

    // 等待 IngredientsView 异步挂载
    let card: ReturnType<VueWrapper['find']> | null = null;
    for (let i = 0; i < 40; i++) {
      await nextTick();
      await flushPromises();
      const c = wrapper.find('[data-testid="ing-card"]');
      if (c.exists()) {
        card = c;
        break;
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(card).not.toBeNull();

    // 点选食材 -> 打开 picker 抽屉（确认添加）
    await card!.trigger('click');
    await nextTick();
    await flushPromises();

    let confirmBtn: HTMLButtonElement | undefined;
    for (let i = 0; i < 40; i++) {
      await nextTick();
      await flushPromises();
      confirmBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        (b.textContent || '').includes('确认添加'),
      ) as HTMLButtonElement | undefined;
      if (confirmBtn) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(confirmBtn).toBeTruthy();
    confirmBtn!.click();
    await nextTick();
    await flushPromises();

    // 添加后：撤回条弹出、记录数 +1
    expect(undoToast.visible).toBe(true);
    expect(undoToast.mode).toBe('undo');
    expect(store.getDayLog(ui.logDate.value).length).toBe(before + 1);

    // 执行撤回 -> 条目移除
    executeUndo();
    await nextTick();
    expect(store.getDayLog(ui.logDate.value).length).toBe(before);
    expect(undoToast.visible).toBe(false);
    wrapper.unmount();
  });
});

describe('persistence：损坏日志条目过滤', () => {
  it('normalizeDailyLogs 丢弃 ingredientId<=0 / 非有限的损坏条目', async () => {
    const { normalizeState } = await import('../store/persistence');
    const st = normalizeState(
      { dailyLogs: { '2026-01-01': [
        { ingredientId: 0, amount: 50 },
        { ingredientId: 'abc', amount: 50 },
        { ingredientId: 5, amount: 100 },
      ] } },
      () => [],
    );
    const logs = st.dailyLogs!['2026-01-01'];
    expect(logs.length).toBe(1);
    expect(logs[0]!.ingredientId).toBe(5);
  });
});
