<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteContractApi, getContractListApi } from '#/api';

import ContractDetailContent from './contract-detail-content.vue';

const router = useRouter();
const detailOpen = ref(false);
const detailRow = ref<any>(null);

function openDetail(row: any) {
  detailRow.value = row;
  detailOpen.value = true;
}

const openEditor = (id?: string) =>
  router.push(
    id ? `/operations/contract/edit/${id}` : '/operations/contract/edit/new',
  );

function remove(row: any) {
  Modal.confirm({
    title: '删除合同',
    content: `确认删除“${row.contractName}”吗？`,
    async onOk() {
      await deleteContractApi(row.id);
      message.success('合同已删除');
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
        componentProps: { allowClear: true, placeholder: '项目编号/名称/客户' },
      },
      {
        component: 'Select',
        fieldName: 'projectType',
        label: '项目类型',
        componentProps: {
          allowClear: true,
          options: ['文档', '组工', '其他'].map((x) => ({
            label: x,
            value: x,
          })),
        },
      },
      {
        component: 'Select',
        fieldName: 'status',
        label: '合同状态',
        componentProps: {
          allowClear: true,
          options: ['草稿', '执行中', '已完成', '已终止'].map((x) => ({
            label: x,
            value: x,
          })),
        },
      },
      {
        component: 'Select',
        fieldName: 'paymentMethod',
        label: '付款方式',
        componentProps: {
          allowClear: true,
          options: ['一次性付款', '分期付款', '按进度付款', '其他'].map(
            (x) => ({ label: x, value: x }),
          ),
        },
      },
      {
        component: 'Input',
        fieldName: 'projectNo',
        label: '项目编号',
        componentProps: { allowClear: true, placeholder: '输入项目编号' },
      },
      {
        component: 'Input',
        fieldName: 'ownerName',
        label: '市场负责人',
        componentProps: { allowClear: true, placeholder: '输入负责人姓名' },
      },
      {
        component: 'Input',
        fieldName: 'signedAtFrom',
        label: '签订开始日期',
        componentProps: { type: 'date' },
      },
      {
        component: 'Input',
        fieldName: 'signedAtTo',
        label: '签订结束日期',
        componentProps: { type: 'date' },
      },
      {
        component: 'Input',
        fieldName: 'amountMin',
        label: '最低合同金额',
        componentProps: { allowClear: true, type: 'number', placeholder: '元' },
      },
      {
        component: 'Input',
        fieldName: 'amountMax',
        label: '最高合同金额',
        componentProps: { allowClear: true, type: 'number', placeholder: '元' },
      },
    ],
  },
  gridOptions: {
    columns: [
      { field: 'contractNo', title: '项目编号', minWidth: 180 },
      { field: 'contractName', title: '合同名称', minWidth: 260 },
      { field: 'customerName', title: '甲方单位', minWidth: 220 },
      { field: 'projectName', title: '项目名称', minWidth: 200 },
      { field: 'projectType', title: '项目类型', width: 100 },
      {
        field: 'amount',
        title: '合同金额（元）',
        width: 145,
        formatter: ({ cellValue }: any) =>
          `¥ ${Number(cellValue || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
      {
        field: 'qualityDeposit',
        title: '质保金（元）',
        width: 135,
        formatter: ({ cellValue }: any) =>
          cellValue === null || cellValue === undefined || cellValue === ''
            ? '—'
            : `¥ ${Number(cellValue).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
      { field: 'signedAt', title: '签订时间', width: 120 },
      {
        field: 'projectPeriod',
        title: '项目周期',
        width: 120,
        formatter: ({ cellValue }: any) => cellValue || '—',
      },
      {
        field: 'ownerName',
        title: '市场负责人',
        width: 120,
        formatter: ({ cellValue }: any) => cellValue || '未分配',
      },
      { field: 'status', title: '状态', width: 100 },
      {
        field: 'operation',
        title: '操作',
        fixed: 'right',
        width: 170,
        slots: { default: 'action' },
      },
    ],
    rowConfig: { keyField: 'id' },
    proxyConfig: {
      ajax: {
        query: ({ page }: any, values: any) =>
          getContractListApi({
            ...values,
            page: page.currentPage,
            pageSize: page.pageSize,
          }),
      },
    },
    toolbarConfig: { refresh: true, zoom: true, custom: true },
  } as any,
});

onMounted(() => gridApi.query());
</script>
<template>
  <Page
    auto-content-height
    title="合同列表"
    description="统一管理合同台账、项目金额和合同内容明细。"
  >
    <Grid table-title="合同台账">
      <template #toolbar-tools>
        <Button v-access:code="'contract:create'" type="primary" @click="openEditor()">新增合同</Button>
      </template>
      <template #action="{ row }">
        <Space>
          <Button v-access:code="'contract:update'" type="link" size="small" @click="openEditor(row.id)">
编辑
</Button>
          <Button type="link" size="small" @click="openDetail(row)">
详情
</Button>
          <Button v-access:code="'contract:delete'" type="link" danger size="small" @click="remove(row)">
删除
</Button>
        </Space>
      </template>
    </Grid>
    <Modal
      v-model:open="detailOpen"
      :title="
        detailRow?.contractName
          ? `合同详情 · ${detailRow.contractName}`
          : '合同详情'
      "
      :width="980"
      :footer="null"
      centered
    >
      <ContractDetailContent :contract="detailRow" />
    </Modal>
  </Page>
</template>
