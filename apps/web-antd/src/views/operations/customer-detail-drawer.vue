<script lang="ts" setup>
import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Select,
  Skeleton,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
} from 'ant-design-vue';

import {
  createCustomerInvoiceProfileApi,
  downloadContractFileApi,
  getContactListApi,
  getContractListApi,
  getCustomerInvoiceProfilesApi,
  getFollowUpListApi,
  getOpportunityListApi,
} from '#/api';

import CustomerTabPanel from './components/CustomerTabPanel.vue';
import { useCustomerDetail } from './composables/useCustomerDetail';
import ContractDetailContent from './contract-detail-content.vue';

const customer = ref<any>({});
const loading = ref(false);
const contacts = ref<any[]>([]);
const followUps = ref<any[]>([]);
const opportunities = ref<any[]>([]);
const contracts = ref<any[]>([]);
const contractDetail = ref<any>(null);
const contractDetailOpen = ref(false);
const overviewDetailOpen = ref(false);
const overviewDetailType = ref<
  'contacts' | 'contracts' | 'followups' | 'opportunities'
>('contacts');
const invoiceProfiles = ref<any[]>([]);
const invoiceModalOpen = ref(false);
const invoiceForm = ref<any>({ invoiceType: '增值税普通发票' });
const activeKey = ref('overview');
const [Drawer, drawerApi] = useVbenDrawer({
  destroyOnClose: true,
  showConfirmButton: false,
  showCancelButton: false,
  onOpenChange(open) {
    if (open) {
      customer.value = (drawerApi as any).getData?.()?.customer ?? {};
      load();
    }
  },
});
const { primaryContact, recentFollowUps, levelBarClass } = useCustomerDetail(
  customer,
  contacts,
  followUps,
);
function parseContractItems(value: any) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}
function openContractDetail(contract: any) {
  contractDetail.value = contract;
  contractDetailOpen.value = true;
}
function openOverviewDetail(
  type: 'contacts' | 'contracts' | 'followups' | 'opportunities',
) {
  overviewDetailType.value = type;
  overviewDetailOpen.value = true;
}
function contractAttachments(contract: any) {
  const stored = parseContractItems(contract.items);
  const attachments = contract.attachments ?? stored.attachments ?? [];
  if (Array.isArray(attachments)) return attachments;
  return attachments ? [attachments] : [];
}
async function previewContractAttachment(file: any) {
  if (!file?.id) return message.warning('附件信息不完整');
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
async function saveInvoiceProfile() {
  if (
    !invoiceForm.value.invoiceTitle?.trim() ||
    !invoiceForm.value.taxpayerNo?.trim()
  ) {
    message.warning('请填写发票抬头和纳税人识别号');
    return;
  }
  try {
    await createCustomerInvoiceProfileApi({
      ...invoiceForm.value,
      customerId: customer.value.id,
    });
    message.success('开票信息已保存，原资料已保留为历史记录');
    invoiceModalOpen.value = false;
    invoiceForm.value = { invoiceType: '增值税普通发票' };
    await load();
  } catch (error: any) {
    message.error(error?.message || '开票信息保存失败');
  }
}
async function load() {
  if (!customer.value.id) return;
  loading.value = true;
  try {
    const [
      contactResult,
      followResult,
      opportunityResult,
      contractResult,
      invoiceResult,
    ] = await Promise.all([
      getContactListApi({
        customerId: customer.value.id,
        page: 1,
        pageSize: 100,
      }),
      getFollowUpListApi({
        customerId: customer.value.id,
        page: 1,
        pageSize: 100,
      }),
      getOpportunityListApi({
        customerId: customer.value.id,
        page: 1,
        pageSize: 100,
      }),
      getContractListApi({
        customerId: customer.value.id,
        page: 1,
        pageSize: 100,
      }),
      getCustomerInvoiceProfilesApi({
        customerId: customer.value.id,
        page: 1,
        pageSize: 100,
      }),
    ]);
    contacts.value = contactResult.items ?? [];
    followUps.value = followResult.items ?? [];
    opportunities.value = opportunityResult.items ?? [];
    contracts.value = contractResult.items ?? [];
    invoiceProfiles.value = invoiceResult.items ?? [];
  } finally {
    loading.value = false;
  }
}
const contactColumns = [
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '职位', dataIndex: 'position', key: 'position' },
  { title: '联系方式', dataIndex: 'mobile', key: 'mobile' },
  { title: '负责业务', dataIndex: 'contactBusiness', key: 'contactBusiness' },
  { title: '联系人角色', dataIndex: 'contactRole', key: 'contactRole' },
  { title: '状态', dataIndex: 'status', key: 'status' },
];
const invoiceHistoryColumns = [
  { title: '发票抬头', dataIndex: 'invoiceTitle', key: 'invoiceTitle' },
  { title: '纳税人识别号', dataIndex: 'taxpayerNo', key: 'taxpayerNo' },
  { title: '发票类型', dataIndex: 'invoiceType', key: 'invoiceType' },
  { title: '生效日期', dataIndex: 'effectiveFrom', key: 'effectiveFrom' },
  { title: '失效日期', dataIndex: 'effectiveTo', key: 'effectiveTo' },
  { title: '变更原因', dataIndex: 'changeReason', key: 'changeReason' },
];
</script>
<template>
  <Drawer title="客户详情" class="w-full max-w-180">
    <Skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
    <template v-else>
      <Card
        size="small"
        class="mb-4 customer-summary-card"
        :class="[levelBarClass]"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-xl font-semibold">
              {{ customer.name || '客户详情' }}
            </div>
            <div class="mt-1 text-gray-500">
              {{ customer.shortName || '—' }} ·
              {{ customer.industry || '未填写行业' }}
            </div>
          </div>
          <div class="flex gap-2">
            <Tag :color="customer.status === 1 ? 'success' : 'error'">
              {{ customer.status === 1 ? '正常' : '停用' }}
