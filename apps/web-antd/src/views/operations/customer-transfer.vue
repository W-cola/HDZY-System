<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Select,
  Statistic,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';

import {
  createCustomerTransferApi,
  getCustomerTransferHistoryApi,
  getTransferCustomersApi,
  getTransferUsersApi,
  reverseCustomerTransferApi,
} from '#/api';
const customers = ref<any[]>([]);
const users = ref<any[]>([]);
const selected = ref<string[]>([]);
const ownerId = ref();
const toOwnerId = ref();
const reason = ref('');
const remark = ref('');
const history = ref<any[]>([]);
const tab = ref('transfer');
const tablePagination = {
  pageSize: 10,
  pageSizeOptions: ['10', '20', '50', '100'],
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
};
const userOptions = computed(() =>
  users.value.map((x) => ({
    label: `${x.realName}（${x.username}）`,
    value: x.id,
  })),
);
const candidates = computed(() =>
  userOptions.value.filter((x) => x.value !== ownerId.value),
);
const selectedRows = computed(() =>
  customers.value.filter((x) => selected.value.includes(x.id)),
);
const stats = computed(() =>
  selectedRows.value.reduce(
    (a, x) => ({
      contacts: a.contacts + (x.contactCount || 0),
      followUps: a.followUps + (x.followUpCount || 0),
      opportunities: a.opportunities + (x.opportunityCount || 0),
    }),
    { contacts: 0, followUps: 0, opportunities: 0 },
  ),
);
async function load() {
  const [c, u, h] = await Promise.all([
    getTransferCustomersApi({
      page: 1,
      pageSize: 200,
      ownerId: ownerId.value,
    }),
    getTransferUsersApi(),
    getCustomerTransferHistoryApi({ page: 1, pageSize: 100 }),
  ]);
  customers.value = c.items ?? [];
  users.value = u.items ?? [];
  history.value = h.items ?? [];
  selected.value = [];
}
async function execute() {
  if (selected.value.length === 0 || !toOwnerId.value || !reason.value.trim()) {
    message.warning('请选择客户、接收负责人并填写移交原因');
    return;
  }
  await createCustomerTransferApi({
    customerIds: selected.value,
    fromOwnerId: ownerId.value,
    toOwnerId: toOwnerId.value,
    reason: reason.value,
    remark: remark.value,
  });
  message.success('客户移交已生效');
  reason.value = '';
  remark.value = '';
  await load();
}
function reverse(row: any) {
  Modal.confirm({
    title: '撤销客户移交',
    content: '仅当客户负责人未再次变化时可撤销，确认继续吗？',
    async onOk() {
      await reverseCustomerTransferApi(row.id, '管理员撤销移交');
      message.success('移交已撤销');
      await load();
    },
  });
}
onMounted(load);
</script>
<template>
  <Page
    auto-content-height
    title="客户移交"
    description="客户负责人调整与交接记录集中管理，历史跟进操作人保持不变。"
  >
    <Tabs v-model:active-key="tab">
      <Tabs.TabPane key="transfer" tab="发起移交">
        <Card title="选择移交范围" class="transfer-panel">
          <Form layout="vertical">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Form.Item label="原负责人">
                <Select
                  v-model:value="ownerId"
                  allow-clear
                  show-search
                  :options="userOptions"
                  @change="load"
                />
</Form.Item><Form.Item label="接收负责人" required>
                <Select
                  v-model:value="toOwnerId"
                  show-search
                  :options="candidates"
                />
</Form.Item><Form.Item label="已选客户">
                <div class="selected-count">
                  <strong>{{ selected.length }}</strong><span>家客户</span>
                </div>
              </Form.Item>
            </div>
