<script setup lang="ts">
/** 设置中心：左侧垂直导航 + 右侧内容区。
 * 导航使用 shadcn Card 容器，不透明背景，避免滚动时内容透显；
 * 按钮排布更宽松，减少拥挤感。
 */
import { onMounted, ref } from 'vue';

import { useSettingsStore } from '@/modules/settings';
import { icon } from '@/shared/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import CategoryManager from '../components/CategoryManager.vue';
import CarpetaManager from '../components/CarpetaManager.vue';
import ProductDefaultsSettings from '../components/ProductDefaultsSettings.vue';
import CompanyProfileForm from '../components/CompanyProfileForm.vue';
import PdfTemplateSettings from '../components/PdfTemplateSettings.vue';
import SyncSettings from '../components/SyncSettings.vue';
import AiSettings from '../components/AiSettings.vue';

const settings = useSettingsStore();
onMounted(() => settings.hydrate());

const tabs = [
  { key: 'category', label: '分类管理', icon: 'catalog' },
  { key: 'defaults', label: '产品默认', icon: 'settings' },
  { key: 'carpeta', label: '档案夹', icon: 'folder' },
  { key: 'company', label: '公司资料', icon: 'building' },
  { key: 'pdf', label: 'PDF 模板', icon: 'printer' },
  { key: 'sync', label: '云同步', icon: 'cloud' },
  { key: 'ai', label: 'AI 配置', icon: 'sparkles' },
] as const;
type TabKey = (typeof tabs)[number]['key'];
const active = ref<TabKey>('category');
</script>

<template>
  <div class="flex min-h-[calc(100vh-4.5rem)]">
    <!-- 左侧导航：不透明背景、宽松间距 -->
    <aside class="w-60 shrink-0 sticky top-[4.5rem] self-start h-[calc(100vh-4.5rem)] px-5 py-6">
      <Card class="h-full flex flex-col overflow-hidden">
        <CardHeader class="pb-3 pt-4 px-4">
          <CardTitle class="text-xs font-semibold uppercase tracking-wider text-paper-500">
            Lyd9 Studio
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent class="flex-1 overflow-y-auto px-2 py-3">
          <nav class="flex flex-col gap-1">
            <Button
              v-for="t in tabs"
              :key="t.key"
              variant="ghost"
              size="sm"
              class="justify-start gap-3 px-3 py-2 h-9 text-[13px] font-medium"
              :class="
                active === t.key
                  ? 'bg-[#3d342b] text-white hover:bg-[#3d342b] hover:text-white'
                  : 'text-paper-600 hover:bg-paper-100 hover:text-ink'
              "
              @click="active = t.key"
            >
              <span
                class="shrink-0 inline-flex items-center justify-center w-4 h-4"
                :class="active === t.key ? 'text-white' : 'text-paper-400'"
                v-html="icon(t.icon)"
              ></span>
              <span class="truncate">{{ t.label }}</span>
            </Button>
          </nav>
        </CardContent>
      </Card>
    </aside>

    <!-- 右侧内容区 -->
    <main class="flex-1 min-w-0 min-h-0 px-8 lg:px-10 py-8 overflow-x-hidden">
      <h1 class="text-2xl font-medium mb-6 text-ink">
        {{ tabs.find((t) => t.key === active)?.label }}
      </h1>

      <CategoryManager v-if="active === 'category'" />
      <ProductDefaultsSettings v-else-if="active === 'defaults'" />
      <CarpetaManager v-else-if="active === 'carpeta'" />
      <CompanyProfileForm v-else-if="active === 'company'" />
      <PdfTemplateSettings v-else-if="active === 'pdf'" />
      <SyncSettings v-else-if="active === 'sync'" />
      <AiSettings v-else-if="active === 'ai'" />
    </main>
  </div>
</template>
