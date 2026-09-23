let mockTimeZone: null | string = null;

export const setTimezone = (timeZone: string) => {
  mockTimeZone = timeZone;
};

export const getTimezone = () => {
  return mockTimeZone;
};

export function formatSystemDateTime(date = new Date(), timeZone?: string) {
  const resolvedTimeZone = timeZone ?? mockTimeZone ?? 'Asia/Shanghai';
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: resolvedTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}
