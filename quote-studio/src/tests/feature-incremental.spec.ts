/**
 * 六项增量优化（#1~#6）的新功能回归测试。
 * 覆盖：售价单位持久化与 normalize 归约、设置 actions、v-focus-next 聚焦串联。
 * 注：#1 hydrateAll 同步位置、#4/#5 视觉、#6 悬停删除的「渲染层面」分别在
 * App.vue 代码审查、QuoteItemRow 组件测试与 build 校验中验证。
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { ObjectDirective } from 'vue';
import { normalizeSettings, loadSettingsState } from '@/modules/settings/store/persistence';
import { DEFAULT_SETTINGS } from '@/modules/settings/constants';
import { useSettingsStore } from '@/modules/settings';
import { normalizeQuoteItem } from '@/modules/quotation/store/persistence';
import { vFocusNext } from '@/shared/directives/focus-next';

/* jsdom 不做布局，offsetParent 恒为 null；v-focus-next 用它过滤「可见」输入框。
 * 打桩让 offsetParent 返回父节点，使可见性过滤通过，覆盖真实代码路径。 */
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return this.parentNode;
    },
  });
});

/* ==================== #3 售价单位：normalizeSettings ==================== */
describe('#3 normalizeSettings：售价单位归约', () => {
  it('缺省输入回退到 DEFAULT_SETTINGS（defaultSalePriceUnit=件）', () => {
    const s = normalizeSettings(null);
    expect(s.salePriceUnitOptions).toEqual(DEFAULT_SETTINGS.salePriceUnitOptions);
    expect(s.defaultSalePriceUnit).toBe('件');
  });

  it('空数组回退到默认可选列表', () => {
    const s = normalizeSettings({ salePriceUnitOptions: [] });
    expect(s.salePriceUnitOptions).toEqual(DEFAULT_SETTINGS.salePriceUnitOptions);
  });

  it('保留原始可选列表并逐个规范化（m²→m2、去空格）', () => {
    const s = normalizeSettings({ salePriceUnitOptions: [' m² ', ' 天 ', '件'] });
    expect(s.salePriceUnitOptions).toContain('m2');
    expect(s.salePriceUnitOptions).toContain('天');
    expect(s.salePriceUnitOptions).toContain('件');
    expect(s.salePriceUnitOptions.every((u) => u === u.trim())).toBe(true);
  });

  it('defaultSalePriceUnit 接受合法值', () => {
    const s = normalizeSettings({ defaultSalePriceUnit: 'h' });
    expect(s.defaultSalePriceUnit).toBe('h');
  });
});

/* ==================== #3 售价单位：normalizeQuoteItem.salePriceUnit ==================== */
describe('#3 normalizeQuoteItem：salePriceUnit 字段', () => {
  it('保留原始售价单位', () => {
    const it = normalizeQuoteItem({ id: 'qi1', salePriceUnit: '件' });
    expect(it?.salePriceUnit).toBe('件');
  });

  it('缺省时为空串（展示层回退 defaultSalePriceUnit→defaultUnit）', () => {
    const it = normalizeQuoteItem({ id: 'qi1' });
    expect(it?.salePriceUnit).toBe('');
  });

  it('过长值截断到 20 字符', () => {
    const long = 'a'.repeat(30);
    const it = normalizeQuoteItem({ id: 'qi1', salePriceUnit: long });
    expect(it?.salePriceUnit).toBe('a'.repeat(20));
  });
});

