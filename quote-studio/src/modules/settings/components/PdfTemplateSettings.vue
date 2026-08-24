<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
/** PDF 模板设置（抬头布局 / 是否显示 Logo / 页脚 / 强调色）。 */
import { useSettingsStore } from '@/modules/settings';
import { icon } from '@/shared/icons';
import type { PdfTemplate } from '../types';

const store = useSettingsStore();

const layouts: { value: PdfTemplate['headerLayout']; label: string }[] = [
  { value: 'logo-left', label: 'Logo 居左' },
  { value: 'logo-center', label: 'Logo 居中' },
  { value: 'none', label: '无抬头' },
];

function update(patch: Partial<PdfTemplate>): void {
  store.updateSettings({ pdfTemplate: { ...store.settings.pdfTemplate, ...patch } });
}
</script>

<template>
  <div class="qs-card p-5 space-y-4">
    <div class="flex items-center gap-2 text-paper-500">
      <span v-html="icon('printer')"></span>
      <span class="text-sm">控制打印 / 导出 PDF 时的抬头样式。</span>
    </div>

    <div>
      <Label class="">抬头布局</Label>
      <div class="flex gap-2 flex-wrap">
        <Button variant="ghost"
          v-for="opt in layouts"
          :key="opt.value"
          class=""
          :class="store.settings.pdfTemplate.headerLayout === opt.value ? 'qs-btn-primary' : 'qs-btn-ghost'"
          @click="update({ headerLayout: opt.value })">
          {{ opt.label }}
        </Button>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <Label class=" mb-0">显示 Logo</Label>
      <Button variant="ghost"
        class=""
        :class="store.settings.pdfTemplate.showLogo ? 'qs-btn-primary' : 'qs-btn-ghost'"
        @click="update({ showLogo: !store.settings.pdfTemplate.showLogo })">
        {{ store.settings.pdfTemplate.showLogo ? '已开启' : '已关闭' }}
      </Button>
    </div>

    <div class="flex items-center gap-3">
      <Label class=" mb-0">显示页脚</Label>
      <Button variant="ghost"
        class=""
        :class="store.settings.pdfTemplate.showFooter ? 'qs-btn-primary' : 'qs-btn-ghost'"
        @click="update({ showFooter: !store.settings.pdfTemplate.showFooter })">
        {{ store.settings.pdfTemplate.showFooter ? '已开启' : '已关闭' }}
      </Button>
    </div>

    <div>
      <Label class="">PDF 页脚备注（覆盖公司资料页脚）</Label>
      <Textarea
        :value="store.settings.pdfTemplate.footerNote"
        rows="2"
        class=""
        placeholder="留空则使用公司资料里的页脚备注"
        @input="update({ footerNote: ($event.target as HTMLTextAreaElement).value })"
      ></Textarea>
    </div>

    <div>
      <Label class="">强调色</Label>
      <div class="flex gap-2 flex-wrap">
        <Button variant="ghost"
          class=""
          :class="store.settings.pdfTemplate.accentColor === 'dark' ? 'qs-btn-primary' : 'qs-btn-ghost'"
          @click="update({ accentColor: 'dark' })">
          深黑
        </Button>
        <Button variant="ghost"
          class=""
          :class="store.settings.pdfTemplate.accentColor === 'brown' ? 'qs-btn-primary' : 'qs-btn-ghost'"
          @click="update({ accentColor: 'brown' })">
          暖棕
        </Button>
      </div>
    </div>
  </div>
</template>
