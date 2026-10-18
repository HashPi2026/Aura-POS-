export function formatInr(amount: number, showSymbol: boolean = true): string {
  const symbol = showSymbol ? '₹' : '';
  const fixed = amount.toFixed(2);
  const [integerPart, decimalPart] = fixed.split('.');

  if (integerPart.length <= 3) {
    return `${symbol}${integerPart}.${decimalPart}`;
  }

  const lastThree = integerPart.slice(-3);
  const rest = integerPart.slice(0, -3);

  // Split rest in pairs of 2 from right to left
  const parts: string[] = [];
  let i = rest.length;
  while (i > 0) {
    const start = Math.max(0, i - 2);
    parts.unshift(rest.slice(start, i));
    i -= 2;
  }

  return `${symbol}${parts.join(',')},${lastThree}.${decimalPart}`;
}

export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatReceiptDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${mins}:${secs}`;
}
