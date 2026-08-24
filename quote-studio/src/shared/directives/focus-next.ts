/**
 * 全局指令 `v-focus-next`：在表格（或最近 table）内，按 DOM 顺序把 Enter 焦点
 * 移到下一个原生 text/number 输入框，便于报价行与分类管理页快速连续录入。
 *
 * 设计约定（见增量架构设计 §7.1）：
 *  - 仅作用于原生 input[type=text]/[type=number]/无 type 与 textarea；
 *  - 跳过 textarea（多行回车换行）、[data-enter-stop] 显式动作区、Select；
 *  - 输入法组合状态（isComposing）下按 Enter 不跳转，避免干扰中文输入；
 *  - 末格无下一输入框则停留（不触发「添加产品」）；
 *  - 组件内联原生输入框挂此指令，<Select> 与设置页显式 @keyup.enter 输入不挂。
 */
import type { ObjectDirective } from 'vue';

const FOCUSABLE = 'input[type="text"], input[type="number"], input:not([type]), textarea';

interface FocusNextElement extends HTMLElement {
  __focusNextHandler?: (e: KeyboardEvent) => void;
}

export const vFocusNext: ObjectDirective<FocusNextElement> = {
  mounted(el: FocusNextElement) {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA') return;
      if (target.closest('[data-enter-stop]')) return;
      e.preventDefault();
      const root = el.closest('table') ?? document;
      const all = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null,
      );
      const idx = all.indexOf(target);
      const next = all[idx + 1];
      if (next) {
        next.focus();
        const input = next as HTMLInputElement;
        if (typeof input.select === 'function') input.select();
      }
    };
    el.__focusNextHandler = handler;
    el.addEventListener('keydown', handler);
  },
  unmounted(el: FocusNextElement) {
    if (el.__focusNextHandler) {
      el.removeEventListener('keydown', el.__focusNextHandler);
      delete el.__focusNextHandler;
    }
  },
};
