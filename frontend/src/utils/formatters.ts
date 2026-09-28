/**
 * Display formatters for Indian Logistics Metrics
 */

export function formatINR(amountLakhs: number): string {
  if (amountLakhs >= 100) {
    return `₹${(amountLakhs / 100).toFixed(2)} Cr`;
  }
  return `₹${amountLakhs.toFixed(1)} L`;
}

export function formatRupeesRaw(amountRupees: number): string {
  if (amountRupees >= 10000000) {
    return `₹${(amountRupees / 10000000).toFixed(2)} Cr`;
  }
  if (amountRupees >= 100000) {
    return `₹${(amountRupees / 100000).toFixed(2)} L`;
  }
  return `₹${amountRupees.toLocaleString('en-IN')}`;
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('en-IN').format(Math.round(val));
}

export function formatPercent(val: number, decimals = 1): string {
  return `${val.toFixed(decimals)}%`;
}

export function formatMinutes(val: number): string {
  return `${val.toFixed(1)} min`;
}

export function formatDistance(val: number): string {
  return `${val.toFixed(1)} km`;
}

export function formatFuel(liters: number): string {
  return `${new Intl.NumberFormat('en-IN').format(Math.round(liters))} L`;
}

export function formatTons(tons: number): string {
  return `${tons.toFixed(1)} tons`;
}
