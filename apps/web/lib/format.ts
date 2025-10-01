const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export function formatDate(value?: Date | string | null) {
  if (!value) return "";
  const parsed = typeof value === "string" ? new Date(value) : value;
  return dateFormatter.format(parsed);
}

export function formatCurrency(value: number) {
  return currencyFormatter.format(value ?? 0);
}