</Tag><Tag color="blue"> {{ customer.level || '普通' }}客户 </Tag>
          </div>
        </div>
        <Descriptions class="mt-4" :column="2" size="small">
          <Descriptions.Item label="客户类型">
            {{ customer.type || '—' }}
</Descriptions.Item><Descriptions.Item label="所在地区">
            {{ customer.region || '—' }}
</Descriptions.Item><Descriptions.Item label="联系电话">
            {{ customer.phone || '—' }}
</Descriptions.Item><Descriptions.Item label="客户来源">
            {{ customer.source || '—' }}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Tabs v-model:active-key="activeKey">
        <Tabs.TabPane key="overview" tab="概览">
          <div class="customer-overview">
            <div class="grid grid-cols-3 gap-3">
              <Card
                size="small"
                class="cursor-pointer transition-shadow hover:shadow-md"
                @click="openOverviewDetail('contacts')"
              >
                <Statistic
                  title="联系人"
                  :value="contacts.length"
                  suffix="人"
                />
              </Card>
              <Card
                size="small"
                class="cursor-pointer transition-shadow hover:shadow-md"
                @click="openOverviewDetail('followups')"
              >
                <Statistic
                  title="跟进记录"
                  :value="followUps.length"
                  suffix="条"
                />
              </Card>
              <Card
                size="small"
                class="cursor-pointer transition-shadow hover:shadow-md"
                @click="openOverviewDetail('opportunities')"
              >
                <Statistic
                  title="销售机会"
                  :value="opportunities.length"
                  suffix="个"
                />
              </Card>
              <Card
                size="small"
                class="cursor-pointer transition-shadow hover:shadow-md"
                @click="openOverviewDetail('contracts')"
              >
                <Statistic title="合同" :value="contracts.length" suffix="份" />
              </Card>
            </div>
            <div class="overview-section-divider" aria-hidden="true"></div>
            <Card size="small" title="主要联系人" class="mt-8">
              <Empty
                v-if="!primaryContact"
                description="暂无联系人"
              /><Descriptions v-else :column="2" size="small">
                <Descriptions.Item label="姓名">
                  {{ primaryContact.name }}
</Descriptions.Item><Descriptions.Item label="职位">
                  {{ primaryContact.position || '—' }}
</Descriptions.Item><Descriptions.Item label="手机">
                  {{ primaryContact.mobile || '—' }}
</Descriptions.Item><Descriptions.Item label="邮箱">
                  {{ primaryContact.email || '—' }}
                </Descriptions.Item>
              </Descriptions>
