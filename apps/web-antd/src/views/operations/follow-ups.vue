<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, nextTick, onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  Button,
  Descriptions,
  Empty,
  message,
  Modal,
  Space,
  Tag,
} from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  createFollowUpApi,
  deleteFollowUpApi,
  getContactListApi,
  getCustomerListApi,
  getFollowUpListApi,
  getOpportunityListApi,
  getSalesUserOptionsApi,
  updateFollowUpApi,
} from '#/api';

const editing = ref<any>();
const detail = ref<any>();
const customers = ref<any[]>([]);
const contacts = ref<any[]>([]);
const selectedCustomerId = ref<string>();
const opportunities = ref<any[]>([]);
const salesUsers = ref<any[]>([]);
const ownerOptions = () =>
  salesUsers.value.map((x) => ({ label: x.realName, value: x.id }));
const opportunityOptions = computed(() =>
  opportunities.value
    .filter(
      (x) =>
        !selectedCustomerId.value || x.customerId === selectedCustomerId.value,
    )
    .map((x) => ({ label: `${x.name} · ${x.stage}`, value: x.id })),
);
const customerOptions = computed(() =>
  customers.value.map((x) => ({ label: x.name, value: x.id })),
);
const contactOptions = computed(() =>
  contacts.value
    .filter(
      (x) =>
        !selectedCustomerId.value || x.customerId === selectedCustomerId.value,
    )
    .map((x) => ({
      label: `${x.name}（${x.position || '未填写职务'}）· ${x.customerName || '未关联客户'}`,
      value: x.id,
      customerId: x.customerId,
    })),
);

function syncCustomerFromContact(contactId: string | undefined) {
  const contact = contacts.value.find((item) => item.id === contactId);
  if (contact?.customerId) {
    selectedCustomerId.value = contact.customerId;
    void formApi.setFieldValue('customerId', contact.customerId);
  }
}

async function clearContactWhenCustomerChanges(customerId: string | undefined) {
  selectedCustomerId.value = customerId;
  const values: any = await formApi.getValues();
  const currentContactId = values.contactId;
  if (!currentContactId) return;
  const contact = contacts.value.find((item) => item.id === currentContactId);
  if (contact && contact.customerId !== customerId) {
    await formApi.setFieldValue('contactId', undefined);
  }
}

const formSchema = (): VbenFormSchema[] => [
  {
    component: 'Select',
    fieldName: 'customerId',
    label: '所属客户',
    rules: 'selectRequired',
    formItemClass: 'md:col-span-2',
    componentProps: {
      options: customerOptions,
      showSearch: true,
      optionFilterProp: 'label',
      class: 'w-full',
      onChange: (value: string) => clearContactWhenCustomerChanges(value),
    },
  },
  {
    component: 'Select',
    fieldName: 'contactId',
    label: '关联联系人',
    formItemClass: 'md:col-span-2',
    componentProps: {
      options: contactOptions,
      allowClear: true,
      showSearch: true,
      optionFilterProp: 'label',
      class: 'w-full',
      onChange: (value: string | undefined) => syncCustomerFromContact(value),
      filterOption: (input: string, option: any) =>
        String(option?.label ?? '')
          .toLowerCase()
          .includes(input.toLowerCase()),
    },
  },
  {
    component: 'Select',
    fieldName: 'opportunityId',
    label: '关联销售机会',
    formItemClass: 'md:col-span-2',
    componentProps: {
      options: opportunityOptions,
      allowClear: true,
      showSearch: true,
      optionFilterProp: 'label',
      class: 'w-full',
    },
  },
  {
    component: 'DatePicker',
    fieldName: 'followUpTime',
    label: '跟进时间',
    rules: 'required',
    componentProps: { showTime: true, class: 'w-full' },
  },
  {
    component: 'Select',
    fieldName: 'followUpType',
    label: '跟进方式',
    componentProps: {
      options: [
        '电话沟通',
        '微信沟通',
        '邮件沟通',
        '上门拜访',
        '产品演示',
        '需求确认',
        '报价沟通',
        '其他',
      ].map((label) => ({ label, value: label })),
      class: 'w-full',
    },
  },
  {
    component: 'Input',
    fieldName: 'subject',
    label: '跟进主题',
    rules: 'required',
  },
  {
    component: 'Select',
    fieldName: 'intentionLevel',
    label: '客户意向',
    componentProps: {
      options: ['高', '中', '低', '暂无意向'].map((label) => ({
        label,
        value: label,
      })),
      class: 'w-full',
    },
  },
  {
    component: 'Select',
    fieldName: 'status',
    label: '跟进状态',
    componentProps: {
      options: ['待跟进', '已完成', '已取消'].map((label) => ({
        label,
        value: label,
      })),
      class: 'w-full',
    },
  },
  {
    component: 'DatePicker',
    fieldName: 'nextFollowTime',
    label: '下次跟进时间',
    componentProps: { showTime: true, allowClear: true, class: 'w-full' },
  },
  {
    component: 'Textarea',
    fieldName: 'content',
    label: '跟进内容',
    rules: 'required',
    formItemClass: 'md:col-span-2',
    componentProps: { rows: 4 },
  },
  { component: 'Input', fieldName: 'result', label: '跟进结果' },
  { component: 'Input', fieldName: 'nextPlan', label: '下一步计划' },
  {
    component: 'Textarea',
    fieldName: 'remark',
    label: '备注',
    formItemClass: 'md:col-span-2',
    componentProps: { rows: 3 },
  },
];

