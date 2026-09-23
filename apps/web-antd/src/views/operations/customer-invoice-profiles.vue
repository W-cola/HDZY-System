<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Select,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createCustomerInvoiceProfileApi,
  getCustomerInvoiceProfilesApi,
  getCustomerListApi,
} from '#/api';

const customers = ref<any[]>([]);
const selectedCustomerId = ref<string>();
const profiles = ref<any[]>([]);
const loading = ref(false);
const modalOpen = ref(false);
const saving = ref(false);
const form = ref<any>({ invoiceType: '增值税普通发票' });
const selectedCustomer = computed(() =>
  customers.value.find(
    (item) => String(item.id) === String(selectedCustomerId.value),
  ),
);
const currentProfile = computed(() =>
  profiles.value.find((item) => item.isCurrent),
);
const historyProfiles = computed(() =>
  profiles.value.filter((item) => !item.isCurrent),
);
const profileColumns = [
  { title: '版本状态', key: 'status', width: 110 },
  {
    title: '发票抬头',
    dataIndex: 'invoiceTitle',
    key: 'invoiceTitle',
    width: 220,
  },
  {
    title: '纳税人识别号',
    dataIndex: 'taxpayerNo',
    key: 'taxpayerNo',
    width: 190,
  },
  {
    title: '发票类型',
    dataIndex: 'invoiceType',
    key: 'invoiceType',
    width: 150,
  },
  {
    title: '生效日期',
    dataIndex: 'effectiveFrom',
    key: 'effectiveFrom',
    width: 130,
  },
  {
    title: '失效日期',
    dataIndex: 'effectiveTo',
    key: 'effectiveTo',
    width: 130,
  },
  {
    title: '接收邮箱',
    dataIndex: 'invoiceEmail',
    key: 'invoiceEmail',
    ellipsis: true,
  },
];

async function loadProfiles(customerId = selectedCustomerId.value) {
  if (!customerId) {
    profiles.value = [];
    return;
  }
  loading.value = true;
  try {
    const result = await getCustomerInvoiceProfilesApi({ customerId });
    profiles.value = result.items ?? [];
  } finally {
    loading.value = false;
  }
}
async function loadCustomers() {
  // 后端分页上限为 200，避免进入页面时因 pageSize=1000 触发 VALIDATION_ERROR。
  const result = await getCustomerListApi({ page: 1, pageSize: 200 });
  customers.value = result.items ?? [];
  if (!selectedCustomerId.value && customers.value.length > 0) {
    selectedCustomerId.value = String(customers.value[0].id);
    await loadProfiles();
  }
}
function openCreate() {
  if (!selectedCustomerId.value) {
    message.warning('请先选择客户');
    return;
  }
  form.value = { invoiceType: '增值税普通发票' };
  modalOpen.value = true;
}
async function saveProfile() {
  if (!form.value.invoiceTitle?.trim() || !form.value.taxpayerNo?.trim()) {
    message.warning('请填写发票抬头和纳税人识别号');
    return;
  }
  saving.value = true;
  try {
    await createCustomerInvoiceProfileApi({
      ...form.value,
      customerId: selectedCustomerId.value,
    });
    message.success('开票信息已保存，原当前资料已转为历史');
    modalOpen.value = false;
    await loadProfiles();
  } finally {
    saving.value = false;
  }
}
onMounted(loadCustomers);
</script>