</Card><Card size="small" title="最近跟进" class="mt-10 follow-up-card">
              <Empty
                v-if="!recentFollowUps.length"
                description="暂无跟进记录"
              /><Timeline v-else class="follow-up-timeline">
                <Timeline.Item v-for="item in recentFollowUps" :key="item.id">
                  <div class="follow-up-entry">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 font-medium text-foreground">
                        {{ item.subject || '跟进记录' }}
                      </div>
                      <span class="shrink-0 text-xs text-muted-foreground">
                        {{ item.followUpTime || '—' }}
                      </span>
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {{ item.contactName || '未指定联系人' }} ·
                      {{ item.followUpType || '常规跟进' }}
                    </div>
                    <div class="mt-2 text-sm leading-6 text-foreground">
                      {{ item.result || item.content || '暂无跟进内容' }}
                    </div>
                  </div>
                </Timeline.Item>
              </Timeline>
            </Card>
            <Card size="small" title="销售机会" class="mt-10">
              <Empty v-if="!opportunities.length" description="暂无销售机会" />
              <div v-else class="space-y-3">
                <div
                  v-for="item in opportunities"
                  :key="item.id"
                  class="rounded border border-gray-200 p-3"
                >
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-medium">{{ item.name }}</span>
                    <Tag
                      :color="
                        item.status === '进行中'
                          ? 'blue'
                          : item.status === '赢单'
                            ? 'success'
                            : 'default'
                      "
                    >
                      {{ item.status }}
                    </Tag>
                  </div>
                  <div class="mt-2 text-xs text-gray-500">
                    阶段：{{ item.stage || '—' }} · 负责人：{{
                      item.ownerName || '—'
                    }}
                  </div>
                  <div class="mt-1 text-xs text-gray-500">
                    金额：¥{{ Number(item.amount || 0).toLocaleString() }} ·
                    概率：{{ item.probability ?? 0 }}%
                  </div>
                  <div v-if="item.nextPlan" class="mt-1 text-sm text-gray-600">
                    下一步：{{ item.nextPlan }}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane
          key="opportunities"
          :tab="`销售机会（${opportunities.length}）`"
        >
          <Table
            :columns="[
              { title: '机会名称', dataIndex: 'name', key: 'name' },
              { title: '阶段', dataIndex: 'stage', key: 'stage' },
              { title: '状态', dataIndex: 'status', key: 'status' },
              { title: '负责人', dataIndex: 'ownerName', key: 'ownerName' },
              { title: '金额', dataIndex: 'amount', key: 'amount' },
            ]"
            :data-source="opportunities"
            :pagination="false"
            row-key="id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'amount'">
                ¥{{ Number(record.amount || 0).toLocaleString() }}
              </template>
              <template v-else-if="column.key === 'status'">
                <Tag
                  :color="
                    record.status === '进行中'
                      ? 'blue'
                      : record.status === '赢单'
                        ? 'success'
                        : 'default'
                  "
                >
                  {{ record.status }}
                </Tag>
              </template>
            </template>
          </Table>
        </Tabs.TabPane>
        <Tabs.TabPane key="contacts" :tab="`联系人（${contacts.length}）`">
          <Table
            :columns="contactColumns"
            :data-source="contacts"
            :pagination="false"
            row-key="id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                {{ record.name }}
                <Tag v-if="record.isPrimary" color="gold">主要</Tag>
</template><template v-else-if="column.key === 'status'">
                <Tag :color="record.status === '正常' ? 'success' : 'default'">
                  {{ record.status }}
                </Tag>
              </template>
            </template>
          </Table>
        </Tabs.TabPane>
        <Tabs.TabPane key="followups" :tab="`跟进记录（${followUps.length}）`">
          <Timeline v-if="followUps.length">
            <Timeline.Item v-for="item in followUps" :key="item.id">
              <div class="font-medium">{{ item.subject }}</div>
              <div class="text-xs text-gray-500">
                {{ item.followUpTime }} · {{ item.ownerName || '—' }} ·
                {{ item.followUpType }}
              </div>
              <div class="mt-1">{{ item.content }}</div>
              <div class="text-sm text-gray-500">
                下一步：{{ item.nextPlan || '—' }}
              </div>
            </Timeline.Item>
