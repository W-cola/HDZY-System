<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  AutoComplete,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Upload,
} from 'ant-design-vue';

import {
  createContractApi,
  deleteContractFileApi,
  downloadContractFileApi,
  getContractListApi,
  getCustomerInvoiceProfilesApi,
  getCustomerListApi,
  getSalesUserOptionsApi,
  updateContractApi,
  uploadContractFileApi,
} from '#/api';

import ContractSection from './components/ContractSection.vue';
import { useContractEditor } from './composables/useContractEditor';

const route = useRoute();
const router = useRouter();
const editingId = route.params.id as string;
const editing = ref<any>();
const form = ref<any>({});
const customers = ref<any[]>([]);
const sales = ref<any[]>([]);
const saving = ref(false);
const uploading = ref(false);
const attachments = ref<any[]>([]);
const invoiceProfiles = ref<any[]>([]);
async function loadInvoiceProfiles(customerId: string) {
  if (!customerId) {
    invoiceProfiles.value = [];
    return;
  }
  const result: any = await getCustomerInvoiceProfilesApi({
    customerId,
    page: 1,
    pageSize: 100,
  });
  invoiceProfiles.value = result.items ?? [];
  const current = invoiceProfiles.value.find((item: any) => item.isCurrent);
  if (current && !form.value.invoiceProfileId) selectInvoiceProfile(current.id);
}
function selectInvoiceProfile(id: string) {
  const profile = invoiceProfiles.value.find((item: any) => item.id === id);
  if (!profile) return;
  form.value.invoiceProfileId = profile.id;
  form.value.invoiceSnapshot = {
    invoiceTitle: profile.invoiceTitle,
    taxpayerNo: profile.taxpayerNo,
    invoiceType: profile.invoiceType,
    registeredAddress: profile.registeredAddress,
    registeredPhone: profile.registeredPhone,
    bankName: profile.bankName,
    bankAccount: profile.bankAccount,
    invoiceEmail: profile.invoiceEmail,
    invoicePhone: profile.invoicePhone,
  };
}
async function previewAttachment(file: any) {
  if (!file?.id) return;
  const previewWindow = window.open('', '_blank');
  try {
    const blob = await downloadContractFileApi(file.id);
    const url = URL.createObjectURL(blob);
    if (previewWindow) previewWindow.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error: any) {
    previewWindow?.close();
    message.error(error?.message || '附件预览失败');
  }
}
async function removeAttachment(file: any, index: number) {
  if (file?.id) await deleteContractFileApi(file.id);
  attachments.value.splice(index, 1);
}
async function handleAttachment(file: File) {
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
  try {
    const result: any = await uploadContractFileApi(file);
    const uploaded = result?.data || result;
    if (uploaded && !uploaded.url && uploaded.id)
      uploaded.url = `/api/system/contract/file/${uploaded.id}`;
    attachments.value.push(uploaded);
    message.success('合同附件上传成功');
  } catch (error: any) {
    message.error(error?.message || '附件上传失败');
  } finally {
    uploading.value = false;
  }
  return false;
}
const projectTypes = ['文档', '组工', '其他'].map((x) => ({
  label: x,
  value: x,
}));
const numberProps = { controls: false, min: 0, precision: 2 };
const itemOptions = [
  '档案数字化',
  '档案整理',
  '设备租赁',
  '驻场服务',
  '技术服务',
  '其他',
].map((x) => ({ label: x, value: x }));
const blankItem = () => ({
  content: '',
  unit: '',
  quantity: undefined,
  unitPrice: undefined,
  total: undefined,
  remark: '',
});
const blankPayment = () => ({
  condition: '',
  ratio: undefined,
  amount: undefined,
  remark: '',
});
const { total, ratioTotal, amountTotal, recalc, recalcPayment } =
  useContractEditor(form);
