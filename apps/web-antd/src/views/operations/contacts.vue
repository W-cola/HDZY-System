<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useAccess } from '@vben/access';

import {
  Button,
  Descriptions,
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
  createContactApi,
  deleteContactApi,
  getContactListApi,
  getCustomerListApi,
  getSalesUserOptionsApi,
  updateContactApi,
} from '#/api';
const { hasAccessByCodes } = useAccess();
const editing = ref<any>();
const canCreate = () => hasAccessByCodes(['contact:create']);
const canUpdate = () => hasAccessByCodes(['contact:update']);
const canDelete = () => hasAccessByCodes(['contact:delete']);
const detail = ref<any>();
const form = ref<any>({});
const customers = ref<any[]>([]);
const salesUsers = ref<any[]>([]);
const ownerOptions = () =>
  salesUsers.value.map((x) => ({ label: x.realName, value: String(x.id) }));
const contactBusinessOptions = () =>
  [
    '文档业务',
    '组工业务',
    '培训业务',
    '合同审批',
    '财务结算',
    '技术对接',
    '其他',
  ].map((label) => ({ label, value: label }));
const contactRoleOptions = () =>
  [
    '决策人',
    '业务负责人',
    '财务联系人',
    '技术对接人',
    '合同审批人',
    '使用人',
    '其他',
  ].map((label) => ({ label, value: label }));
const splitTags = (value: any) =>
  Array.isArray(value)
    ? value
    : String(value || '')
        .split('、')
        .filter(Boolean);
const contactStatusOptions = () =>
  ['正常', '暂时无法联系', '离职'].map((label) => ({
    label,
    value: label,
  }));