</Timeline><Empty v-else description="暂无跟进记录" />
        </Tabs.TabPane>
        <Tabs.TabPane key="invoice" tab="开票信息">
          <div class="mb-3 flex justify-end">
            <Button type="primary" @click="invoiceModalOpen = true">
              新增开票信息
            </Button>
          </div>
          <Empty v-if="!invoiceProfiles.length" description="暂无开票信息" />
          <template v-else>
            <Card
              v-if="invoiceProfiles.find((item) => item.isCurrent)"
              size="small"
              class="invoice-current-card"
            >
              <div class="mb-3 flex items-center justify-between">
                <div class="text-base font-medium">当前有效资料</div>
                <Tag color="success">当前有效</Tag>
              </div>
              <Descriptions
                bordered
                size="small"
                :column="2"
                class="invoice-descriptions"
              >
                <Descriptions.Item label="发票抬头">
                  {{
                    invoiceProfiles.find((item) => item.isCurrent)
                      ?.invoiceTitle || '—'
                  }}
                </Descriptions.Item>
                <Descriptions.Item label="纳税人识别号">
                  {{
                    invoiceProfiles.find((item) => item.isCurrent)
                      ?.taxpayerNo || '—'
                  }}
                </Descriptions.Item>
                <Descriptions.Item label="发票类型">
                  {{
                    invoiceProfiles.find((item) => item.isCurrent)
                      ?.invoiceType || '—'
                  }}
                </Descriptions.Item>
                <Descriptions.Item label="接收邮箱">
                  {{
                    invoiceProfiles.find((item) => item.isCurrent)
                      ?.invoiceEmail || '—'
                  }}
                </Descriptions.Item>
                <Descriptions.Item label="注册地址">
                  {{
                    invoiceProfiles.find((item) => item.isCurrent)
                      ?.registeredAddress || '—'
                  }}
                </Descriptions.Item>
                <Descriptions.Item label="注册电话">
                  {{
                    invoiceProfiles.find((item) => item.isCurrent)
                      ?.registeredPhone || '—'
                  }}
                </Descriptions.Item>
                <Descriptions.Item label="开户银行">
                  {{
                    invoiceProfiles.find((item) => item.isCurrent)?.bankName ||
                    '—'
                  }}
                </Descriptions.Item>
                <Descriptions.Item label="银行账号">
                  {{
                    invoiceProfiles.find((item) => item.isCurrent)
                      ?.bankAccount || '—'
                  }}
                </Descriptions.Item>
                <Descriptions.Item label="接收电话">
                  {{
                    invoiceProfiles.find((item) => item.isCurrent)
                      ?.invoicePhone || '—'
                  }}
                </Descriptions.Item>
                <Descriptions.Item label="生效日期">
                  {{
                    invoiceProfiles.find((item) => item.isCurrent)
                      ?.effectiveFrom || '—'
                  }}
                </Descriptions.Item>
              </Descriptions>
            </Card>
            <Card
              v-if="invoiceProfiles.some((item) => !item.isCurrent)"
              size="small"
              class="mt-3"
              title="历史版本"
            >
              <Table
                size="small"
                :pagination="false"
                :data-source="invoiceProfiles.filter((item) => !item.isCurrent)"
                :columns="invoiceHistoryColumns"
                row-key="id"
                :scroll="{ x: 760 }"
              />
            </Card>
          </template>
          <Modal
            v-model:open="invoiceModalOpen"
            title="新增开票信息"
            ok-text="保存"
            cancel-text="取消"
            @ok="saveInvoiceProfile"
          >
            <Form layout="vertical">
              <Form.Item label="发票抬头" required>
                <Input v-model:value="invoiceForm.invoiceTitle" />
</Form.Item><Form.Item label="纳税人识别号" required>
                <Input v-model:value="invoiceForm.taxpayerNo" />
</Form.Item><Form.Item label="发票类型">
                <Select
                  v-model:value="invoiceForm.invoiceType"
                  :options="[
                    { label: '增值税普通发票', value: '增值税普通发票' },
                    { label: '增值税专用发票', value: '增值税专用发票' },
                  ]"
                />
</Form.Item><Form.Item label="注册地址">
                <Input
                  v-model:value="invoiceForm.registeredAddress"
                />
</Form.Item><Form.Item label="开户银行">
                <Input v-model:value="invoiceForm.bankName" />
</Form.Item><Form.Item label="银行账号">
                <Input v-model:value="invoiceForm.bankAccount" />
