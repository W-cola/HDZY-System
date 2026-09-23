<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Tag,
  Upload,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createContractInvoiceApi,
  deleteContractInvoiceApi,
  getContractInvoiceListApi,
  getContractListApi,
  getCustomerInvoiceProfilesApi,
  updateContractInvoiceApi,
  uploadContractInvoiceFileApi,
} from '#/api';

const contracts = ref<any[]>([]);
const profiles = ref<any[]>([]);
const open = ref(false);
const detailOpen = ref(false);
const detailRow = ref<any>();
const saving = ref(false);
const editing = ref<any>();
const form = ref<any>({ invoiceType: '进度款' });
const file = ref<any>();

const contractOptions = computed(() =>
  contracts.value.map((item) => ({
    label: `${item.contractNo || ''} · ${item.contractName || ''}`,
    value: item.id,
  })),
);
const profileOptions = computed(() =>
  profiles.value.map((item) => ({
    label: `${item.invoiceTitle || ''} · ${item.taxpayerNo || ''}`,
    value: item.id,
  })),
);
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        component: 'Input',
        fieldName: 'keyword',
        label: '关键词',
        componentProps: {
          allowClear: true,
          placeholder: '合同名称/合同编号/客户名称/发票号码',
        },
      },
      {
        component: 'Select',
        fieldName: 'invoiceType',
        label: '款项类型',
        componentProps: {
          allowClear: true,
          options: ['首付款', '进度款', '尾款', '质保金', '其他'].map(
            (label) => ({ label, value: label }),
          ),
        },
      },
    ],
  },
  gridOptions: {
    columns: [
      { field: 'contractName', title: '合同', minWidth: 220 },
      { field: 'customerName', title: '客户', minWidth: 170 },
      {
        field: 'invoiceAmount',
        title: '开票金额',
        minWidth: 135,
        slots: { default: 'invoiceAmount' },
      },
      { field: 'invoiceType', title: '款项类型', minWidth: 110 },
      { field: 'invoiceTitle', title: '发票资料', minWidth: 180 },
      { field: 'invoiceNo', title: '发票号码', minWidth: 150 },
      { field: 'issuedAt', title: '开票日期', minWidth: 120 },
      {
        field: 'fileName',
        title: '电子票据',
        minWidth: 180,
        slots: { default: 'fileName' },
      },
      {
        field: 'operation',
        title: '操作',
        fixed: 'right',
        width: 210,
        minWidth: 210,
        slots: { default: 'action' },
      },
    ],
    rowConfig: { keyField: 'id' },
    proxyConfig: {
      ajax: {
        query: async ({ page }, values: any) =>
          getContractInvoiceListApi({
            ...values,
            page: page.currentPage,
            pageSize: page.pageSize,
          }),
      },
    },
    toolbarConfig: { refresh: true, zoom: true, custom: true },
  } as VxeTableGridOptions,
});

async function chooseContract(contractId: any) {
  form.value.invoiceProfileId = undefined;
  profiles.value = [];
  const customerId = contracts.value.find(
    (item) => String(item.id) === String(contractId),
  )?.customerId;
  if (!customerId) return;
  const result = await getCustomerInvoiceProfilesApi({ customerId });
  profiles.value = result.items ?? [];
}

function view(row: any) {
  detailRow.value = row;
  detailOpen.value = true;
}
function edit(row: any) {
  editing.value = row;
  form.value = { ...row };
  file.value = row.fileName
    ? { name: row.fileName, id: row.fileId }
    : undefined;
  open.value = true;
}
async function remove(row: any) {
  Modal.confirm({
    title: '确认删除该发票记录？',
    onOk: async () => {
      await deleteContractInvoiceApi(row.id);
      message.success('已删除');
      gridApi.query();
    },
  });
}

function add() {
  editing.value = undefined;
  form.value = {
    invoiceType: '进度款',
    issuedAt: new Date().toISOString().slice(0, 10),
  };
  file.value = undefined;
  profiles.value = [];
  open.value = true;
}