async function submit(draft: boolean) {
  const projectNo = String(form.value.projectNo || '').trim();
  const contractName = String(form.value.contractName || '').trim();
  if (!projectNo || !contractName || !form.value.customerId)
    return message.warning('请填写项目编号、合同名称并选择客户');
  if (!draft && Math.abs(ratioTotal.value - 100) > 0.001)
    return message.warning(
      `付款比例合计必须为100%，当前为${ratioTotal.value.toFixed(2)}%`,
    );
  saving.value = true;
  try {
    const payload = {
      ...form.value,
      projectNo,
      contractNo: projectNo,
      contractName,
      amount: total.value,
      status: draft ? '草稿' : '执行中',
      paymentPlans: form.value.paymentPlans || [],
      invoiceProfileId: form.value.invoiceProfileId,
      invoiceSnapshot: form.value.invoiceSnapshot,
      attachments: attachments.value.map((file: any, index: number) => ({
        id: file.id,
        name: file.name,
        size: Number(file.size || 0),
        url: file.url,
        order: index + 1,
      })),
    };
    if (editingId === 'new') await createContractApi(payload);
    else await updateContractApi(editingId, payload);
    message.success(draft ? '合同已暂存' : '合同已保存');
    await router.push('/operations/contract/list');
  } catch (error: any) {
    message.error(error?.message || '合同保存失败');
  } finally {
    saving.value = false;
  }
}
async function load() {
  try {
    const [c, s] = await Promise.all([
      getCustomerListApi({ page: 1, pageSize: 200 }),
      getSalesUserOptionsApi(),
    ]);
    customers.value = c.items || [];
    sales.value = s.items || [];
    if (editingId !== 'new') {
      const result: any = await getContractListApi({ page: 1, pageSize: 200 });
      editing.value = (result.items || []).find((x: any) => x.id === editingId);
    }
    const row = editing.value;
    let stored: any =
      row?.items && !Array.isArray(row.items) ? row.items : null;
    if (typeof stored === 'string') {
      try {
        stored = JSON.parse(stored);
      } catch {
        stored = null;
      }
    }
    const savedAttachments =
      row?.attachments ||
      stored?.attachments ||
      stored?.attachment ||
      row?.attachment;
    attachments.value = savedAttachments
      ? Array.isArray(savedAttachments)
        ? savedAttachments
        : [savedAttachments]
      : [];
    form.value = row
      ? {
          ...row,
          projectNo: row.projectNo || row.contractNo || '',
          items: stored?.items || [blankItem()],
          paymentPlans: stored?.paymentPlans || [blankPayment()],
          invoiceProfileId: stored?.invoiceProfileId,
          invoiceSnapshot: stored?.invoiceSnapshot,
        }
      : {
          projectNo: '',
          contractName: '',
          customerId: undefined,
          projectName: '',
          archiveNo: '',
          archivedAt: undefined,
          contactName: '',
          signedAt: undefined,
          ownerId: undefined,
          projectType: undefined,
          qualityDeposit: undefined,
          projectPeriod: '',
          items: [blankItem()],
          paymentPlans: [blankPayment()],
          invoiceProfileId: undefined,
          invoiceSnapshot: undefined,
        };
    if (form.value.customerId) await loadInvoiceProfiles(form.value.customerId);
  } catch {
    message.error('合同编辑页数据加载失败，请刷新后重试');
  }
}
onMounted(load);
</script>

<template>
  <Page auto-content-height>
    <div class="mx-auto max-w-[1440px] pb-8">
      <div
        class="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-6 py-4 shadow-sm"
      >
        <div>
          <div class="mb-1 flex items-center gap-3">
            <h1 class="m-0 text-xl font-semibold text-foreground">
              {{ editingId === 'new' ? '新增合同' : '编辑合同' }}
            </h1>
            <span
              class="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
              >合同台账</span>
          </div>
          <p class="m-0 text-sm text-muted-foreground">
            请按顺序完善信息，带
            <span class="text-red-500">*</span> 的字段为必填项
          </p>
        </div>
        <Space>
          <Button @click="router.push('/operations/contract/list')">
取消
</Button>
          <Button :loading="saving" @click="submit(true)">暂存草稿</Button>
          <Button type="primary" :loading="saving" @click="submit(false)">
保存合同
</Button>
        </Space>
      </div>

      <Form layout="vertical">
        <ContractSection
          :number="1"
          title="基本信息"
          description="合同归属、客户及项目基础资料"
        >
          <div
            class="grid grid-cols-1 gap-x-6 px-6 pt-5 md:grid-cols-2 lg:grid-cols-3"
          >
            <Form.Item label="项目编号" required>
<Input
                v-model:value="form.projectNo"
                placeholder="请输入项目编号"
            />
</Form.Item>
            <Form.Item label="合同名称" required>
<Input
                v-model:value="form.contractName"
                placeholder="请输入合同名称"
            />
</Form.Item>
            <Form.Item label="甲方单位" required>
<Select
                v-model:value="form.customerId"
                allow-clear
                show-search
                option-filter-prop="label"
                class="w-full"
                :options="
                  customers.map((x: any) => ({ label: x.name, value: x.id }))
                "
                placeholder="请选择客户"
                @change="
                  (value: any) => {
                    form.invoiceProfileId = undefined;
                    form.invoiceSnapshot = undefined;
                    loadInvoiceProfiles(String(value || ''));
                  }
                "
            />