/* ==================== #3 售价单位：settings store actions + 持久化 ==================== */
describe('#3 settings store：售价单位 actions 与持久化', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('addSalePriceUnitOption：新增并即时持久化', () => {
    const store = useSettingsStore();
    store.addSalePriceUnitOption('批');
    expect(store.settings.salePriceUnitOptions).toContain('批');

    const loaded = loadSettingsState(localStorage);
    expect(loaded.state.settings.salePriceUnitOptions).toContain('批');
  });

  it('addSalePriceUnitOption：忽略重复与空白', () => {
    const store = useSettingsStore();
    store.addSalePriceUnitOption('件'); // 默认已存在
    expect(store.settings.salePriceUnitOptions.filter((u) => u === '件').length).toBe(1);

    store.addSalePriceUnitOption('   '); // 空白被规范化掉
    expect(store.settings.salePriceUnitOptions).toEqual(DEFAULT_SETTINGS.salePriceUnitOptions);
  });

  it('removeSalePriceUnitOption：删除指定项', () => {
    const store = useSettingsStore();
    store.addSalePriceUnitOption('批');
    expect(store.settings.salePriceUnitOptions).toContain('批');
    store.removeSalePriceUnitOption('批');
    expect(store.settings.salePriceUnitOptions).not.toContain('批');
  });

  it('setDefaultSalePriceUnit：设置默认售价单位', () => {
    const store = useSettingsStore();
    store.addSalePriceUnitOption('天');
    store.setDefaultSalePriceUnit('天');
    expect(store.settings.defaultSalePriceUnit).toBe('天');
  });
});

/* ==================== #2 v-focus-next 指令：聚焦串联 ==================== */
describe('#2 v-focus-next 指令：Enter 聚焦顺序', () => {
  function buildTable(inner: string): void {
    document.body.innerHTML = `<table><tbody><tr>${inner}</tr></tbody></table>`;
  }
  const mountDir = (vFocusNext as ObjectDirective<HTMLElement>).mounted as (el: HTMLElement) => void;

  it('按 DOM 顺序聚焦到下一输入框', () => {
    buildTable('<td><input id="a"></td><td><input id="b"></td>');
    const a = document.getElementById('a') as HTMLInputElement;
    const b = document.getElementById('b') as HTMLInputElement;
    mountDir(a);
    mountDir(b);
    a.focus();
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(b);
  });

  it('number 输入同样参与聚焦序列', () => {
    buildTable('<td><input id="a"></td><td><input id="b" type="number"></td><td><input id="c"></td>');
    const a = document.getElementById('a') as HTMLInputElement;
    const b = document.getElementById('b') as HTMLInputElement;
    const c = document.getElementById('c') as HTMLInputElement;
    mountDir(a);
    mountDir(b);
    mountDir(c);
    a.focus();
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(b);
  });

  it('末格 Enter 不跳转（停留在末格，指令内无任何「添加产品」逻辑）', () => {
    buildTable('<td><input id="a"></td><td><input id="b"></td><td><input id="c"></td>');
    const a = document.getElementById('a') as HTMLInputElement;
    const b = document.getElementById('b') as HTMLInputElement;
    const c = document.getElementById('c') as HTMLInputElement;
    mountDir(a);
    mountDir(b);
    mountDir(c);
    c.focus();
    c.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(c); // 无下一输入框 → 停留
  });

  it('原生 select 不参与聚焦序列（跳过，不误跳转）', () => {
    buildTable(
      '<td><input id="a"></td><td><select id="s"><option>1</option></select></td><td><input id="b"></td>',
    );
    const a = document.getElementById('a') as HTMLInputElement;
    const b = document.getElementById('b') as HTMLInputElement;
    mountDir(a);
    mountDir(b);
    a.focus();
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(b);
  });

  it('非 Enter 键不触发聚焦', () => {
    buildTable('<td><input id="a"></td><td><input id="b"></td>');
    const a = document.getElementById('a') as HTMLInputElement;
    const b = document.getElementById('b') as HTMLInputElement;
    mountDir(a);
    mountDir(b);
    a.focus();
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(a);
  });

  it('拦截 Enter 默认行为（preventDefault）', () => {
    buildTable('<td><input id="a"></td><td><input id="b"></td>');
    const a = document.getElementById('a') as HTMLInputElement;
    mountDir(a);
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    a.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});