const [Form, formApi] = useVbenForm({
  schema: formSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 gap-x-5 md:grid-cols-2',
});
const [Drawer, drawerApi] = useVbenDrawer({
  destroyOnClose: true,
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values: any = await formApi.getValues();
    const payload = {
      ...values,
      followUpTime: values.followUpTime?.toISOString?.() ?? values.followUpTime,
      nextFollowTime:
        values.nextFollowTime?.toISOString?.() ?? values.nextFollowTime,
    };
    drawerApi.lock();
    try {
      if (editing.value?.id) await updateFollowUpApi(editing.value.id, payload);
      else await createFollowUpApi(payload);
      message.success('跟进记录已保存');
      gridApi.query();
      drawerApi.close();
    } catch {
      drawerApi.unlock();
    }
  },
  onOpenChange(open) {
    if (!open) return;
    const data: any = drawerApi.getData();
    editing.value = data ?? null;
    selectedCustomerId.value = data?.customerId;
    formApi.reset();
    void nextTick().then(
      () =>
        data &&
        formApi.setValues({
          ...data,
          followUpTime: data.followUpTime ? new Date(data.followUpTime) : null,
          nextFollowTime: data.nextFollowTime
            ? new Date(data.nextFollowTime)
            : null,
        }),
    );
    void loadOptions();
  },
});

async function loadOptions() {
  try {
    const [customerResult, contactResult, opportunityResult] =
      await Promise.all([
        getCustomerListApi({ page: 1, pageSize: 200 }),
        getContactListApi({ page: 1, pageSize: 200 }),
        getOpportunityListApi({ page: 1, pageSize: 200, status: '进行中' }),
      ]);
    customers.value = customerResult.items ?? [];
    contacts.value = contactResult.items ?? [];
    opportunities.value = opportunityResult.items ?? [];
  } catch {
    message.error('客户或联系人加载失败，请稍后重试');
  }
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        component: 'Input',
        fieldName: 'keyword',
        label: '关键词',
        componentProps: { placeholder: '主题/内容/客户名称', allowClear: true },
      },
      {
        component: 'Select',
        fieldName: 'ownerId',
        label: '跟进人',
        componentProps: {
          allowClear: true,
          showSearch: true,
          optionFilterProp: 'label',
          placeholder: '全部跟进人',
          options: ownerOptions(),
        },
      },
      {
        component: 'Select',
        fieldName: 'followUpType',
        label: '跟进方式',
        componentProps: {
          allowClear: true,
          options: [
            '电话沟通',
            '微信沟通',
            '邮件沟通',
            '上门拜访',
            '产品演示',
            '需求确认',
            '报价沟通',
            '其他',
          ].map((label) => ({ label, value: label })),
        },
      },
      {
        component: 'Select',
        fieldName: 'status',
        label: '跟进状态',
        componentProps: {
          allowClear: true,
          options: ['待跟进', '已完成', '已取消'].map((label) => ({
            label,
            value: label,
          })),
        },
      },
      {
        component: 'Select',
        fieldName: 'intentionLevel',
        label: '客户意向',
        componentProps: {
          allowClear: true,
          options: ['高', '中', '低', '暂无意向'].map((label) => ({
            label,
            value: label,
          })),
        },
      },
    ],
  },
  gridOptions: {
    columns: [
      { field: 'followUpTime', title: '跟进时间', minWidth: 170 },
      { field: 'customerName', title: '客户名称', minWidth: 190 },
      { field: 'contactName', title: '联系人', minWidth: 100 },
      { field: 'opportunityName', title: '销售机会', minWidth: 180 },
      { field: 'followUpType', title: '跟进方式', minWidth: 120 },
      { field: 'subject', title: '跟进主题', minWidth: 190 },
      { field: 'intentionLevel', title: '客户意向', minWidth: 100 },
      { field: 'status', title: '状态', minWidth: 100 },
      { field: 'nextFollowTime', title: '下次跟进', minWidth: 170 },
      { field: 'ownerName', title: '跟进人', minWidth: 100 },
      {
        field: 'operation',
        title: '操作',
        minWidth: 190,
        fixed: 'right',
        slots: { default: 'action' },
      },
    ],
    rowConfig: { keyField: 'id' },
    proxyConfig: {
      ajax: {
        query: async ({ page }, values: any) =>
          getFollowUpListApi({
            ...values,
            page: page.currentPage,
            pageSize: page.pageSize,
          }),
      },
    },
    toolbarConfig: { refresh: true, zoom: true, custom: true },
  } as VxeTableGridOptions,
});
function open(row?: any) {
  drawerApi.setData(row ?? null);
  drawerApi.open();
}
const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  destroyOnClose: true,
  showConfirmButton: false,
  showCancelButton: false,
  onOpenChange(open) {
    if (open) detail.value = detailDrawerApi.getData() ?? null;
  },
});
function openDetail(row: any) {
  detailDrawerApi.setData(row);
  detailDrawerApi.open();
}
function remove(row: any) {
  Modal.confirm({
    title: '移入回收站',
    content: `确认将“${row.subject}”移入回收站吗？该记录不会立即永久删除，并会保留删除原因。`,
    async onOk() {
      await deleteFollowUpApi(row.id);
      message.success('已移入回收站');
      gridApi.query();
    },
  });
}
onMounted(async () => {
  const result = await getSalesUserOptionsApi();
  salesUsers.value = result.items ?? [];
  await gridApi.formApi.updateSchema([
    { fieldName: 'ownerId', componentProps: { options: ownerOptions() } },
  ]);
});
</script>
<template>
  <Page
    auto-content-height
    title="跟进记录"
    description="记录客户沟通、拜访和推进过程，形成连续的客户经营轨迹。"
  >
    <Drawer
      :title="editing?.id ? '编辑跟进记录' : '新增跟进记录'"
      class="follow-up-drawer"
      width="760px"
    >
      <Form class="p-1" />
    </Drawer>
    <DetailDrawer title="跟进记录详情" class="follow-up-detail-drawer">
      <template v-if="detail">
        <div class="mb-5 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-lg font-semibold text-foreground">
              {{ detail.subject || '跟进记录' }}
            </div>
            <div class="mt-1 text-sm text-muted-foreground">
              {{ detail.followUpTime || '暂无跟进时间' }}
            </div>
          </div>
          <Tag :color="detail.status === '已完成' ? 'success' : 'processing'">
            {{ detail.status || '未设置状态' }}
          </Tag>
        </div>
        <Descriptions
          bordered
          :column="1"
          size="small"
          class="follow-up-detail"
        >
          <Descriptions.Item label="所属客户">
{{
            detail.customerName || '—'
          }}
