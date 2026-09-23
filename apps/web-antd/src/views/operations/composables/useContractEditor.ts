import type { Ref } from 'vue';

import { computed } from 'vue';
export function useContractEditor(form: Ref<any>) {
  const total = computed(() =>
    (form.value.items || []).reduce(
      (sum: number, item: any) =>
        sum +
        Number(
          item.total ??
            Number(item.quantity || 0) * Number(item.unitPrice || 0),
        ),
      0,
    ),
  );
  const ratioTotal = computed(() =>
    (form.value.paymentPlans || []).reduce(
      (sum: number, item: any) => sum + Number(item.ratio || 0),
      0,
    ),
  );
  const amountTotal = computed(() =>
    (form.value.paymentPlans || []).reduce(
      (sum: number, item: any) => sum + Number(item.amount || 0),
      0,
    ),
  );
  function recalc(item: any) {
    item.total = Number(item.quantity || 0) * Number(item.unitPrice || 0);
  }
  function recalcPayment(item: any) {
    item.amount = Number(
      ((total.value * Number(item.ratio || 0)) / 100).toFixed(2),
    );
  }
  return { total, ratioTotal, amountTotal, recalc, recalcPayment };
}
