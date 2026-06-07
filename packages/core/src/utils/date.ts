export const toDateString = (value: Date | string, utc?: boolean) => {
  if (typeof value === 'string') {
    value = new Date(value);
  }
  return value.toLocaleDateString('ru-EU', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: utc ? undefined : 'Europe/Moscow',
  });
};
