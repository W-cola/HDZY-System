export function normalizeId(value: any): null | string | undefined {
  if (value === null || value === undefined || value === '')
    return value ?? null;
  if (typeof value === 'object')
    return normalizeId(value.value ?? value.key ?? value.id);
  return String(value);
}

export function isPositiveInteger(value: any): boolean {
  return Number.isInteger(Number(value)) && Number(value) >= 1;
}

export function nextSiblingSort(
  items: any[],
  parentId: null | string,
  field: 'deptId' | 'pid',
): number {
  const values = items
    .filter((item) => (item[field] ?? null) === parentId)
    .map((item) => Number(item.sort))
    .filter((value) => Number.isInteger(value) && value >= 1);
  return values.length > 0 ? Math.max(...values) + 1 : 1;
}
