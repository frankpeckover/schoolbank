export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatCurrencyAmount(amount: number, currencyName: string) {
  return `${Math.abs(amount)} ${currencyName}`;
}

export function formatSignedCurrencyAmount(
  amount: number,
  currencyName: string,
) {
  return `${amount > 0 ? "+" : ""}${amount} ${currencyName}`;
}