</Form.Item>
            <Form.Item label="开票信息">
              <Select
                v-model:value="form.invoiceProfileId"
                allow-clear
                show-search
                class="w-full"
                placeholder="默认使用当前有效资料"
                :options="
                  invoiceProfiles.map((x: any) => ({
                    label: `${x.invoiceTitle}（${x.taxpayerNo}）${x.isCurrent ? '·当前有效' : '·历史'}`,
                    value: x.id,
                  }))
                "
                @change="
                  (value: any) => selectInvoiceProfile(String(value || ''))
                "
              />
              <div
                v-if="form.invoiceSnapshot"
                class="mt-1 text-xs text-muted-foreground"
              >
                已保存快照：{{ form.invoiceSnapshot.invoiceTitle }} /
                {{ form.invoiceSnapshot.taxpayerNo }}
              </div>
            </Form.Item>
            <Form.Item label="项目名称">
<Input
                v-model:value="form.projectName"
                placeholder="请输入项目名称"
            />
</Form.Item>
            <Form.Item label="项目类型">
<Select
                v-model:value="form.projectType"
                allow-clear
                class="w-full"
                :options="projectTypes"
                placeholder="请选择项目类型"
            />
</Form.Item>
            <Form.Item label="市场负责人">
<Select
                v-model:value="form.ownerId"
                allow-clear
                class="w-full"
                :options="
                  sales.map((x: any) => ({ label: x.realName, value: x.id }))
                "
                placeholder="请选择负责人"
            />
</Form.Item>
            <Form.Item label="联系人">
<Input
                v-model:value="form.contactName"
                placeholder="请输入联系人"
            />
</Form.Item>
            <Form.Item label="签订时间">
<DatePicker
                v-model:value="form.signedAt"
                value-format="YYYY-MM-DD"
                class="w-full"
            />
</Form.Item>
            <Form.Item label="项目周期">
<Input
                v-model:value="form.projectPeriod"
                placeholder="例如：12个月"
            />
</Form.Item>
            <Form.Item label="归档编号">
<Input
                v-model:value="form.archiveNo"
                placeholder="请输入归档编号"
            />
</Form.Item>
            <Form.Item label="归档时间">
<DatePicker
                v-model:value="form.archivedAt"
                value-format="YYYY-MM-DD"
                class="w-full"
            />
</Form.Item>
            <Form.Item label="质保金">
<InputNumber
                v-model:value="form.qualityDeposit"
                v-bind="numberProps"
                class="quality-deposit-input w-full"
                placeholder="请输入质保金"
            />
</Form.Item>
          </div>
        </ContractSection>

        <ContractSection
          :number="2"
          title="合同内容明细"
          description="逐项填写服务内容、数量和价格"
        >
          <div class="flex justify-end border-b border-border bg-muted/60 px-6 py-4">
            <Button type="primary" ghost @click="form.items.push(blankItem())">
添加合同项
</Button>
          </div>
          <div class="p-6">
            <div class="overflow-x-auto rounded-lg border border-border">
              <table class="w-full min-w-[1050px] text-sm">
                <thead>
                  <tr class="bg-muted text-left text-foreground">
                    <th class="w-[24%] px-4 py-3">分项内容</th>
                    <th class="w-[12%] px-4 py-3">单位</th>
                    <th class="w-[13%] px-4 py-3">数量</th>
                    <th class="w-[15%] px-4 py-3">单价（元）</th>
                    <th class="w-[15%] px-4 py-3">总价（元）</th>
                    <th class="w-[15%] px-4 py-3">备注</th>
                    <th class="w-20 px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, index) in form.items"
                    :key="index"
                    class="border-t border-border"
                  >
                    <td class="px-2 py-2">
                      <AutoComplete
                        v-model:value="item.content"
                        class="w-full"
                        :options="itemOptions"
                        placeholder="可选择或手动输入"
                      />
                    </td>
                    <td class="px-2 py-2">
                      <Input v-model:value="item.unit" placeholder="例如：项" />
                    </td>
                    <td class="px-2 py-2">
                      <InputNumber
                        v-model:value="item.quantity"
                        v-bind="numberProps"
                        class="w-full"
                        placeholder="数量"
                        @change="recalc(item)"
                      />
                    </td>
                    <td class="px-2 py-2">
                      <InputNumber
                        v-model:value="item.unitPrice"
                        v-bind="numberProps"
                        class="w-full"
                        placeholder="单价"
                        @change="recalc(item)"
                      />
                    </td>
                    <td class="px-2 py-2">
                      <InputNumber
                        v-model:value="item.total"
                        v-bind="numberProps"
                        class="w-full"
                        placeholder="自动计算"
                      />
                    </td>
                    <td class="px-2 py-2">
                      <Input v-model:value="item.remark" placeholder="备注" />
                    </td>
                    <td class="px-2 py-2">
                      <Button
                        danger
                        type="link"
                        :disabled="form.items.length <= 1"
                        @click="form.items.splice(index, 1)"
                        >