const filterValue = (value: any): string | undefined => {
  if (Array.isArray(value)) return filterValue(value[0]);
  if (value && typeof value === 'object') {
    return filterValue(value.value ?? value.id ?? value.key);
  }
  const normalized =
    value === undefined || value === null ? '' : String(value).trim();
  return normalized || undefined;
};
const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    if (!form.value.customerId || !form.value.name?.trim()) {
      message.warning('请选择所属客户并填写联系人姓名');
      return;
    }
    drawerApi.lock();
    try {
      const payload = {
        ...form.value,
        contactBusiness: splitTags(form.value.contactBusiness),
        contactRole: splitTags(form.value.contactRole),
        isPrimary: Boolean(Number(form.value.isPrimary)),
      };
      editing.value?.id
        ? await updateContactApi(editing.value.id, payload)
        : await createContactApi(payload);
      message.success('联系人已保存');
      gridApi.query();
      drawerApi.close();
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
          placeholder: '姓名/手机号/客户名称',
          allowClear: true,
        },
      },
      {
        component: 'Select',
        fieldName: 'ownerId',
        label: '客户负责人',
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
        fieldName: 'contactBusinessFilter',
        label: '负责业务',
        componentProps: { allowClear: true, options: contactBusinessOptions() },
      },
      {
        component: 'Select',
        fieldName: 'contactRoleFilter',
        label: '联系人角色',
        componentProps: {
          allowClear: true,
          options: contactRoleOptions(),
        },
      },
      {
        component: 'Input',
        fieldName: 'positionFilter',
        label: '职务',
        componentProps: {
          placeholder: '请输入职务关键词',
          allowClear: true,
        },
      },
      {
        component: 'Select',
        fieldName: 'primaryContact',
        label: '主要联系人',
        componentProps: {
          allowClear: true,
          options: [
            { label: '是', value: 'true' },
            { label: '否', value: 'false' },
          ],
        },
      },
      {
        component: 'Select',
        fieldName: 'contactStatus',
        label: '联系状态',
        componentProps: {
          allowClear: true,
          options: contactStatusOptions(),
        },
      },
    ],
  },
  gridOptions: {
    columns: [
      { field: 'name', title: '联系人', minWidth: 130 },
      { field: 'customerName', title: '所属客户', minWidth: 180 },
      {
        field: 'ownerName',
        title: '客户负责人',
        minWidth: 130,
        formatter: ({ cellValue }) => cellValue || '未分配',
      },
      { field: 'position', title: '职务', minWidth: 130 },
      { field: 'contactBusiness', title: '负责业务', minWidth: 160 },
      { field: 'contactRole', title: '联系人角色', minWidth: 150 },
      { field: 'mobile', title: '手机号', minWidth: 150 },
      {
        field: 'isPrimary',
        title: '主要联系人',
        minWidth: 110,
        cellRender: {
          name: 'CellTag',
          options: [
            { label: '是', value: true, color: 'success' },
            { label: '否', value: false, color: 'default' },
          ],
        },
      },
      { field: 'status', title: '联系状态', minWidth: 120 },
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
        query: async ({ page }, values: any) => {
          const contactRole = filterValue(values.contactRoleFilter);
          const contactStatus = filterValue(values.contactStatus);
          const ownerId = filterValue(values.ownerId);
          return getContactListApi({
            ...values,
            ownerId: ownerId ? String(ownerId) : undefined,
            contactRole: contactRole ? String(contactRole) : undefined,
            contactBusiness: filterValue(values.contactBusinessFilter),
            contactBusinessFilter: undefined,
            status: contactStatus ? String(contactStatus) : undefined,
            positionFilter: filterValue(values.positionFilter),
            primaryContact:
              filterValue(values.primaryContact) === 'true'
                ? '1'
                : filterValue(values.primaryContact) === 'false'
                  ? '0'
                  : undefined,
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
    {
      fieldName: 'contactBusinessFilter',
      componentProps: { options: contactBusinessOptions() },
    },
    {
      fieldName: 'contactRoleFilter',
      componentProps: { options: contactRoleOptions() },
    },
    {
      fieldName: 'contactStatus',
      componentProps: { options: contactStatusOptions() },
    },
    {
      fieldName: 'primaryContact',
      componentProps: {
        options: [
          { label: '是', value: 'true' },
          { label: '否', value: 'false' },
        ],
      },
    },
  ]);
});

async function open(row?: any) {
  if (customers.value.length === 0) {
    const r = await getCustomerListApi({ page: 1, pageSize: 200 });
    customers.value = r.items ?? [];
  }
  editing.value = row;
  form.value = row
    ? {
        ...row,
        contactBusiness: splitTags(row.contactBusiness),
        contactRole: splitTags(row.contactRole),
      }
    : {
        customerId: undefined,
        name: '',
        contactBusiness: [],
        contactRole: [],
        status: '正常',
        isPrimary: 0,
      };
  drawerApi.open();
}
function remove(row: any) {
  Modal.confirm({
    title: '移入回收站',
    content: `确认将“${row.name}”移入回收站吗？联系人仍会保留历史跟进引用。`,
    async onOk() {
      await deleteContactApi(row.id);
      message.success('联系人已删除');
      gridApi.query();
    },
  });
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
</script>
<template>
  <Page
    auto-content-height
    title="联系人"
    description="独立维护客户联系人资料，联系人通过所属客户与客户单位建立关联。"
  >
    <Drawer :title="editing?.id ? '编辑联系人' : '新增联系人'">
      <Form :model="form" layout="vertical" class="p-1">
        <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item label="所属客户" required>
            <Select
              v-model:value="form.customerId"
              class="w-full"
              show-search
              option-filter-prop="label"
              :options="
                customers.map((x: any) => ({ label: x.name, value: x.id }))
              "
              placeholder="请选择所属客户"
            />
</Form.Item><Form.Item label="联系人姓名" required>
            <Input
              v-model:value="form.name"
              placeholder="请输入姓名"
            />
</Form.Item><Form.Item label="性别">
            <Select
              v-model:value="form.gender"
              class="w-full"
              :options="
                ['男', '女', '其他'].map((label) => ({ label, value: label }))
              "
            />
</Form.Item><Form.Item label="职务">
            <Input
              v-model:value="form.position"
              placeholder="如项目负责人"
            />
</Form.Item><Form.Item label="负责业务">
            <Select
              v-model:value="form.contactBusiness"
              mode="multiple"
              class="w-full"
              :options="contactBusinessOptions()"
              placeholder="请选择负责业务"
            />
</Form.Item><Form.Item label="联系人角色">
            <Select
              v-model:value="form.contactRole"
              mode="multiple"
              class="w-full"
              :options="contactRoleOptions()"
              placeholder="请选择联系人角色"
            />
</Form.Item><Form.Item label="联系状态">
            <Select
              v-model:value="form.status"
              class="w-full"
              :options="
                ['正常', '暂时无法联系', '离职'].map((label) => ({
                  label,
                  value: label,
                }))
              "
            />
</Form.Item><Form.Item label="手机号">
            <Input v-model:value="form.mobile" />
</Form.Item><Form.Item label="座机">
            <Input v-model:value="form.telephone" />
</Form.Item><Form.Item label="邮箱">
            <Input v-model:value="form.email" />
</Form.Item><Form.Item label="微信/其他">
            <Input v-model:value="form.wechat" />
</Form.Item><Form.Item label="主要联系人">
            <Select
              v-model:value="form.isPrimary"
              class="w-full"
              :options="[
                { label: '是', value: 1 },
                { label: '否', value: 0 },
              ]"
            />
</Form.Item><Form.Item class="md:col-span-2" label="备注">
            <Input.TextArea v-model:value="form.remark" :rows="3" />
          </Form.Item>
        </div>
      </Form>
    </Drawer>
    <DetailDrawer title="联系人详情" class="contact-detail-drawer">
      <template v-if="detail">
        <div class="mb-5 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-lg font-semibold text-foreground">
              {{ detail.name || '联系人详情' }}
            </div>
            <div class="mt-1 text-sm text-muted-foreground">
              {{ detail.position || '暂无职务' }}
            </div>
          </div>
          <Tag v-if="detail.status" color="processing">{{ detail.status }}</Tag>
        </div>
        <Descriptions
          bordered
          :column="1"
          size="small"
          class="contact-detail-descriptions"
        >
          <Descriptions.Item label="所属客户">
            {{ detail.customerName || '—' }}
          </Descriptions.Item>
          <Descriptions.Item label="负责业务">
            <Space wrap>
<Tag
                v-for="item in splitTags(detail.contactBusiness)"
                :key="item"
                color="blue"
                >
{{ item }}
</Tag><span v-if="!splitTags(detail.contactBusiness).length">—</span>
</Space>
          </Descriptions.Item>
          <Descriptions.Item label="联系人角色">
            <Space wrap>
<Tag
                v-for="item in splitTags(detail.contactRole)"
                :key="item"
                color="purple"
                >
{{ item }}
</Tag><span v-if="!splitTags(detail.contactRole).length">—</span>
</Space>
          </Descriptions.Item>
          <Descriptions.Item label="性别">
            {{ detail.gender || '—' }}
          </Descriptions.Item>
          <Descriptions.Item label="是否主要联系人">
            {{ detail.isPrimary ? '是' : '否' }}
          </Descriptions.Item>
          <Descriptions.Item label="手机号">
            {{ detail.mobile || '—' }}
          </Descriptions.Item>
          <Descriptions.Item label="座机">
            {{ detail.telephone || '—' }}
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            {{ detail.email || '—' }}
          </Descriptions.Item>
          <Descriptions.Item label="微信/其他">
            {{ detail.wechat || '—' }}
          </Descriptions.Item>
          <Descriptions.Item label="客户负责人">
            {{ detail.ownerName || '未分配' }}
          </Descriptions.Item>
        </Descriptions>
        <section class="mt-5 rounded-lg border border-border bg-muted/20 p-4">
          <div class="mb-2 text-sm font-medium text-foreground">备注</div>
          <div class="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {{ detail.remark || '—' }}
          </div>
        </section>
      </template>
    </DetailDrawer>
    <Grid table-title="联系人列表">
      <template #toolbar-tools>
        <Button v-if="canCreate()" type="primary" @click="open()">新增联系人</Button>
</template><template #action="{ row }">
        <Space>
          <Button v-if="canUpdate()" type="link" size="small" @click="open(row)">编辑</Button>
          <Button type="link" size="small" @click="openDetail(row)">
            详情
          </Button>
          <Button v-if="canDelete()" type="link" danger size="small" @click="remove(row)">
            删除
          </Button>
        </Space>
      </template>
    </Grid>
  </Page>
</template>
<style scoped>
.customer-form :deep(.ant-form-item) {
  margin-bottom: 16px;
}
</style>
