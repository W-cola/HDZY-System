import type { Ref } from 'vue';

import { computed } from 'vue';

export function useCustomerDetail(
  customer: Ref<any>,
  contacts: Ref<any[]>,
  followUps: Ref<any[]>,
) {
  const primaryContact = computed(
    () => contacts.value.find((item) => item.isPrimary) ?? contacts.value[0],
  );
  const recentFollowUps = computed(() => followUps.value.slice(0, 5));
  const levelBarClass = computed(
    () =>
      (
        ({
          潜在: 'customer-level-potential',
          重点: 'customer-level-key',
        }) as Record<string, string>
      )[String(customer.value.level)] || 'customer-level-normal',
  );
  return { primaryContact, recentFollowUps, levelBarClass };
}
