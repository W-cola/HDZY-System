<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Tag,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createOpportunityApi,
  deleteOpportunityApi,
  getContactListApi,
  getCustomerListApi,
  getOpportunityListApi,
  getSalesUserOptionsApi,
  OPPORTUNITY_STAGES,
  updateOpportunityApi,
} from '#/api';

const editing = ref<any>();
const detail = ref<any>();
const form = ref<any>({});
const customers = ref<any[]>([]);
const contacts = ref<any[]>([]);
const salesUsers = ref<any[]>([]);
const ownerOptions = () =>
  salesUsers.value.map((x) => ({
    label: x.realName,
    value: String(x.id),
  }));
const stageOptions = () =>
  OPPORTUNITY_STAGES.map((x) => ({ label: x, value: x }));
const statusOptions = () =>
  ['进行中', '暂停', '赢单', '丢单'].map((x) => ({ label: x, value: x }));
const sourceOptions = () =>
  ['官网咨询', '客户转介绍', '行业展会', '主动开发', '合作伙伴', '其他'].map(
    (x) => ({ label: x, value: x }),
  );
const filterValue = (value: any): string | undefined => {
  if (Array.isArray(value)) return filterValue(value[0]);
  if (value && typeof value === 'object') {
    return filterValue(value.value ?? value.id ?? value.key);
  }
  const normalized =
    value === undefined || value === null ? '' : String(value).trim();
  return normalized || undefined;
};
async function loadOptions() {
  const [c, p] = await Promise.all([
    getCustomerListApi({ page: 1, pageSize: 200 }),
    getContactListApi({ page: 1, pageSize: 200 }),
  ]);
  customers.value = c.items ?? [];
  contacts.value = p.items ?? [];
}
const contactsForCustomer = () =>
  contacts.value.filter((x) => x.customerId === form.value.customerId);
