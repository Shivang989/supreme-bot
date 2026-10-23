export interface CardRow {
  label: string; // e.g. "👤 PLAYER"
  value: string | number; // e.g. "Soul Reaper"
}

export interface CardOptions {
  title: string;          // e.g. "🎭 HEIST SUCCESSFUL"
  rows: CardRow[];
  footer: string;         // e.g. "⏰ COOLDOWN • 2s remaining"
  labelWidth?: number;    // default 10
  valueWidth?: number;    // default 18
}

function truncateAndPad(str: string | number, targetWidth: number): string {
  const text = String(str);
  if (text.length > targetWidth) {
    return text.substring(0, targetWidth - 1) + "…";
  }
  return text.padEnd(targetWidth, " ");
}

export function createStatusCard({
  title,
  rows,
  footer,
  labelWidth = 10,
  valueWidth = 18,
}: CardOptions): string {
  const topBorder = `┌${"─".repeat(labelWidth)}┬${"─".repeat(valueWidth)}┐`;
  const midBorder = `├${"─".repeat(labelWidth)}┼${"─".repeat(valueWidth)}┤`;
  const botBorder = `└${"─".repeat(labelWidth)}┴${"─".repeat(valueWidth)}┘`;

  const tableRows = rows
    .map(
      (r) =>
        `│${truncateAndPad(r.label, labelWidth)}│${truncateAndPad(r.value, valueWidth)}│`
    )
    .join(`\n${midBorder}\n`);

  return (
    `<b>${title}</b>\n\n` +
    `<pre>\n${topBorder}\n${tableRows}\n${botBorder}\n</pre>\n` +
    `<blockquote>${footer}</blockquote>`
  );
}
