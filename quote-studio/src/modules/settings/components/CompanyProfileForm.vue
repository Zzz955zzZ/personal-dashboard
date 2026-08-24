<script setup lang="ts">
/** 公司资料表单（PDF 抬头 / 页脚）。 */
import { useSettingsStore } from '@/modules/settings';
import { icon } from '@/shared/icons';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const store = useSettingsStore();

function patch(field: keyof typeof store.companyProfile, value: string): void {
  store.updateCompanyProfile({ [field]: value } as Partial<typeof store.companyProfile>);
}
</script>

<template>
  <div class="qs-card p-5 space-y-4">
    <div class="flex items-center gap-2 text-paper-500">
      <span v-html="icon('building')"></span>
      <span class="text-sm">用于报价单 / PDF 的抬头与页脚。</span>
    </div>

    <!-- Logo -->
    <div class="flex items-center gap-3">
      <img
        v-if="store.companyProfile.logoUrl"
        :src="store.companyProfile.logoUrl"
        alt="logo"
        class="w-14 h-14 rounded-lg object-cover border border-paper-200"
      />
      <div v-else class="w-14 h-14 rounded-lg bg-paper-100 flex items-center justify-center text-paper-400">
        <span v-html="icon('building')"></span>
      </div>
      <div class="flex-1 space-y-1.5">
        <Label>Logo 链接</Label>
        <Input
          v-focus-next
          :model-value="store.companyProfile.logoUrl"
          type="text"
          placeholder="https://.../logo.png"
          @update:model-value="patch('logoUrl', String($event))"
        />
      </div>
    </div>

    <div class="space-y-1.5">
      <Label>公司名称</Label>
      <Input
        v-focus-next
        :model-value="store.companyProfile.name"
        type="text"
        @update:model-value="patch('name', String($event))"
      />
    </div>
    <div class="space-y-1.5">
      <Label>业务描述 / 副标题</Label>
      <Input
        v-focus-next
        :model-value="store.companyProfile.slogan"
        type="text"
        placeholder="例如：Arquitectura de interiores · Reformas integrales"
        @update:model-value="patch('slogan', String($event))"
      />
    </div>
    <div class="space-y-1.5">
      <Label>地址</Label>
      <Input
        v-focus-next
        :model-value="store.companyProfile.address"
        type="text"
        @update:model-value="patch('address', String($event))"
      />
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <Label>电话</Label>
        <Input
          v-focus-next
          :model-value="store.companyProfile.phone"
          type="text"
          @update:model-value="patch('phone', String($event))"
        />
      </div>
      <div class="space-y-1.5">
        <Label>邮箱</Label>
        <Input
          v-focus-next
          :model-value="store.companyProfile.email"
          type="text"
          @update:model-value="patch('email', String($event))"
        />
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <Label>网站</Label>
        <Input
          v-focus-next
          :model-value="store.companyProfile.website"
          type="text"
          placeholder="www.ejemplo.com"
          @update:model-value="patch('website', String($event))"
        />
      </div>
      <div class="space-y-1.5">
        <Label>税号 (Tax ID)</Label>
        <Input
          v-focus-next
          :model-value="store.companyProfile.taxId"
          type="text"
          @update:model-value="patch('taxId', String($event))"
        />
      </div>
    </div>
    <div class="space-y-1.5">
      <Label>页脚备注</Label>
      <Textarea
        :model-value="store.companyProfile.footerNote"
        rows="2"
        @update:model-value="patch('footerNote', String($event))"
      ></Textarea>
    </div>
  </div>
</template>
