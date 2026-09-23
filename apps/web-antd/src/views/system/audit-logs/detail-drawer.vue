<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Descriptions, DescriptionsItem, Tag } from 'ant-design-vue';
const record = ref<any>({});
const [Drawer, drawerApi] = useVbenDrawer({
  destroyOnClose: true,
  onOpenChange(open) {
    if (open) record.value = drawerApi.getData() ?? {};
  },
});
const resultColor = computed(() =>
  record.value.result === '成功' ? 'success' : 'error',
);
defineExpose({ drawerApi });
</script>
<template>
  <Drawer title="操作日志详情" class="w-full max-w-180">
    <Descriptions bordered :column="1" size="small">
      <DescriptionsItem label="操作时间">
        {{ record.createdAt || '-' }}
</DescriptionsItem><DescriptionsItem label="操作人">
        {{ record.operator || '-' }}
</DescriptionsItem><DescriptionsItem label="业务模块">
        {{ record.module || '-' }}
</DescriptionsItem><DescriptionsItem label="操作类型">
        {{ record.action || '-' }}
</DescriptionsItem><DescriptionsItem label="操作对象">
        {{ record.target || '-' }}
</DescriptionsItem><DescriptionsItem label="执行结果">
        <Tag :color="resultColor">
          {{ record.result || '-' }}
        </Tag>
</DescriptionsItem><DescriptionsItem label="IP地址">{{ record.ip || '-' }}</DescriptionsItem><DescriptionsItem label="详细信息">
        {{ record.detail || '-' }}
      </DescriptionsItem>
    </Descriptions>
  </Drawer>
</template>
