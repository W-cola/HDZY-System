<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Card,
  Empty,
  message,
  Progress,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'ant-design-vue';

import { getSalesAnalyticsApi } from '#/api';

const loading = ref(true);
const data = ref<any>({ summary: {}, stages: [], owners: [] });
const summary = computed(() => data.value.summary || {});
const stageColumns = [
  { title: '销售阶段', dataIndex: 'stage', key: 'stage' },
  { title: '机会数量', dataIndex: 'count', key: 'count' },
  { title: '预计金额', dataIndex: 'amount', key: 'amount' },
];
const ownerColumns = [
  { title: '负责人', dataIndex: 'name', key: 'name' },
  { title: '机会数量', dataIndex: 'count', key: 'count' },
  { title: '预计金额', dataIndex: 'amount', key: 'amount' },
];
const maxStageCount = computed(() =>
  Math.max(...(data.value.stages || []).map((x: any) => Number(x.count)), 1),
);
function money(value: any) {
  return `¥${Number(value || 0).toLocaleString('zh-CN')}`;
}
async function load() {
  loading.value = true;
  try {
    const result: any = await getSalesAnalyticsApi();
    data.value = result?.data || result || data.value;
  } catch (error: any) {
    message.error(error?.message || '销售分析数据加载失败');
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <Page
    title="销售分析"
    description="基于现有销售机会数据，快速查看销售漏斗和负责人业绩概况。"
  >
    <Spin :spinning="loading">
      <div class="space-y-4 p-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
<Statistic
              title="销售机会总数"
              :value="summary.opportunityCount || 0"
              suffix="条"
          />
</Card>
          <Card>
<Statistic
              title="销售管道金额"
              :value="Number(summary.pipelineAmount || 0)"
              :formatter="({ value }: any) => money(value)"
          />
</Card>
          <Card>
<Statistic
              title="进行中机会"
              :value="summary.activeCount || 0"
              suffix="条"
          />
</Card>
          <Card>
<Statistic
              title="赢单/完成"
              :value="summary.wonCount || 0"
              suffix="条"
          />
</Card>
        </div>
        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card title="销售漏斗概览">
            <Empty v-if="!data.stages?.length" description="暂无销售机会数据" />
            <div v-else class="space-y-4">
              <div v-for="item in data.stages" :key="item.stage">
                <div class="mb-1 flex items-center justify-between text-sm">
                  <span>{{ item.stage }}</span><span class="text-muted-foreground">{{ item.count }} 条 · {{ money(item.amount) }}</span>
                </div>
                <Progress
                  :percent="
                    Math.round((Number(item.count) / maxStageCount) * 100)
                  "
                  :show-info="false"
                />
              </div>
            </div>
          </Card>
          <Card title="负责人机会分布">
            <Table
              :columns="ownerColumns"
              :data-source="data.owners"
              :pagination="false"
              row-key="name"
              size="small"
            >
              <template #bodyCell="{ column, record }">
<template v-if="column.dataIndex === 'amount'">
<Tag color="blue">{{ money(record.amount) }}</Tag>
</template>
</template>
            </Table>
          </Card>
        </div>
        <Card title="阶段明细">
<Table
            :columns="stageColumns"
            :data-source="data.stages"
            :pagination="false"
            row-key="stage"
        />
</Card>
      </div>
    </Spin>
  </Page>
</template>