const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    if (!form.value.customerId || !form.value.name?.trim()) {
      message.warning('请选择所属客户并填写机会名称');
      return;
    }
    if (form.value.status === '丢单' && !form.value.lostReason?.trim()) {
      message.warning('丢单必须填写丢单原因');
      return;
    }
    drawerApi.lock();
    try {
      editing.value?.id
        ? await updateOpportunityApi(editing.value.id, form.value)
        : await createOpportunityApi(form.value);
      message.success('销售机会已保存');
      gridApi.query();
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
});
function open(row?: any) {
  editing.value = row;
  form.value = row
    ? { ...row }
    : {
        stage: '初步接触',
        status: '进行中',
        probability: 10,
        amount: 0,
      };
  void loadOptions();
  drawerApi.open();
}
const [DetailDrawer, detailApi] = useVbenDrawer({
  destroyOnClose: true,
  showConfirmButton: false,
  showCancelButton: false,
  onOpenChange(open) {
    if (open) detail.value = detailApi.getData() ?? null;
  },
});
function openDetail(row: any) {
  detailApi.setData(row);
  detailApi.open();
}
function remove(row: any) {
  Modal.confirm({
    title: '删除销售机会',
    content: `确认删除“${row.name}”吗？删除后记录将移入回收站。`,
    async onOk() {
      await deleteOpportunityApi(row.id);
      message.success('销售机会已删除');
      gridApi.query();
    },
  });
}
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        component: 'Input',
        fieldName: 'keyword',
        label: '关键词',
        componentProps: { allowClear: true, placeholder: '机会名称/客户名称' },
      },
      {
        component: 'Select',
        fieldName: 'ownerId',
        label: '负责人',
        componentProps: {
          allowClear: true,
          showSearch: true,
          optionFilterProp: 'label',
          placeholder: '全部负责人',
          options: ownerOptions(),
        },
      },
      {
        component: 'Select',
        fieldName: 'stageFilter',
        label: '阶段',
        componentProps: { allowClear: true, options: [] },
      },
      {
        component: 'Select',
        fieldName: 'statusFilter',
        label: '状态',
        componentProps: { allowClear: true, options: [] },
      },
      {
        component: 'Select',
        fieldName: 'sourceFilter',
        label: '机会来源',
        componentProps: { allowClear: true, options: [] },
      },
      {
        component: 'InputNumber',
        fieldName: 'amountMin',
        label: '金额下限',
        componentProps: { min: 0, precision: 2, placeholder: '最低金额' },
      },
      {
        component: 'InputNumber',
        fieldName: 'amountMax',
        label: '金额上限',
        componentProps: { min: 0, precision: 2, placeholder: '最高金额' },
      },
      {
        component: 'DatePicker',
        fieldName: 'expectedCloseMonth',
        label: '预计签约月份',
        componentProps: {
          allowClear: true,
          picker: 'month',
          format: 'YYYY-MM',
          valueFormat: 'YYYY-MM',
          placeholder: '请选择年月',
        },
      },
    ],
  },
  gridOptions: {
    columns: [
      { field: 'name', title: '机会名称', minWidth: 210 },
      { field: 'customerName', title: '所属客户', minWidth: 210 },
      { field: 'stage', title: '当前阶段', minWidth: 120 },
      { field: 'status', title: '状态', minWidth: 90 },
      { field: 'amount', title: '预计金额', minWidth: 120 },
      { field: 'probability', title: '赢单概率', minWidth: 100 },
      { field: 'expectedCloseDate', title: '预计签约', minWidth: 120 },
      { field: 'ownerName', title: '负责人', minWidth: 100 },
      {
        field: 'operation',
        title: '操作',
        fixed: 'right',
        minWidth: 190,
        slots: { default: 'action' },
      },
    ],
    rowConfig: { keyField: 'id' },
    proxyConfig: {
      ajax: {
        query: async ({ page }, values: any) => {
          const stage = filterValue(values.stageFilter);
          const status = filterValue(values.statusFilter);
          const source = filterValue(values.sourceFilter);
          return getOpportunityListApi({
            ...values,
            ownerId: filterValue(values.ownerId),
            stage: stage || undefined,
            status: status || undefined,
            source: source || undefined,
            amountMin: values.amountMin ?? undefined,
            amountMax: values.amountMax ?? undefined,
            expectedCloseMonth: filterValue(values.expectedCloseMonth),
            page: page.currentPage,
            pageSize: page.pageSize,
          });
        },
      },
    },
    toolbarConfig: { refresh: true, zoom: true, custom: true },
  } as VxeTableGridOptions,
});
onMounted(async () => {
  const result = await getSalesUserOptionsApi();
  salesUsers.value = result.items ?? [];
  await gridApi.formApi.updateSchema([
    { fieldName: 'ownerId', componentProps: { options: ownerOptions() } },
    { fieldName: 'stageFilter', componentProps: { options: stageOptions() } },
    { fieldName: 'statusFilter', componentProps: { options: statusOptions() } },
    { fieldName: 'sourceFilter', componentProps: { options: sourceOptions() } },
  ]);
});
</script>
<template>
  <Page
    auto-content-height
    title="销售机会"
    description="管理客户商机、销售阶段、预计金额和推进计划。客户单位、联系人、跟进记录仍保持独立平级入口。"
  >
    <Drawer :title="editing?.id ? '编辑销售机会' : '新增销售机会'">
      <Form layout="vertical" class="p-2">
        <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item label="机会名称" required>
            <Input
              v-model:value="form.name"
              placeholder="如：档案数字化一期"
            />
</Form.Item><Form.Item label="所属客户" required>
            <Select
              v-model:value="form.customerId"
              show-search
              option-filter-prop="label"
              class="w-full"
              :options="
                customers.map((x: any) => ({ label: x.name, value: x.id }))
              "
              @change="form.primaryContactId = undefined"
            />
</Form.Item><Form.Item label="主要联系人">
            <Select
              v-model:value="form.primaryContactId"
              allow-clear
              show-search
              option-filter-prop="label"
              class="w-full"
              :options="
                contactsForCustomer().map((x: any) => ({
                  label: `${x.name}（${x.position || '未填写职务'}）`,
                  value: x.id,
                }))
              "
            />
</Form.Item><Form.Item label="当前阶段">
            <Select
              v-model:value="form.stage"
              class="w-full"
              :options="OPPORTUNITY_STAGES.map((x) => ({ label: x, value: x }))"
            />
</Form.Item><Form.Item label="状态">
            <Select
              v-model:value="form.status"
              class="w-full"
              :options="statusOptions()"
            />
</Form.Item><Form.Item label="预计金额">
            <InputNumber
              v-model:value="form.amount"
              :min="0"
              class="w-full"
            />
</Form.Item><Form.Item label="赢单概率">
            <InputNumber
              v-model:value="form.probability"
              :min="0"
              :max="100"
              addon-after="%"
              class="w-full"
            />
</Form.Item><Form.Item label="预计签约日期">
            <Input
              v-model:value="form.expectedCloseDate"
              placeholder="YYYY-MM-DD"
            />