async function beforeUpload(uploadedFile: File) {
  try {
    const result = await uploadContractInvoiceFileApi(uploadedFile);
    file.value = result;
    message.success('电子发票已上传');
  } catch (error: any) {
    message.error(error?.message || '上传失败');
  }
  return false;
}

async function save() {
  if (!form.value.contractId || !form.value.invoiceAmount) {
    message.warning('请填写合同和本次发票金额');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      ...form.value,
      fileId: file.value?.id || '',
      fileName: file.value?.name || '',
      fileSize: file.value?.size || 0,
    };
    if (editing.value?.id)
      await updateContractInvoiceApi(editing.value.id, payload);
    else await createContractInvoiceApi(payload);
    message.success('发票登记成功');
    open.value = false;
    gridApi.query();
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  const result = await getContractListApi({ page: 1, pageSize: 200 });
  contracts.value = result.items ?? [];
});
</script>

<template>
  <Page
    auto-content-height
    title="发票管理"
    description="登记合同开票款项，留存客户开票资料与电子票据。"
  >
    <Grid table-title="发票登记列表">
      <template #toolbar-tools>
        <Button v-access:code="'invoice:create'" type="primary" @click="add">登记发票</Button>
      </template>
      <template #invoiceAmount="{ row }">
        ¥{{
          Number(row.invoiceAmount || 0).toLocaleString('zh-CN', {
            minimumFractionDigits: 2,
          })
        }}
      </template>
      <template #fileName="{ row }">
        <Tag v-if="row.fileName" color="blue">{{ row.fileName }}</Tag>
        <span v-else>—</span>
      </template>
      <template #action="{ row }">
        <Space class="operation-actions" :size="4">
          <Button v-access:code="'invoice:update'" type="link" size="small" @click="edit(row)">编辑</Button>
          <Button type="link" size="small" @click="view(row)">详情</Button>
          <Button v-access:code="'invoice:delete'" type="link" danger size="small" @click="remove(row)">