<template>
  <Page title="客户开票信息管理">
    <div class="p-4">
      <div
        class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
      >
        <div class="flex items-center gap-3">
          <span class="text-sm text-muted-foreground">客户单位</span><Select
            v-model:value="selectedCustomerId"
            class="w-80"
            show-search
            option-filter-prop="label"
            placeholder="请选择客户"
            :options="
              customers.map((item) => ({
                label: item.name,
                value: String(item.id),
              }))
            "
            @change="
              (value: any) => {
                selectedCustomerId = String(value || '');
                loadProfiles(selectedCustomerId);
              }
            "
          />
        </div>
        <Button v-access:code="'customer:invoice-profile:create'" type="primary" @click="openCreate">新增开票信息</Button>
      </div>
      <Empty v-if="!selectedCustomer" description="请选择客户查看开票信息" />
      <template v-else>
        <div class="mb-4 flex items-center justify-between">
          <div>
            <div class="text-lg font-medium">{{ selectedCustomer.name }}</div>
            <div class="mt-1 text-sm text-muted-foreground">
              开票资料版本记录
            </div>
          </div>
          <Tag v-if="currentProfile" color="success">已有当前有效资料</Tag><Tag v-else>尚未建立开票资料</Tag>
        </div>
        <section
          v-if="currentProfile"
          class="invoice-current-panel mb-5 overflow-hidden rounded-lg border border-border bg-card"
        >
          <div
            class="invoice-panel-heading flex items-center justify-between border-b border-border px-5 py-4"
          >
            <div>
              <div class="text-base font-medium">当前有效资料</div>
              <div class="mt-1 text-sm text-muted-foreground">
                当前合同和开票业务默认使用此版本
              </div>
            </div>
            <Tag color="success">当前有效</Tag>
          </div>
          <div
            class="invoice-summary grid grid-cols-1 gap-x-8 gap-y-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-4"
          >
            <div class="invoice-summary-item">
              <span class="invoice-label">发票抬头</span><span class="invoice-value">{{
                currentProfile.invoiceTitle
              }}</span>
            </div>
            <div class="invoice-summary-item">
              <span class="invoice-label">纳税人识别号</span><span class="invoice-value">{{
                currentProfile.taxpayerNo
              }}</span>
            </div>
            <div class="invoice-summary-item">
              <span class="invoice-label">发票类型</span><span class="invoice-value">{{
                currentProfile.invoiceType || '—'
              }}</span>
            </div>
            <div class="invoice-summary-item">
              <span class="invoice-label">接收邮箱</span><span class="invoice-value">{{
                currentProfile.invoiceEmail || '—'
              }}</span>
            </div>
            <div class="invoice-summary-item invoice-summary-address">
              <span class="invoice-label">注册地址</span><span class="invoice-value">{{
                currentProfile.registeredAddress || '—'
              }}</span>
            </div>
            <div class="invoice-summary-item">
              <span class="invoice-label">注册电话</span><span class="invoice-value">{{
                currentProfile.registeredPhone || '—'
              }}</span>
            </div>
            <div class="invoice-summary-item">
              <span class="invoice-label">开户银行</span><span class="invoice-value">{{
                currentProfile.bankName || '—'
              }}</span>
            </div>
            <div class="invoice-summary-item">
              <span class="invoice-label">银行账号</span><span class="invoice-value">{{
                currentProfile.bankAccount || '—'
              }}</span>
            </div>
          </div>
        </section>
        <section
          class="invoice-history-panel overflow-hidden rounded-lg border border-border bg-card"
        >
          <div
            class="flex items-center justify-between border-b border-border px-5 py-4"
          >
            <div>
              <div class="text-base font-medium">历史版本</div>
              <div class="mt-1 text-sm text-muted-foreground">
                保留资料变更记录，历史合同使用的快照不会受影响
              </div>
            </div>
            <span class="text-sm text-muted-foreground">共 {{ historyProfiles.length }} 个版本</span>
          </div>
          <Table
            :columns="profileColumns"
            :data-source="historyProfiles"
            :loading="loading"
            :pagination="false"
            :scroll="{ x: 1060 }"
            row-key="id"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
<Tag v-if="column.key === 'status'" color="default">历史版本</Tag><span v-else-if="column.key === 'invoiceEmail'">{{
                record.invoiceEmail || '—'
              }}</span>
</template>
            <template #emptyText><Empty description="暂无历史版本" /></template>
          </Table>
        </section>
      </template>
    </div>
    <Modal
      v-model:open="modalOpen"
      title="新增开票信息"
      :confirm-loading="saving"
      ok-text="保存"
      cancel-text="取消"
      @ok="saveProfile"
    >
      <Form layout="vertical" class="pt-2">
<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Form.Item label="发票抬头" required>
<Input
              v-model:value="form.invoiceTitle"
              placeholder="请输入发票抬头"
/>
</Form.Item><Form.Item label="纳税人识别号" required>
<Input
              v-model:value="form.taxpayerNo"
              placeholder="请输入纳税人识别号"
/>
</Form.Item><Form.Item label="发票类型">
<Select
              v-model:value="form.invoiceType"
              :options="[
                { label: '增值税普通发票', value: '增值税普通发票' },
                { label: '增值税专用发票', value: '增值税专用发票' },
              ]"
/>
</Form.Item><Form.Item label="接收邮箱">
<Input
              v-model:value="form.invoiceEmail"
              placeholder="请输入接收邮箱"
/>
</Form.Item><Form.Item label="注册地址">
<Input v-model:value="form.registeredAddress" />
</Form.Item><Form.Item label="注册电话">
<Input v-model:value="form.registeredPhone" />
</Form.Item><Form.Item label="开户银行">
<Input v-model:value="form.bankName" />
</Form.Item><Form.Item label="银行账号">
<Input v-model:value="form.bankAccount" />
</Form.Item><Form.Item label="变更原因" class="md:col-span-2">
<Input v-model:value="form.changeReason" placeholder="可选" />
</Form.Item>
</div>
</Form>
    </Modal>
  </Page>
</template>

<style scoped>
.invoice-summary-item {
  min-width: 0;
}

@media (min-width: 1280px) {
  .invoice-summary-address {
    grid-column: span 1;
  }
}

.invoice-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.invoice-value {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  line-height: 1.5;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

:deep(.ant-table-thead > tr > th) {
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 55%);
}

:deep(.ant-table-tbody > tr > td) {
  border-color: hsl(var(--border));
}
</style>
