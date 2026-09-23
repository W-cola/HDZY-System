/**
 * Global authority directive
 * Used for fine-grained control of component permissions
 * @Example v-access:role="[ROLE_NAME]" or v-access:role="ROLE_NAME"
 * @Example v-access:code="[ROLE_CODE]" or v-access:code="ROLE_CODE"
 */
import type { App, Directive, DirectiveBinding } from 'vue';

import { useAccess } from './use-access';

function isAccessible(
  el: Element,
  binding: DirectiveBinding<string | string[]>,
) {
  const {
    accessMode,
    hasAccessByCodes,
    hasAccessByRoles,
    hasDisabledAccessByCodes,
  } = useAccess();

  const value = binding.value;

  if (!value) return;
  const authMethod =
    accessMode.value === 'frontend' && binding.arg === 'role'
      ? hasAccessByRoles
      : hasAccessByCodes;

  const values = Array.isArray(value) ? value : [value];

  if (!authMethod(values)) {
    const isAdmin = hasAccessByCodes(['system:user:view']);
    const isDisabled =
      authMethod === hasAccessByCodes && hasDisabledAccessByCodes(values);
    if (isAdmin && isDisabled && el instanceof HTMLElement) {
      el.setAttribute('aria-disabled', 'true');
      el.setAttribute('title', '该功能已停用');
      el.style.pointerEvents = 'none';
      el.style.opacity = '0.45';
      return;
    }
    el?.remove();
  }
}

const mounted = (el: Element, binding: DirectiveBinding<string | string[]>) => {
  isAccessible(el, binding);
};

const authDirective: Directive = {
  mounted,
};

export function registerAccessDirective(app: App) {
  app.directive('access', authDirective);
}