</Form.Item><Form.Item label="接收邮箱">
                <Input v-model:value="invoiceForm.invoiceEmail" />
              </Form.Item>
            </Form>
          </Modal>
        </Tabs.TabPane>
        <Tabs.TabPane key="contracts" :tab="`合同情况（${contracts.length}）`">
          <Empty v-if="!contracts.length" description="当前客户暂无关联合同" />
          <div v-else class="space-y-4">
            <Card
              v-for="(contract, index) in contracts"
              :key="contract.id"
              size="small"
              class="contract-card cursor-pointer transition-shadow hover:shadow-md"
              @click="openContractDetail(contract)"
            >
              <div class="mb-3 flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-base font-medium text-foreground">
                    {{ contract.contractName || '未命名合同' }}
                  </div>
                  <div class="mt-1 text-xs text-muted-foreground">
                    {{
                      contract.contractNo ||
                      contract.projectNo ||
                      '暂无项目编号'
                    }}
                    · 第 {{ contracts.length - index }} 份
                  </div>
                </div>
                <Tag :color="contract.status === '执行中' ? 'blue' : 'default'">
                  {{ contract.status || '未设置状态' }}
                </Tag>
              </div>
              <Descriptions bordered size="small" :column="2">
                <Descriptions.Item label="合同金额">
                  ¥
                  {{
                    Number(contract.amount || 0).toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                    })
                  }}
                </Descriptions.Item>
                <Descriptions.Item label="项目类型">
                  {{ contract.projectType || '—' }}
                </Descriptions.Item>
                <Descriptions.Item label="项目名称">
                  {{ contract.projectName || '—' }}
                </Descriptions.Item>
                <Descriptions.Item label="市场负责人">
                  {{ contract.ownerName || '未分配' }}
                </Descriptions.Item>
                <Descriptions.Item label="签订时间">
                  {{ contract.signedAt || '—' }}
                </Descriptions.Item>
                <Descriptions.Item label="项目周期">
                  {{ contract.projectPeriod || '—' }}
                </Descriptions.Item>
                <Descriptions.Item label="质保金">
                  {{
                    contract.qualityDeposit == null
                      ? '—'
                      : `¥ ${Number(contract.qualityDeposit).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
                  }}
                </Descriptions.Item>
                <Descriptions.Item label="归档信息">
                  {{ contract.archiveNo || '未归档'
                  }}{{ contract.archivedAt ? ` · ${contract.archivedAt}` : '' }}
                </Descriptions.Item>
              </Descriptions>
              <div
                v-if="contractAttachments(contract).length"
                class="mt-3 border-t border-border pt-3"
              >
                <div class="mb-2 text-sm font-medium text-foreground">
                  合同附件
                </div>
                <div class="flex flex-col gap-2">
                  <div
                    v-for="(file, fileIndex) in contractAttachments(contract)"
                    :key="file.id || fileIndex"
                    class="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span class="min-w-0 truncate">{{
                      file.name ||
                      file.originalName ||
                      `合同附件${fileIndex + 1}.pdf`
                    }}</span>
                    <Button
                      type="link"
                      size="small"
                      @click.stop="previewContractAttachment(file)"
                    >
                      预览
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </Tabs.TabPane>
      </Tabs>
    </template>
    <Modal
      v-model:open="overviewDetailOpen"
      :title="
        overviewDetailType === 'contacts'
          ? '联系人详情'
          : overviewDetailType === 'followups'
            ? '跟进记录详情'
            : overviewDetailType === 'opportunities'
              ? '销售机会详情'
              : '合同列表'
      "
      :width="900"
      :footer="null"
      centered
    >
      <CustomerTabPanel v-if="overviewDetailType === 'contacts'">
<Table
          :columns="contactColumns"
          :data-source="contacts"
          :pagination="false"
          row-key="id"
          size="small"
      />
</CustomerTabPanel>
      <Timeline
        v-else-if="overviewDetailType === 'followups'"
        class="follow-up-timeline"
      >
        <Timeline.Item v-for="item in followUps" :key="item.id">
          <div class="font-medium">{{ item.subject || '跟进记录' }}</div>
          <div class="text-xs text-gray-500">
            {{ item.followUpTime || '—' }} · {{ item.ownerName || '—' }} ·
            {{ item.followUpType || '常规跟进' }}
          </div>
          <div class="mt-1">
            {{ item.content || item.result || '暂无跟进内容' }}
          </div>
          <div class="text-sm text-gray-500">
            下一步：{{ item.nextPlan || '—' }}
          </div>
        </Timeline.Item>
        <Empty v-if="!followUps.length" description="暂无跟进记录" />
      </Timeline>
      <div v-else-if="overviewDetailType === 'opportunities'" class="space-y-3">
        <Empty v-if="!opportunities.length" description="暂无销售机会" />
        <Card v-for="item in opportunities" :key="item.id" size="small">
          <div class="flex items-center justify-between gap-3">
            <span class="font-medium">{{ item.name }}</span><Tag>{{ item.status || '—' }}</Tag>
          </div>
          <div class="mt-2 text-sm text-gray-500">
            阶段：{{ item.stage || '—' }} · 负责人：{{
              item.ownerName || '—'
            }}
            · 金额：¥{{ Number(item.amount || 0).toLocaleString() }} · 概率：{{
              item.probability ?? 0
            }}%
          </div>
          <div v-if="item.nextPlan" class="mt-1 text-sm">
            下一步：{{ item.nextPlan }}
          </div>
        </Card>
      </div>
      <div v-else class="space-y-3">
        <Empty v-if="!contracts.length" description="暂无关联合同" />
        <Card
          v-for="contract in contracts"
          :key="contract.id"
          size="small"
          class="cursor-pointer"
          @click="openContractDetail(contract)"
        >
          <div class="flex items-center justify-between">
            <span>{{ contract.contractName || '未命名合同' }}</span><Tag color="blue">{{ contract.status || '未设置' }}</Tag>
          </div>
          <div class="mt-2 text-sm text-gray-500">
            {{ contract.projectNo || contract.contractNo || '—' }} · ¥{{
              Number(contract.amount || 0).toLocaleString()
            }}
          </div>
        </Card>
      </div>
    </Modal>
    <Modal
      v-model:open="contractDetailOpen"
      :title="
        contractDetail?.contractName
          ? `合同详情 · ${contractDetail.contractName}`
          : '合同详情'
      "
      :width="900"
      :footer="null"
      :closable="true"
      centered
    >
      <ContractDetailContent v-if="contractDetail" :contract="contractDetail" />
    </Modal>
  </Drawer>
</template>
<style scoped>
.customer-detail {
  padding-bottom: 12px;
}

.customer-overview {
  padding-top: 20px;
}

.customer-overview > :deep(.ant-card) {
  margin-top: 0;
}

.customer-overview > :deep(.ant-card) {
  background: hsl(var(--card));
  border-color: hsl(var(--border));
}

.customer-overview > :deep(.ant-card + .ant-card) {
  margin-top: 20px;
}

.customer-overview > :deep(.grid) {
  margin-bottom: 4px;
}

.overview-section-divider {
  height: 1px;
  margin: 28px 0 8px;
  background: hsl(var(--border));
}

.customer-overview > :deep(.grid .ant-card) {
  min-height: 82px;
}

.customer-overview > :deep(.grid .ant-card-body) {
  display: flex;
  align-items: center;
  min-height: 82px;
  padding: 16px 18px;
}

.customer-overview > :deep(.ant-card .ant-card-head) {
  min-height: 48px;
  padding: 0 18px;
}

.customer-overview > :deep(.ant-card .ant-card-body) {
  padding: 18px;
}

.customer-summary-card {
  border-top: 3px solid rgb(22 119 255);
}

.customer-summary-card.customer-level-key {
  border-top-color: #dc2626;
}

.customer-summary-card.customer-level-potential {
  border-top-color: #d97706;
}

.customer-summary-card.customer-level-normal {
  border-top-color: rgb(22 119 255);
}

.follow-up-card :deep(.ant-card-body) {
  padding: 20px 24px 12px;
}

.follow-up-timeline {
  margin: 0;
}

.follow-up-timeline :deep(.ant-timeline-item) {
  padding-bottom: 20px;
}

.follow-up-timeline :deep(.ant-timeline-item-last) {
  padding-bottom: 4px;
}

.follow-up-timeline :deep(.ant-timeline-item-content) {
  top: -4px;
  margin-inline-start: 16px;
}

.follow-up-entry {
  padding: 2px 0 4px;
}

.contract-card {
  background: hsl(var(--card));
  border-color: hsl(var(--border));
}

.invoice-current-card {
  background: hsl(var(--card));
  border-color: hsl(var(--border));
}

.invoice-descriptions :deep(.ant-descriptions-item-label) {
  width: 112px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  background: hsl(var(--muted) / 35%);
}

.invoice-descriptions :deep(.ant-descriptions-item-content) {
  color: hsl(var(--foreground));
  word-break: break-all;
}
</style>
