export interface StatusCardRow {
  label: string;
  value: string | number;
}

export interface StatusCardOptions {
  title: string;
  rows: StatusCardRow[];
  footer?: string;
}

// ==========================================
// 🔤 CUSTOM TYPOGRAPHY ENGINE
// ==========================================
const UPPER_MAP: Record<string, string> = {
  A: "𝙰", B: "𝙱", C: "𝙲", D: "𝙳", E: "𝙴", F: "𝙵", G: "𝙶", H: "𝙷", I: "𝙸",
  J: "𝙹", K: "𝙺", L: "𝙻", M: "𝙼", N: "𝙽", O: "𝙾", P: "𝙿", Q: "𝚀", R: "𝚁",
  S: "𝚂", T: "𝚃", U: "𝚄", V: "𝚅", W: "𝚆", X: "𝚇", Y: "𝚈", Z: "𝚉"
};

const LOWER_MAP: Record<string, string> = {
  a: "α", b: "ᑲ", c: "𝖼", d: "ᑯ", e: "𝖾", f: "𝖿", g: "𝗀", h: "ɦ", i: "𝗂",
  j: "𝗃", k: "𝗄", l: "ᥣ", m: "ꭑ", n: "𐓣", o: "ⱺ", p: "ρ", q: "𝗊", r: "𝗋",
  s: "𝗌", t: "𝗍", u: "υ", v: "𝗏", w: "ω", x: "𝗑", y: "𝗒", z: "ƶ"
};

/**
 * Converts English alphanumeric text into the Underworld custom font,
 * while strictly preserving HTML tags (<b>, <code>, <blockquote>, etc.) intact.
 */
export function toCustomFont(text: string): string {
  let result = "";
  let insideTag = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Preserve Telegram HTML tags intact
    if (char === "<") {
      insideTag = true;
      result += char;
      continue;
    }

    if (insideTag) {
      result += char;
      if (char === ">") insideTag = false;
      continue;
    }

    if (UPPER_MAP[char]) {
      result += UPPER_MAP[char];
    } else if (LOWER_MAP[char]) {
      result += LOWER_MAP[char];
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Clean card layout using native Telegram blockquotes and custom typography (no ASCII tables).
 */
export function createStatusCard(options: StatusCardOptions): string {
  const titleText = toCustomFont(options.title);
  const rowsText = options.rows
    .map((row) => `• <b>${toCustomFont(row.label)}:</b> ${row.value}`)
    .join("\n");

  let card = `<b>${titleText}</b>\n\n<blockquote>${rowsText}</blockquote>`;

  if (options.footer) {
    card += `\n\n<i>${toCustomFont(options.footer)}</i>`;
  }

  return card;
}
