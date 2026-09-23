<script lang="ts" setup>
import { computed } from 'vue';

import { Button, Descriptions, message } from 'ant-design-vue';

import { downloadContractFileApi } from '#/api';

const props = defineProps<{ contract: any }>();
const detailContent = computed(() => {
  const row = props.contract || {};
  let stored: any = row.items && !Array.isArray(row.items) ? row.items : {};
  if (typeof stored === 'string') {
    try {
      stored = JSON.parse(stored);
    } catch {
      stored = {};
    }
  }
  return {
    ...row,
    items: stored.items || (Array.isArray(row.items) ? row.items : []),
    paymentPlans: stored.paymentPlans || [],
    attachments:
      Array.isArray(row.attachments) && row.attachments.length > 0
        ? row.attachments
        : stored.attachments ||
          (stored.attachment
            ? [stored.attachment]
            : row.attachment
              ? [row.attachment]
              : []),
    invoiceSnapshot: stored.invoiceSnapshot || row.invoiceSnapshot || null,
  };
});
async function previewAttachment(file: any) {
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
    message.error(error?.message || 'PDF 预览失败');
  }
}
</script>
<template>
  <div class="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
    <div class="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <div class="text-xs text-muted-foreground">合同名称</div>
          <div class="mt-1 text-lg font-semibold text-foreground">
            {{ detailContent.contractName || '-' }}
          </div>
        </div>
        <span
          class="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
          >{{ detailContent.status || '未设置' }}</span>
      </div>
      <Descriptions bordered :column="2" size="small">
        <Descriptions.Item label="项目编号">
{{
          detailContent.projectNo || detailContent.contractNo || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="甲方单位">
{{
          detailContent.customerName || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="项目名称">
{{
          detailContent.projectName || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="项目类型">
{{
          detailContent.projectType || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="市场负责人">
{{
          detailContent.ownerName || '未分配'
        }}
</Descriptions.Item>
        <Descriptions.Item label="联系人">
{{
          detailContent.contactName || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="签订时间">
{{
          detailContent.signedAt || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="项目周期">
{{
          detailContent.projectPeriod || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="合同金额">
¥
          {{
            Number(detailContent.amount || 0).toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
            })
          }}
</Descriptions.Item>
        <Descriptions.Item label="质保金">
{{
          detailContent.qualityDeposit == null
            ? '—'
            : `¥ ${Number(detailContent.qualityDeposit).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
        }}
</Descriptions.Item>
        <Descriptions.Item label="归档编号">
{{
          detailContent.archiveNo || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item label="归档时间">
{{
          detailContent.archivedAt || '-'
        }}
</Descriptions.Item>
        <Descriptions.Item
          v-if="detailContent.invoiceSnapshot"
          label="开票抬头"
          >
{{
            detailContent.invoiceSnapshot.invoiceTitle || '—'
          }}
</Descriptions.Item>
        <Descriptions.Item
          v-if="detailContent.invoiceSnapshot"
          label="纳税人识别号"
          >
{{
            detailContent.invoiceSnapshot.taxpayerNo || '—'
          }}
</Descriptions.Item>
        <Descriptions.Item label="备注" :span="2">
{{
          detailContent.remark || '-'
        }}
</Descriptions.Item>
      </Descriptions>
    </div>
    <div class="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 class="mb-3 text-base font-semibold text-foreground">合同内容明细</h3>
      <div
        v-if="detailContent.items.length"
        class="overflow-x-auto rounded-lg border border-border"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-muted text-left">
              <th class="px-3 py-2">分项内容</th>
              <th class="px-3 py-2">单位</th>
              <th class="px-3 py-2">数量</th>
              <th class="px-3 py-2">单价</th>
              <th class="px-3 py-2">总价</th>
              <th class="px-3 py-2">备注</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in detailContent.items"
              :key="index"
              class="border-t border-border"
            >
              <td class="px-3 py-2">{{ item.content || '-' }}</td>
              <td class="px-3 py-2">{{ item.unit || '-' }}</td>
              <td class="px-3 py-2">{{ item.quantity ?? '-' }}</td>
              <td class="px-3 py-2">
                ¥ {{ Number(item.unitPrice || 0).toLocaleString() }}
              </td>
              <td class="px-3 py-2">
                ¥ {{ Number(item.total || 0).toLocaleString() }}
              </td>
              <td class="px-3 py-2">{{ item.remark || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-sm text-muted-foreground">暂无合同明细</p>
    </div>
    <div class="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 class="mb-3 text-base font-semibold text-foreground">付款计划</h3>
      <div
        v-if="detailContent.paymentPlans.length"
        class="overflow-x-auto rounded-lg border border-border"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-muted text-left">
              <th class="px-3 py-2">付款条件</th>
              <th class="px-3 py-2">比例</th>
              <th class="px-3 py-2">金额</th>
              <th class="px-3 py-2">备注</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in detailContent.paymentPlans"
              :key="index"
              class="border-t border-border"
            >
              <td class="px-3 py-2">{{ item.condition || '-' }}</td>
              <td class="px-3 py-2">
                {{ Number(item.ratio || 0).toFixed(2) }}%
              </td>
              <td class="px-3 py-2">
                ¥ {{ Number(item.amount || 0).toLocaleString() }}
              </td>
              <td class="px-3 py-2">{{ item.remark || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-sm text-muted-foreground">暂无付款计划</p>
    </div>
    <div class="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div class="mb-3 text-base font-semibold text-foreground">合同附件</div>
      <div v-if="detailContent.attachments.length" class="space-y-2">
        <div
          v-for="(file, index) in detailContent.attachments"
          :key="file.id || index"
          class="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3 text-sm"
        >
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white"
            >{{ Number(index) + 1 }}</span><span class="min-w-0 flex-1 truncate text-muted-foreground">{{
            file.name || file.originalName || 'PDF 文件'
          }}</span><Button type="link" @click="previewAttachment(file)">
查看 PDF
</Button>
        </div>
      </div>
      <div v-else class="text-sm text-muted-foreground">暂无合同附件</div>
    </div>
  </div>
</template>