</Form><Table
            :row-selection="{
              selectedRowKeys: selected,
              onChange: (keys: any) => (selected = keys),
            }"
            row-key="id"
            :data-source="customers"
            :pagination="tablePagination"
            :columns="[
              { title: '客户名称', dataIndex: 'name' },
              { title: '负责人', dataIndex: 'ownerName' },
              { title: '等级', dataIndex: 'level' },
              { title: '联系人', dataIndex: 'contactCount' },
              { title: '跟进', dataIndex: 'followUpCount' },
              { title: '进行中机会', dataIndex: 'opportunityCount' },
            ]"
          />
        </Card>
        <div class="transfer-stats mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <Statistic
              title="客户"
              :value="selected.length"
              suffix="家"
            />
</Card><Card>
            <Statistic
              title="联系人"
              :value="stats.contacts"
              suffix="人"
            />
</Card><Card>
            <Statistic
              title="跟进记录"
              :value="stats.followUps"
              suffix="条"
            />
</Card><Card>
            <Statistic
              title="进行中机会"
              :value="stats.opportunities"
              suffix="个"
            />
          </Card>
        </div>
        <Card title="交接说明" class="transfer-panel mt-4">
          <Form layout="vertical">
            <Form.Item label="移交原因" required>
              <Select
                v-model:value="reason"
                :options="
                  [
                    '离职交接',
                    '岗位调整',
                    '区域调整',
                    '部门调整',
                    '工作量平衡',
                    '临时代理',
                    '其他',
                  ].map((x) => ({ label: x, value: x }))
                "
              />
</Form.Item><Form.Item label="交接备注">
              <Input.TextArea
                v-model:value="remark"
                :rows="3"
                placeholder="填写客户风险、待办事项和交接重点"
              />
</Form.Item><Button
              type="primary"
              :disabled="!selected.length"
              @click="execute"
            >
              确认移交
            </Button>
          </Form>
        </Card>
</Tabs.TabPane><Tabs.TabPane key="history" tab="移交记录">
        <Table
          :data-source="history"
          :pagination="tablePagination"
          :columns="[
            { title: '原负责人', dataIndex: 'fromOwnerName' },
            { title: '新负责人', dataIndex: 'toOwnerName' },
            { title: '客户数', dataIndex: 'customerCount' },
            { title: '原因', dataIndex: 'reason' },
            { title: '状态', dataIndex: 'status' },
            { title: '生效时间', dataIndex: 'effectiveAt' },
            { title: '操作', key: 'action' },
          ]"
        >
          <template #bodyCell="{ column, record }">
            <Tag
              v-if="column.key === 'status'"
              :color="
                record.status === '已生效'
                  ? 'success'
                  : record.status === '已撤销'
                    ? 'default'
                    : 'warning'
              "
            >
              {{ record.status || '—' }}
            </Tag>
            <Button
              v-if="column.key === 'action' && record.status === '已生效'"
              type="link"
              @click="reverse(record)"
            >
              撤销
            </Button>
          </template>
        </Table>
      </Tabs.TabPane>
    </Tabs>
  </Page>
</template>
<style scoped>
.transfer-panel :deep(.ant-card-head) {
  border-bottom-color: hsl(var(--border));
}

.transfer-panel :deep(.ant-card-head-title) {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.transfer-panel :deep(.ant-card-body) {
  padding: 20px;
}

.selected-count {
  display: flex;
  gap: 6px;
  align-items: baseline;
  min-height: 32px;
  color: hsl(var(--muted-foreground));
}

.selected-count strong {
  font-size: 22px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.selected-count span {
  font-size: 13px;
}

.transfer-stats :deep(.ant-card) {
  background: hsl(var(--card));
  border-color: hsl(var(--border));
}

.transfer-stats :deep(.ant-statistic-title) {
  color: hsl(var(--muted-foreground));
}

.transfer-stats :deep(.ant-statistic-content) {
  color: hsl(var(--foreground));
}

:deep(.ant-table-thead > tr > th) {
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 55%);
}

:deep(.ant-table-tbody > tr > td) {
  color: hsl(var(--foreground));
  border-bottom-color: hsl(var(--border));
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: hsl(var(--muted) / 35%) !important;
}

:deep(.ant-tabs-tab) {
  color: hsl(var(--muted-foreground));
}

:deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: hsl(var(--foreground));
}
</style>