</Descriptions.Item>
          <Descriptions.Item label="关联联系人">
{{
            detail.contactName || '未指定联系人'
          }}
</Descriptions.Item>
          <Descriptions.Item label="关联销售机会">
{{
            detail.opportunityName || '—'
          }}
</Descriptions.Item>
          <Descriptions.Item label="跟进人">
{{
            detail.ownerName || '—'
          }}
</Descriptions.Item>
          <Descriptions.Item label="跟进方式">
{{
            detail.followUpType || '—'
          }}
</Descriptions.Item>
          <Descriptions.Item label="客户意向">
{{
            detail.intentionLevel || '—'
          }}
</Descriptions.Item>
          <Descriptions.Item label="下次跟进时间">
{{
            detail.nextFollowTime || '—'
          }}
</Descriptions.Item>
        </Descriptions>
        <div class="mt-5 space-y-4">
          <section class="rounded-lg border border-border bg-muted/20 p-4">
            <div class="mb-2 text-sm font-medium text-foreground">跟进内容</div>
            <div class="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {{ detail.content || '暂无内容' }}
            </div>
          </section>
          <section class="grid gap-4 md:grid-cols-2">
            <div class="rounded-lg border border-border p-4">
              <div class="mb-2 text-sm font-medium text-muted-foreground">
                跟进结果
              </div>
              <div
                class="whitespace-pre-wrap text-sm leading-6 text-foreground"
              >
                {{ detail.result || '—' }}
              </div>
            </div>
            <div class="rounded-lg border border-border p-4">
              <div class="mb-2 text-sm font-medium text-muted-foreground">
                下一步计划
              </div>
              <div
                class="whitespace-pre-wrap text-sm leading-6 text-foreground"
              >
                {{ detail.nextPlan || '—' }}
              </div>
            </div>
          </section>
          <section class="rounded-lg border border-border p-4">
            <div class="mb-2 text-sm font-medium text-muted-foreground">
              备注
            </div>
            <div class="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {{ detail.remark || '—' }}
            </div>
          </section>
        </div>
      </template>
      <Empty v-else description="暂无跟进记录详情" />
    </DetailDrawer>
    <Grid table-title="跟进记录列表">
      <template #toolbar-tools>
        <Button v-access:code="'followup:create'" type="primary" @click="open()">新增跟进记录</Button>
      </template>
      <template #action="{ row }">
        <Space>
          <Button v-access:code="'followup:update'" type="link" size="small" @click="open(row)">编辑</Button>
          <Button type="link" size="small" @click="openDetail(row)">
            详情
          </Button>
          <Button v-access:code="'followup:delete'" type="link" danger size="small" @click="remove(row)">
            删除
          </Button>
        </Space>
      </template>
    </Grid>
  </Page>
</template>
