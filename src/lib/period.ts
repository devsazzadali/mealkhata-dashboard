// Helpers for working with the current accounting month (year+month)
export function currentPeriod(d: Date = new Date()) {
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function periodLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// First and (exclusive) next-month date in YYYY-MM-DD
export function periodRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