删除
</Button>
        </Space>
      </template>
    </Grid>

    <Modal
      v-model:open="open"
      :title="editing?.id ? '编辑合同发票' : '登记合同发票'"
      :confirm-loading="saving"
      @ok="save"
    >
      <Form layout="vertical">
        <Form.Item label="合同" required>
          <Select
            v-model:value="form.contractId"
            show-search
            option-filter-prop="label"
            :options="contractOptions"
            placeholder="请选择合同"
            @change="chooseContract"
          />
        </Form.Item>
        <Form.Item label="客户开票资料">
          <Select
            v-model:value="form.invoiceProfileId"
            allow-clear
            :options="profileOptions"
            placeholder="请选择客户开票资料"
          />
        </Form.Item>
        <div class="grid grid-cols-2 gap-3">
          <Form.Item label="本次发票金额" required>
            <Input v-model:value="form.invoiceAmount" type="number" />
          </Form.Item>
          <Form.Item label="款项类型">
            <Select
              v-model:value="form.invoiceType"
              :options="
                ['首付款', '进度款', '尾款', '质保金', '其他'].map((x) => ({
                  label: x,
                  value: x,
                }))
              "
            />
          </Form.Item>
        </div>
        <Form.Item label="发票号码">
          <Input v-model:value="form.invoiceNo" />
        </Form.Item>
        <Form.Item label="开票日期">
          <Input v-model:value="form.issuedAt" type="date" />
        </Form.Item>
        <Form.Item label="电子发票（PDF/OFD/XML/压缩包）">
          <Upload :show-upload-list="false" :before-upload="beforeUpload">
            <Button>上传电子发票</Button>
          </Upload>
          <span class="ml-2 text-sm text-gray-500">{{
            file?.name || '未上传'
          }}</span>
        </Form.Item>
        <Form.Item label="备注">
          <Input.TextArea v-model:value="form.remark" :rows="3" />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="detailOpen"
      title="发票详情"
      :footer="null"
      width="760px"
      class="invoice-detail-modal"
    >
      <template v-if="detailRow">
        <div class="invoice-detail-hero">
          <div>
            <div class="invoice-detail-eyebrow">合同开票记录</div>
            <div class="invoice-detail-title">
              {{ detailRow.invoiceNo || '未填写发票号码' }}
            </div>
            <div class="invoice-detail-subtitle">
              {{ detailRow.contractName || '—' }} ·
              {{ detailRow.customerName || '—' }}
            </div>
          </div>
          <Tag color="blue">{{ detailRow.invoiceType || '其他' }}</Tag>
        </div>
        <div class="invoice-detail-amount-card">
          <span>本次开票金额</span>
          <strong>¥{{
              Number(detailRow.invoiceAmount || 0).toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
              })
            }}</strong>
        </div>
        <div class="invoice-detail-section">
          <div class="invoice-detail-section-title">基本信息</div>
          <div class="invoice-detail-grid">
            <div>
              <span>合同</span><b>{{ detailRow.contractName || '—' }}</b>
            </div>
            <div>
              <span>客户</span><b>{{ detailRow.customerName || '—' }}</b>
            </div>
            <div>
              <span>发票抬头</span><b>{{ detailRow.invoiceTitle || '—' }}</b>
            </div>
            <div>
              <span>发票号码</span><b>{{ detailRow.invoiceNo || '—' }}</b>
            </div>
            <div>
              <span>款项类型</span><b>{{ detailRow.invoiceType || '—' }}</b>
            </div>
            <div>
              <span>开票日期</span><b>{{ detailRow.issuedAt || '—' }}</b>
            </div>
          </div>
        </div>
        <div class="invoice-detail-section">
          <div class="invoice-detail-section-title">电子票据</div>
          <div class="invoice-file-card" v-if="detailRow.fileName">
            <div class="invoice-file-icon">PDF</div>
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">{{ detailRow.fileName }}</div>
              <div class="text-xs text-gray-500">电子发票附件</div>
            </div>
            <Tag color="green">已上传</Tag>
          </div>
          <div v-else class="invoice-empty">暂无电子票据附件</div>
        </div>
        <div class="invoice-detail-section" v-if="detailRow.remark">
          <div class="invoice-detail-section-title">备注</div>
          <div class="invoice-remark">{{ detailRow.remark }}</div>
        </div>
      </template>
    </Modal>
  </Page>
</template>

<style scoped>
.operation-actions {
  white-space: nowrap;
}

.invoice-detail-hero {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 4px 0 20px;
}

.invoice-detail-eyebrow {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0.04em;
}

.invoice-detail-title {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.invoice-detail-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.invoice-detail-amount-card {
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

.invoice-detail-amount-card strong {
  font-size: 24px;
  font-weight: 600;
  color: hsl(var(--foreground));
  letter-spacing: 0.01em;
}

.invoice-detail-section {
  padding: 18px 0;
  border-top: 1px solid hsl(var(--border));
}

.invoice-detail-section-title {
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.invoice-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 28px;
}

.invoice-detail-grid div {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.invoice-detail-grid span {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.invoice-detail-grid b {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 400;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.invoice-file-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  background: hsl(var(--muted) / 35%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.invoice-file-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.invoice-empty {
  padding: 14px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
  text-align: center;
  background: hsl(var(--muted) / 35%);
  border-radius: 8px;
}

.invoice-remark {
  padding: 12px 14px;
  line-height: 1.7;
  color: hsl(var(--foreground));
  white-space: pre-wrap;
  background: hsl(var(--muted) / 35%);
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

@media (max-width: 640px) {
  .invoice-detail-grid {
    grid-template-columns: 1fr;
  }

  .invoice-detail-amount-card {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>
