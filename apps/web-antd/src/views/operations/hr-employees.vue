<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Upload,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteEmployeeApi,
  deleteEmployeeContractFileApi,
  downloadEmployeeContractFileApi,
  getEmployeeListApi,
  saveEmployeeApi,
  uploadEmployeeContractFileApi,
  uploadEmployeeFileApi,
} from '#/api';

const open = ref(false);
const saving = ref(false);
const uploading = ref(false);
const uploadingField = ref<null | string>(null);
const form = ref<any>({ status: '在职' });
function normalizeFile(file: any) {
  if (!file) return null;
  if (typeof file === 'string') {
    try {
      const parsed = JSON.parse(file);
      return parsed && typeof parsed === 'object' ? parsed : { id: file };
    } catch {
      return { id: file };
    }
  }
  return file;
}
async function uploadIdentityOrBankFile(file: File, field: string) {
  const isImage = file.type.startsWith('image/');
  if (!isImage || file.size > 10 * 1024 * 1024) {
    message.error('仅支持 10MB 以内的身份证/银行卡图片');
    return false;
  }
  uploading.value = true;
  uploadingField.value = field;
  try {
    const result: any = await uploadEmployeeFileApi(file, field);
    form.value[field] = result?.data || result;
    message.success('附件上传成功');
  } catch (error: any) {
    message.error(error?.message || '附件上传失败');
  } finally {
    uploading.value = false;
    uploadingField.value = null;
  }
  return false;
}
async function uploadLaborContract(file: File) {
  if (
    file.type !== 'application/pdf' &&
    !file.name.toLowerCase().endsWith('.pdf')
  ) {
    message.error('仅支持上传 PDF 文件');
    return false;
  }
  if (file.size > 20 * 1024 * 1024) {
    message.error('PDF 文件不能超过 20MB');
    return false;
  }
  uploading.value = true;
  uploadingField.value = 'laborContractFile';
  try {
    const result: any = await uploadEmployeeContractFileApi(file);
    form.value.laborContractFile = result?.data || result;
    message.success('劳动合同 PDF 上传成功');
  } catch (error: any) {
    message.error(error?.message || '附件上传失败');
  } finally {
    uploading.value = false;
    uploadingField.value = null;
  }
  return false;
}
async function previewLaborContract(source = form.value.laborContractFile) {
  const file = normalizeFile(source);
  if (!file?.id) return message.warning('请先上传劳动合同 PDF');
  try {
    const blob = await downloadEmployeeContractFileApi(file.id);
    window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
  } catch (error: any) {
    message.error(error?.message || '附件预览失败');
  }
}
async function removeDocument(field: string) {
  const file = normalizeFile(form.value[field]);
  if (file?.id) await deleteEmployeeContractFileApi(file.id);
  form.value[field] = null;
  message.success('附件已移除');
}
async function removeLaborContract() {
  const file = normalizeFile(form.value.laborContractFile);
  if (file?.id) await deleteEmployeeContractFileApi(file.id);
  form.value.laborContractFile = null;
  message.success('劳动合同附件已移除');
}
const reminderCount = ref(0);
const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: [
      {
        component: 'Input',
        fieldName: 'keyword',
        label: '关键词',
        componentProps: {
          allowClear: true,
          placeholder: '姓名/工号/手机号/邮箱/合同编号',
        },
      },
      {
        component: 'Input',
        fieldName: 'deptName',
        label: '部门',
        componentProps: { allowClear: true, placeholder: '输入部门名称' },
      },
      {
        component: 'Input',
        fieldName: 'position',
        label: '职位',
        componentProps: { allowClear: true, placeholder: '输入职位名称' },
      },
      {
        component: 'Select',
        fieldName: 'status',
        label: '任职状态',
        componentProps: {
          allowClear: true,
          placeholder: '全部状态',
          options: ['在职', '试用期', '停职', '已离职'].map((value) => ({
            label: value,
            value,
          })),
        },
      },
      {
        component: 'Select',
        fieldName: 'gender',
        label: '性别',
        componentProps: {
          allowClear: true,
          placeholder: '全部',
          options: ['男', '女', '其他'].map((value) => ({
            label: value,
            value,
          })),
        },
      },
      {
        component: 'Select',
        fieldName: 'reminder',
        label: '档案提醒',
        componentProps: {
          allowClear: true,
          placeholder: '全部提醒',
          options: [
            { label: '生日临近（30天内）', value: 'birthday' },
            { label: '合同即将到期（30天内）', value: 'contract' },
            { label: '无提醒', value: 'none' },
          ],
        },
      },
      {
        component: 'Input',
        fieldName: 'entryDateStart',
        label: '入职日期起',
        componentProps: { allowClear: true, type: 'date' },
      },
      {
        component: 'Input',
        fieldName: 'entryDateEnd',
        label: '入职日期止',
        componentProps: { allowClear: true, type: 'date' },
      },
      {
        component: 'Input',
        fieldName: 'contractEndStart',
        label: '合同到期起',
        componentProps: { allowClear: true, type: 'date' },
      },
      {
        component: 'Input',
        fieldName: 'contractEndEnd',
        label: '合同到期止',
        componentProps: { allowClear: true, type: 'date' },
      },
    ],
  },
  gridOptions: {
    columns: [
      { field: 'name', title: '员工姓名', minWidth: 130 },
      { field: 'employeeNo', title: '工号', minWidth: 120 },
      { field: 'deptName', title: '部门', minWidth: 130 },
      { field: 'position', title: '职位', minWidth: 130 },
      { field: 'mobile', title: '手机号', minWidth: 150 },
      { field: 'birthday', title: '生日', minWidth: 125 },
      { field: 'laborContractEnd', title: '劳动合同到期', minWidth: 145 },
      {
        field: 'reminder',
        title: '提醒',
        minWidth: 110,
        cellRender: {
          name: 'CellTag',
          options: [
            { label: '生日临近', value: '生日临近', color: 'warning' },
            { label: '合同即将到期', value: '合同即将到期', color: 'warning' },
          ],
        },
      },
      {
        field: 'status',
        title: '状态',
        minWidth: 100,
        cellRender: {
          name: 'CellTag',
          options: [
            { label: '在职', value: '在职', color: 'success' },
            { label: '试用期', value: '试用期', color: 'warning' },
            { label: '停职', value: '停职', color: 'default' },
          ],
        },
      },
      {
        field: 'operation',
        title: '操作',
        fixed: 'right',
        width: 190,
        slots: { default: 'action' },
      },
    ],
    rowConfig: { keyField: 'id' },
    proxyConfig: {
      ajax: {
        query: async ({ page }: any, values: any) => {
          const result = await getEmployeeListApi({
            ...values,
            page: page.currentPage,
            pageSize: page.pageSize,
          });
          reminderCount.value = (result.items ?? []).filter(
            (item: any) => item.reminder,
          ).length;
          return result;
        },
      },
    },
    toolbarConfig: { refresh: true, zoom: true, custom: true },
  } as VxeTableGridOptions,
});
const detailOpen = ref(false);
const detail = ref<any>({});
function showDetail(record: any) {
  detail.value = {
    ...record,
    laborContractFile: normalizeFile(record.laborContractFile),
    idCardFile: normalizeFile(record.idCardFile),
    bankCardFile: normalizeFile(record.bankCardFile),
  };
  detailOpen.value = true;
}
async function removeEmployee(record: any) {
  Modal.confirm({
    title: '确认删除员工档案？',
    content: `删除后将无法在员工档案列表中查看“${record.name}”。`,
    okType: 'danger',
    onOk: async () => {
      await deleteEmployeeApi(record.id);
      message.success('员工档案已删除');
      await load();
    },
  });
}
async function load() {
  await gridApi.query();
}
function add() {
  form.value = { status: '在职' };
  open.value = true;
}
function edit(record: any) {
  form.value = {
    ...record,
    laborContractFile: normalizeFile(record.laborContractFile),
    idCardFile: normalizeFile(record.idCardFile),
    bankCardFile: normalizeFile(record.bankCardFile),
  };
  open.value = true;
}
async function save() {
  if (!form.value.name?.trim()) return message.warning('请填写员工姓名');
  saving.value = true;
  try {
    await saveEmployeeApi(form.value);
    message.success('员工档案已保存');
    open.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>
<template>
  <Page
    auto-content-height
    title="员工档案"
    description="集中维护员工基本资料、联系方式、收款账户及劳动合同提醒。"
  >
    <Grid table-title="员工档案">
      <template #toolbar-tools>
        <span v-if="reminderCount" class="mr-3 text-orange-600">有 {{ reminderCount }} 条提醒</span>
        <Button v-access:code="'hr:employee:create'" type="primary" @click="add">新增员工</Button>
      </template>
      <template #action="{ row }">
        <Space>
          <Button v-access:code="'hr:employee:update'" type="link" size="small" @click="edit(row)">编辑</Button>
          <Button type="link" size="small" @click="showDetail(row)">
            详情
          </Button>
          <Button v-access:code="'hr:employee:delete'" danger type="link" size="small" @click="removeEmployee(row)">
            删除
          </Button>
        </Space>
      </template>
    </Grid>
    <Modal
      v-model:open="open"
      title="员工档案"
      :confirm-loading="saving"
      width="720px"
      @ok="save"
    >
      <Form layout="vertical">
        <div class="grid grid-cols-3 gap-3">
          <Form.Item label="姓名" required>
            <Input v-model:value="form.name" />
</Form.Item><Form.Item label="工号">
            <Input v-model:value="form.employeeNo" />
</Form.Item><Form.Item label="性别">
            <Select
              v-model:value="form.gender"
              allow-clear
              :options="
                ['男', '女', '其他'].map((x) => ({ label: x, value: x }))
              "
            />
</Form.Item><Form.Item label="手机号">
            <Input v-model:value="form.mobile" />
</Form.Item><Form.Item label="邮箱">
            <Input v-model:value="form.email" />
</Form.Item><Form.Item label="生日">
            <Input v-model:value="form.birthday" type="date" />
</Form.Item><Form.Item label="身份证号">
            <Input v-model:value="form.idCardNo" />
</Form.Item><Form.Item label="入职日期">
            <Input v-model:value="form.entryDate" type="date" />
</Form.Item><Form.Item label="状态">
            <Select
              v-model:value="form.status"
              :options="
                ['在职', '试用期', '停职', '已离职'].map((x) => ({
                  label: x,
                  value: x,
                }))
              "
            />
          </Form.Item>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <Form.Item label="部门">
            <Input v-model:value="form.deptName" />
</Form.Item><Form.Item label="职位">
            <Input v-model:value="form.position" />
</Form.Item><Form.Item label="开户银行">
            <Input v-model:value="form.bankName" />
</Form.Item><Form.Item label="银行卡号">
            <Input v-model:value="form.bankAccount" />
</Form.Item><Form.Item label="紧急联系人">
            <Input v-model:value="form.emergencyContact" />
</Form.Item><Form.Item label="紧急联系电话">
            <Input v-model:value="form.emergencyMobile" />
          </Form.Item>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <Form.Item label="身份证">
            <Upload
              :show-upload-list="false"
              accept="image/jpeg,image/png,image/webp"
              :before-upload="
                (file) => uploadIdentityOrBankFile(file, 'idCardFile')
              "
              >
<Button :loading="uploadingField === 'idCardFile'">
上传身份证
</Button>
</Upload>
            <div
              v-if="form.idCardFile?.id"
              class="mt-2 flex items-center gap-2"
            >
              <img
                :src="`/api/system/hr/employee/file/${form.idCardFile.id}`"
                alt="身份证缩略图"
                class="h-16 w-24 cursor-pointer rounded border object-cover"
                @click="previewLaborContract(form.idCardFile)"
              />
              <Button
                danger
                type="link"
                size="small"
                @click="removeDocument('idCardFile')"
                >
移除
</Button>
            </div>
          </Form.Item>
          <Form.Item label="银行卡">
            <Upload
              :show-upload-list="false"
              accept="image/jpeg,image/png,image/webp"
              :before-upload="
                (file) => uploadIdentityOrBankFile(file, 'bankCardFile')
              "
              >
<Button :loading="uploadingField === 'bankCardFile'">
上传银行卡
</Button>
</Upload>
            <div
              v-if="form.bankCardFile?.id"
              class="mt-2 flex items-center gap-2"
            >
              <img
                :src="`/api/system/hr/employee/file/${form.bankCardFile.id}`"
                alt="银行卡缩略图"
                class="h-16 w-24 cursor-pointer rounded border object-cover"
                @click="previewLaborContract(form.bankCardFile)"
              />
              <Button
                danger
                type="link"
                size="small"
                @click="removeDocument('bankCardFile')"
                >
移除
</Button>
            </div>
          </Form.Item>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <Form.Item label="劳动合同编号">
            <Input v-model:value="form.laborContractNo" />
</Form.Item><Form.Item label="合同开始日期">
            <Input
              v-model:value="form.laborContractStart"
              type="date"
            />
</Form.Item><Form.Item label="合同到期日期">
            <Input v-model:value="form.laborContractEnd" type="date" />
          </Form.Item>
        </div>
        <Form.Item label="劳动合同 PDF">
          <div
            class="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3"
          >
            <Upload
              :show-upload-list="false"
              accept="application/pdf,.pdf"
              :before-upload="uploadLaborContract"
            >
              <Button :loading="uploadingField === 'laborContractFile'">
上传劳动合同 PDF
</Button>
            </Upload>
            <template v-if="form.laborContractFile?.id">
              <span class="max-w-xs truncate text-sm text-muted-foreground">{{
                form.laborContractFile.name || '劳动合同 PDF'
              }}</span>
              <Button type="link" size="small" @click="previewLaborContract">
                预览
              </Button>
              <Button
                danger
                type="link"
                size="small"
                @click="removeLaborContract"
              >
                移除
              </Button>
            </template>
            <span v-else class="text-xs text-muted-foreground">支持 PDF，单个文件不超过 20MB</span>
          </div>
        </Form.Item>
        <Form.Item label="备注">
          <Input.TextArea v-model:value="form.remark" :rows="3" />
        </Form.Item>
      </Form>
    </Modal>
    <Modal
      v-model:open="detailOpen"
      title="员工详情"
      :footer="null"
      width="720px"
    >
      <div class="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div>
          <span class="text-muted-foreground">姓名：</span>{{ detail.name || '—' }}
        </div>
        <div>
          <span class="text-muted-foreground">工号：</span>{{ detail.employeeNo || '—' }}
        </div>
        <div>
          <span class="text-muted-foreground">部门：</span>{{ detail.deptName || '—' }}
        </div>
        <div>
          <span class="text-muted-foreground">职位：</span>{{ detail.position || '—' }}
        </div>
        <div>
          <span class="text-muted-foreground">手机号：</span>{{ detail.mobile || '—' }}
        </div>
        <div>
          <span class="text-muted-foreground">邮箱：</span>{{ detail.email || '—' }}
        </div>
        <div>
          <span class="text-muted-foreground">生日：</span>{{ detail.birthday || '—' }}
        </div>
        <div>
          <span class="text-muted-foreground">入职日期：</span>{{ detail.entryDate || '—' }}
        </div>
        <div>
          <span class="text-muted-foreground">劳动合同编号：</span>{{ detail.laborContractNo || '—' }}
        </div>
        <div>
          <span class="text-muted-foreground">合同期限：</span>{{ detail.laborContractStart || '—' }} 至
          {{ detail.laborContractEnd || '—' }}
        </div>
      </div>
      <div class="mt-5 border-t border-border pt-4">
        <div class="mb-3 font-medium">身份与银行卡附件</div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div class="mb-2 text-muted-foreground">身份证：</div>
            <img
              v-if="detail.idCardFile?.id"
              :src="`/api/system/hr/employee/file/${detail.idCardFile.id}`"
              alt="身份证缩略图"
              class="h-20 w-32 cursor-pointer rounded border object-cover"
              @click="previewLaborContract(detail.idCardFile)"
            />
            <span v-else>暂无附件</span>
          </div>
          <div>
            <div class="mb-2 text-muted-foreground">银行卡：</div>
            <img
              v-if="detail.bankCardFile?.id"
              :src="`/api/system/hr/employee/file/${detail.bankCardFile.id}`"
              alt="银行卡缩略图"
              class="h-20 w-32 cursor-pointer rounded border object-cover"
              @click="previewLaborContract(detail.bankCardFile)"
            />
            <span v-else>暂无附件</span>
          </div>
        </div>
      </div>
      <div class="mt-5 border-t border-border pt-4">
        <span class="text-muted-foreground">劳动合同 PDF：</span>
        <template v-if="detail.laborContractFile?.id">
          <Button
            type="link"
            size="small"
            @click="previewLaborContract(detail.laborContractFile)"
          >
            预览附件
          </Button>
        </template>
        <span v-else>暂无附件</span>
      </div>
    </Modal>
  </Page>
</template>
<style scoped>
.employee-card {
  height: 100%;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.employee-toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid hsl(var(--border));
}

.employee-search {
  width: 360px;
}

.employee-toolbar-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.employee-table-wrap {
  overflow: auto;
}

.employee-table :deep(.ant-table) {
  font-size: 14px;
}

.employee-table :deep(.ant-table-thead > tr > th),
.employee-table :deep(.ant-table-tbody > tr > td) {
  text-align: center;
}

.employee-table :deep(.ant-table-thead > tr > th) {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground)) !important;
  white-space: nowrap;
  background: hsl(var(--muted)) !important;
  border-bottom-color: hsl(var(--border)) !important;
}

.employee-table :deep(.ant-table-tbody > tr > td) {
  padding: 13px 16px;
  color: hsl(var(--foreground));
  border-bottom-color: hsl(var(--border)) !important;
}

.employee-table :deep(.ant-table-tbody > tr:hover > td) {
  background: hsl(var(--muted) / 45%) !important;
}

@media (max-width: 768px) {
  .employee-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .employee-search {
    width: 100%;
  }

  .employee-toolbar-actions {
    justify-content: space-between;
  }
}
</style>