</Form.Item><Form.Item v-if="form.status === '丢单'" label="丢单原因" required>
            <Input v-model:value="form.lostReason" />
</Form.Item><Form.Item label="下一步计划" class="md:col-span-2">
            <Input v-model:value="form.nextPlan" />
</Form.Item><Form.Item label="机会描述" class="md:col-span-2">
            <Input.TextArea v-model:value="form.description" :rows="4" />
          </Form.Item>
        </div>
      </Form>
    </Drawer>
    <DetailDrawer title="销售机会详情" class="opportunity-detail-drawer">
      <template v-if="detail">
        <div class="mb-5 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-lg font-semibold text-foreground">
              {{ detail.name || '销售机会' }}
            </div>
            <div class="mt-1 text-sm text-muted-foreground">
              机会详情与推进信息
            </div>
          </div>
          <Tag
            :color="
              detail.status === '赢单'
                ? 'success'
                : detail.status === '丢单'
                  ? 'error'
                  : 'processing'
            "
            >
{{ detail.status || '未设置状态' }}
</Tag>
        </div>
        <Card size="small" class="mb-4">
          <div class="mb-3 text-sm font-medium text-foreground">机会概览</div>
          <Descriptions bordered :column="1" size="small">
            <Descriptions.Item label="所属客户">
{{
              detail.customerName || '—'
            }}
</Descriptions.Item>
            <Descriptions.Item label="主要联系人">
{{
              detail.primaryContactName || '—'
            }}
</Descriptions.Item>
            <Descriptions.Item label="当前阶段">
{{
              detail.stage || '—'
            }}
</Descriptions.Item>
            <Descriptions.Item label="机会来源">
{{
              detail.source || '—'
            }}
</Descriptions.Item>
          </Descriptions>
        </Card>
        <Card size="small" class="mb-4">
          <div class="mb-3 text-sm font-medium text-foreground">金额与计划</div>
          <Descriptions bordered :column="1" size="small">
            <Descriptions.Item label="预计金额">
¥
              {{
                Number(detail.amount || 0).toLocaleString('zh-CN', {
                  minimumFractionDigits: 2,
                })
              }}
</Descriptions.Item>
            <Descriptions.Item label="赢单概率">
{{ detail.probability ?? '—' }}%
</Descriptions.Item>
            <Descriptions.Item label="预计签约日期">
{{
              detail.expectedCloseDate || '—'
            }}
</Descriptions.Item>
            <Descriptions.Item label="负责人">
{{
              detail.ownerName || '—'
            }}
</Descriptions.Item>
          </Descriptions>
        </Card>
        <Card size="small" class="mb-4">
          <div class="mb-3 text-sm font-medium text-foreground">推进信息</div>
          <div class="space-y-3">
            <div class="rounded-lg border border-border bg-muted/20 p-4">
              <div class="mb-2 text-sm text-muted-foreground">下一步计划</div>
              <div
                class="whitespace-pre-wrap text-sm leading-6 text-foreground"
              >
                {{ detail.nextPlan || '—' }}
              </div>
            </div>
            <div class="rounded-lg border border-border bg-muted/20 p-4">
              <div class="mb-2 text-sm text-muted-foreground">机会描述</div>
              <div
                class="whitespace-pre-wrap text-sm leading-6 text-foreground"
              >
                {{ detail.description || '—' }}
              </div>
            </div>
            <div
              v-if="detail.status === '丢单'"
              class="rounded-lg border border-red-200 bg-red-50 p-4"
            >
              <div class="mb-2 text-sm text-red-600">丢单原因</div>
              <div class="whitespace-pre-wrap text-sm leading-6 text-red-700">
                {{ detail.lostReason || '—' }}
              </div>
            </div>
          </div>
        </Card>
      </template>
    </DetailDrawer>
    <Grid table-title="销售机会列表">
      <template #toolbar-tools>
        <Button v-access:code="'opportunity:create'" type="primary" @click="open()">新增销售机会</Button>
</template><template #action="{ row }">
        <Space>
          <Button v-access:code="'opportunity:update'" type="link" size="small" @click="open(row)">编辑</Button>
          <Button type="link" size="small" @click="openDetail(row)">
            详情
          </Button>
          <Button v-access:code="'opportunity:delete'" type="link" danger size="small" @click="remove(row)">
            删除
          </Button>
        </Space>
      </template>
    </Grid>
  </Page>
</template>