删除
</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div
              class="mt-4 flex justify-end rounded-lg bg-muted px-4 py-3 text-sm font-semibold text-foreground"
            >
              合同内容合计：<span class="ml-1 text-base">¥ {{ total.toLocaleString() }}</span>
            </div>
          </div>
        </ContractSection>

        <ContractSection
          :number="3"
          title="合同附件"
          description="上传正式合同 PDF，单个文件不超过 20MB"
        >
          <div class="px-6 pb-7 pt-6">
            <div
              class="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/30 px-4 py-4"
            >
              <div>
                <div class="text-sm font-medium text-foreground">合同文件</div>
                <div class="mt-1 text-xs text-muted-foreground">
                  支持多个 PDF 文件，单个文件不超过 20MB
                </div>
              </div>
              <Upload
                :show-upload-list="false"
                accept="application/pdf,.pdf"
                :before-upload="handleAttachment"
              >
                <Button type="primary" :loading="uploading">
上传合同 PDF
</Button>
              </Upload>
            </div>
            <div v-if="attachments.length" class="mt-4 space-y-2">
              <div
                v-for="(file, index) in attachments"
                :key="file.id"
                class="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
              >
                <span
                  class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white"
                  >{{ index + 1 }}</span>
                <a
                  href="javascript:void(0)"
                  class="min-w-0 flex-1 truncate text-primary"
                  @click.prevent="previewAttachment(file)"
                  >{{ file.name }}</a>
                <span class="text-xs text-muted-foreground">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</span>
                <Button
                  type="link"
                  danger
                  @click="removeAttachment(file, index)"
                  >
移除
</Button>
              </div>
            </div>
            <div
              v-else
              class="mt-4 rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground"
            >
              暂未上传附件
            </div>
          </div>
        </ContractSection>

        <ContractSection
          :number="4"
          title="付款计划"
          description="设置付款节点和对应比例，正式保存时合计需为 100%"
        >
          <div class="flex justify-end border-b border-border bg-muted/60 px-6 py-4">
            <Button
              type="primary"
              ghost
              @click="form.paymentPlans.push(blankPayment())"
              >
新增付款条件
</Button>
          </div>
          <div class="p-6">
            <div
              v-for="(item, index) in form.paymentPlans"
              :key="index"
              class="mb-3 grid grid-cols-1 items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 md:grid-cols-12"
            >
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-card text-sm font-semibold text-muted-foreground shadow-sm"
              >
                {{ Number(index) + 1 }}
              </div>
              <Input
                v-model:value="item.condition"
                class="md:col-span-4"
                placeholder="付款条件，例如：合同签订后"
              />
              <InputNumber
                v-model:value="item.ratio"
                v-bind="{ ...numberProps, max: 100 }"
                class="md:col-span-2"
                placeholder="比例 %"
                @change="recalcPayment(item)"
              />
              <InputNumber
                v-model:value="item.amount"
                v-bind="numberProps"
                class="md:col-span-2"
                placeholder="金额（元）"
              />
              <Input
                v-model:value="item.remark"
                class="md:col-span-2"
                placeholder="备注"
              />
              <Button
                danger
                type="link"
                :disabled="form.paymentPlans.length <= 1"
                @click="form.paymentPlans.splice(index, 1)"
                >
删除
</Button>
            </div>
            <div
              class="flex flex-wrap justify-end gap-x-8 gap-y-2 border-t border-border pt-4 text-sm font-semibold"
            >
              <span
                :class="
                  ratioTotal === 100 ? 'text-green-600' : 'text-orange-500'
                "
                >比例合计：{{ ratioTotal.toFixed(2) }}%</span><span class="text-foreground">金额合计：¥ {{ amountTotal.toLocaleString() }}</span>
            </div>
          </div>
        </ContractSection>
      </Form>
      <div
        class="flex justify-end gap-3 rounded-xl border border-border bg-card px-6 py-4 shadow-sm"
      >
        <Button @click="router.push('/operations/contract/list')">取消</Button><Button :loading="saving" @click="submit(true)">暂存草稿</Button><Button type="primary" :loading="saving" @click="submit(false)">
保存合同
</Button>
      </div>
    </div>
  </Page>
</template>

<style scoped>
.quality-deposit-input {
  display: block;
  width: 100%;
}

.quality-deposit-input :deep(.ant-input-number) {
  width: 100%;
}

.quality-deposit-input :deep(.ant-input-number-input) {
  width: 100%;
}
</style>
