/**
 * 聚焦即全选：让数值/文本输入框在获得焦点时选中全部内容，
 * 用户可直接键入覆盖，无需先手动删除原内容。
 * 用于「修改某一项数据时直接覆盖输入」的全局约定。
 */
export function selectOnFocus(e: FocusEvent): void {
  const el = e.target as HTMLInputElement | HTMLTextAreaElement | null;
  if (el && typeof el.select === 'function') el.select();
}
