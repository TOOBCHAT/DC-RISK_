/**
 * Formats a number as a compact USD string.
 * @param n - The dollar amount or numeric string.
 * @returns Compact USD string (e.g. 1500000 -> "$1.5M").
 */
export function fmtUSD(n: number | string): string {
  const num = Number(n);
  if (isNaN(num)) return '—';
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

/**
 * Formats a large number compactly: 1000000000 -> "1B", 37000 -> "37K"
 * @param n - The number or numeric string.
 * @returns Compact string representation.
 */
export function fmtCompact(n: number | string): string {
  const num = Number(n);
  if (isNaN(num)) return '—';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(num >= 10_000_000_000 ? 0 : 1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(num));
}

/**
 * Formats minutes into a human-readable duration.
 * @param mins - Duration in minutes.
 * @returns Readable duration (e.g. 90 -> "1.5h", 2880 -> "2.0d").
 */
export function fmtAge(mins: number): string {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${(mins / 60).toFixed(1)}h`;
  return `${(mins / 1440).toFixed(1)}d`;
}

/**
 * Truncates a Solana address for display: "7xKXtg...4WPj2r"
 * @param addr - Solana address.
 * @param chars - Number of characters to show at start/end.
 * @returns Truncated address.
 */
export function truncAddr(addr: string, chars = 4): string {
  if (!addr || addr.length <= chars * 2 + 3) return addr || '—';
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}
