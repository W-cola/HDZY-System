<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Tag,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteContractPaymentApi,
  getContractListApi,
  getContractPaymentListApi,
  saveContractPaymentApi,
} from '#/api';

const contracts = ref<any[]>([]);
const editing = ref<any>();
const detailOpen = ref(false);
const detailRow = ref<any>();
const form = ref<any>({});
const contractOptions = computed(() =>
  contracts.value.map((item) => ({
    label: `${item.contractName} · 项目编号：${item.projectNo || item.contractNo || '-'}`,
    value: item.id,
  })),
);

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    if (!form.value.paymentAmount || Number(form.value.paymentAmount) <= 0) {
      message.warning('请填写有效的回款金额');
      return;
    }
    drawerApi.lock();
    try {
      await saveContractPaymentApi({ ...form.value });
      message.success(editing.value?.id ? '回款记录已更新' : '回款记录已保存');
      drawerApi.close();
      gridApi.query();
    } finally {
      drawerApi.unlock();
    }
  },
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        component: 'Input',
        fieldName: 'keyword',
        label: '关键词',
        componentProps: {
          placeholder: '合同名称/项目编号/客户名称',
          allowClear: true,
        },
      },
      {
        component: 'Select',
        fieldName: 'paymentMethod',
        label: '回款方式',
        componentProps: {
          allowClear: true,
          placeholder: '全部方式',
          options: ['银行转账', '现金', '支票', '其他'].map((value) => ({
            label: value,
            value,
          })),
        },
      },
      {
        component: 'Select',
        fieldName: 'status',
        label: '状态',
        componentProps: {
          allowClear: true,
          placeholder: '全部状态',
          options: ['已到账', '待确认', '已作废'].map((value) => ({
            label: value,
            value,
          })),
        },
      },
    ],
  },
  gridOptions: {
    columns: [
      {
        field: 'contract',
        title: '合同/项目',
        minWidth: 220,
        formatter: ({ row }) =>
          `${row.contractName || '未关联合同'}${row.projectNo ? ` · ${row.projectNo}` : ''}`,
      },
      { field: 'customerName', title: '客户', minWidth: 160 },
      {
        field: 'paymentAmount',
        title: '回款金额',
        minWidth: 130,
        formatter: ({ cellValue }) =>
          `¥ ${Number(cellValue || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
      },
      { field: 'paymentDate', title: '回款日期', minWidth: 125 },
      { field: 'paymentMethod', title: '回款方式', minWidth: 120 },
      { field: 'paymentAccount', title: '收款账户', minWidth: 150 },
      {
        field: 'status',
        title: '状态',
        minWidth: 100,
        cellRender: {
          name: 'CellTag',
          options: [
            { label: '已到账', value: '已到账', color: 'success' },
            { label: '待确认', value: '待确认', color: 'warning' },
            { label: '已作废', value: '已作废', color: 'error' },
          ],
        },
      },
      {
        field: 'operation',
        title: '操作',
        width: 210,
        minWidth: 210,
        fixed: 'right',
        slots: { default: 'action' },
      },
    ],
    rowConfig: { keyField: 'id' },
    proxyConfig: {
      ajax: {
        query: async ({ page }, values: any) =>
          getContractPaymentListApi({
            ...values,
            page: page.currentPage,
            pageSize: page.pageSize,
          }),
      },
    },
    toolbarConfig: { refresh: true, zoom: true, custom: true },
  } as VxeTableGridOptions,
});

function view(row: any) {
  detailRow.value = row;
  detailOpen.value = true;
}
function remove(row: any) {
  Modal.confirm({
    title: '确认删除该回款记录？',
    onOk: async () => {
      await deleteContractPaymentApi(row.id);
      message.success('已删除');
      gridApi.query();
    },
  });
}
function open(row?: any) {
  editing.value = row;
  form.value = row
    ? { ...row }
    : {
        status: '已到账',
        paymentDate: new Date().toISOString().slice(0, 10),
      };
  drawerApi.open();
}

onMounted(async () => {
  const result = await getContractListApi({ page: 1, pageSize: 200 });
  contracts.value = result.items ?? [];
});
</script>

<template>
  <Page
    auto-content-height
    title="回款管理"
    description="登记项目回款，支持提前回款及后续补充合同、发票等信息。"
  >
    <Drawer :title="editing?.id ? '编辑回款' : '登记回款'">
      <Form layout="vertical" class="payment-form">
        <Form.Item label="关联合同（可后补）">
          <Select
            v-model:value="form.contractId"
            allow-clear
            show-search
            option-filter-prop="label"
            :options="contractOptions"
          />
        </Form.Item>
        <div class="grid grid-cols-2 gap-3">
          <Form.Item label="回款金额" required>
            <Input v-model:value="form.paymentAmount" type="number" />
          </Form.Item>
          <Form.Item label="回款日期">
            <Input v-model:value="form.paymentDate" type="date" />
          </Form.Item>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <Form.Item label="回款方式">
            <Select
              v-model:value="form.paymentMethod"
              allow-clear
              :options="
                ['银行转账', '现金', '支票', '其他'].map((value) => ({
                  label: value,
                  value,
                }))
              "
            />
          </Form.Item>
          <Form.Item label="收款账户">
            <Input v-model:value="form.paymentAccount" />
          </Form.Item>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <Form.Item label="回款单号">
            <Input v-model:value="form.receiptNo" />
          </Form.Item>
          <Form.Item label="状态">
            <Select
              v-model:value="form.status"
              :options="
                ['已到账', '待确认', '已作废'].map((value) => ({
                  label: value,
                  value,
                }))
              "
            />
          </Form.Item>
        </div>
        <Form.Item label="备注">
          <Input.TextArea v-model:value="form.remark" :rows="3" />
        </Form.Item>
      </Form>
    </Drawer>
    <Modal
      v-model:open="detailOpen"
      title="回款详情"
      :footer="null"
      width="760px"
      class="payment-detail-modal"
    >
      <template v-if="detailRow">
        <div class="payment-detail-hero">
          <div>
            <div class="payment-detail-eyebrow">项目回款记录</div>
            <div class="payment-detail-title">
              {{ detailRow.receiptNo || '未填写回款单号' }}
            </div>
            <div class="payment-detail-subtitle">
              {{ detailRow.contractName || '未关联合同' }} ·
              {{ detailRow.customerName || '—' }}
            </div>
          </div>
          <Tag
            :color="
              detailRow.status === '已到账'
                ? 'success'
                : detailRow.status === '已作废'
                  ? 'error'
                  : 'warning'
            "
            >
{{ detailRow.status || '待确认' }}
</Tag>
        </div>
        <div class="payment-detail-amount-card">
          <span>本次回款金额</span><strong>¥{{
              Number(detailRow.paymentAmount || 0).toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
              })
            }}</strong>
        </div>
        <div class="payment-detail-section">
          <div class="payment-detail-section-title">基本信息</div>
          <div class="payment-detail-grid">
            <div>
              <span>合同 / 项目</span><b>{{ detailRow.contractName || '未关联合同'
                }}{{
                  detailRow.projectNo ? ` · ${detailRow.projectNo}` : ''
                }}</b>
            </div>
            <div>
              <span>客户</span><b>{{ detailRow.customerName || '—' }}</b>
            </div>
            <div>
              <span>回款日期</span><b>{{ detailRow.paymentDate || '—' }}</b>
            </div>
            <div>
              <span>回款方式</span><b>{{ detailRow.paymentMethod || '—' }}</b>
            </div>
            <div>
              <span>收款账户</span><b>{{ detailRow.paymentAccount || '—' }}</b>
            </div>
            <div>
              <span>回款单号</span><b>{{ detailRow.receiptNo || '—' }}</b>
            </div>
          </div>
        </div>
        <div class="payment-detail-section" v-if="detailRow.remark">
          <div class="payment-detail-section-title">备注</div>
          <div class="payment-remark">{{ detailRow.remark }}</div>
        </div>
      </template>
    </Modal>
    <Grid table-title="回款列表">
      <template #toolbar-tools>
        <Button v-access:code="'payment:create'" type="primary" @click="open()">登记回款</Button>
      </template>
      <template #action="{ row }">
        <Space class="operation-actions" :size="4">
          <Button v-access:code="'payment:update'" type="link" size="small" @click="open(row)">编辑</Button>
          <Button type="link" size="small" @click="view(row)">详情</Button>
          <Button v-access:code="'payment:delete'" type="link" danger size="small" @click="remove(row)">
删除
</Button>
        </Space>
      </template>
    </Grid>
  </Page>
</template>

<style scoped>
.operation-actions {
  white-space: nowrap;
}

.payment-detail-hero {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 4px 0 20px;
}

.payment-detail-eyebrow {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0.04em;
}

.payment-detail-title {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.payment-detail-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.payment-detail-amount-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  margin-bottom: 4px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 45%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.payment-detail-amount-card strong {
  font-size: 24px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.payment-detail-section {
  padding: 18px 0;
  border-top: 1px solid hsl(var(--border));
}

.payment-detail-section-title {
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.payment-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 28px;
}

.payment-detail-grid div {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.payment-detail-grid span {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.payment-detail-grid b {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 400;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.payment-remark {
  padding: 12px 14px;
  line-height: 1.7;
  color: hsl(var(--foreground));
  white-space: pre-wrap;
  background: hsl(var(--muted) / 35%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

@media (max-width: 640px) {
  .payment-detail-grid {
    grid-template-columns: 1fr;
  }

  .payment-detail-amount-card {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}

.payment-form :deep(.ant-form-item) {
  margin-bottom: 16px;
}

.payment-form :deep(.ant-select),
.payment-form :deep(.ant-input),
.payment-form :deep(.ant-input-number),
.payment-form :deep(.ant-input-affix-wrapper) {
  width: 100%;
}
</style>
