export function formatDateToText(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatTextToDate(value) {
  const match = /^([0-3]\d)-([0-1]\d)-(\d{4})$/.exec(value.trim());
  if (!match) return '';
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}`);
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return '';
  }
  return date.toISOString().substring(0, 10);
}
