// TTS utilities — HTML stripping, text chunking for expo-speech

// ─── HTML → Plain Text ───────────────────────────────────────

const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&ndash;": "–",
  "&mdash;": "—",
  "&hellip;": "…",
  "&lsquo;": "\u2018",
  "&rsquo;": "\u2019",
  "&ldquo;": "\u201C",
  "&rdquo;": "\u201D",
};

/**
 * Strip HTML tags and decode entities, returning clean plain text.
 */
export function stripHtml(html: string): string {
  let text = html;

  // Remove <br>, <br/>, <br /> — replace with newline
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Replace block-level closing tags with newlines (paragraphs, divs, headings, li)
  text = text.replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode named HTML entities
  for (const [entity, char] of Object.entries(HTML_ENTITY_MAP)) {
    text = text.replaceAll(entity, char);
  }

  // Decode numeric entities (&#123; and &#x1A;)
  text = text.replace(/&#(\d+);/g, (_, num) =>
    String.fromCharCode(parseInt(num, 10))
  );
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  // Normalize whitespace: collapse multiple spaces/tabs to single space
  text = text.replace(/[ \t]+/g, " ");

  // Collapse 3+ newlines to 2
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

// ─── TTS Sanitizer ───────────────────────────────────────────
//
// Vietnamese tiểu thuyết uses em-dash (—) at the start of a paragraph as
// the dialogue marker (analogous to opening quotation). expo-speech's
// underlying TTS engines (iOS AVSpeechSynthesizer, Android TextToSpeech)
// pronounce `—` as "ngang" / "dash" in vi-VN, which sounds robotic.
// We replace the dialogue-marker dash with empty (the line break already
// signals a new speaker), and any inline em-dash with a comma so the
// engine inserts a natural pause instead of reading the punctuation.

/**
 * Normalize text for TTS: strip dashes, ellipsis, quote chars that the
 * engine pronounces literally in vi-VN. Apply AFTER stripHtml().
 */
export function sanitizeForTTS(text: string): string {
  let out = text;

  // Em-dash / en-dash at start of line (dialogue marker) → drop
  out = out.replace(/(^|\n)\s*[—–]\s*/g, "$1");

  // Em-dash / en-dash mid-sentence → comma (gives a natural pause)
  out = out.replace(/\s*[—–]\s*/g, ", ");

  // Lone hyphens used as dialogue markers (older imports) → drop at line start
  out = out.replace(/(^|\n)\s*-\s+/g, "$1");

  // Quotation marks → drop (engine sometimes reads "ngoặc kép")
  out = out.replace(/[“”„«»]/g, "");

  // Three+ dots collapse to single ellipsis (engine handles … fine, but ... → "ba chấm")
  out = out.replace(/\.{3,}/g, "…");

  // Asterisks / underscores / brackets sometimes leaked from markdown
  out = out.replace(/[*_]+/g, "");
  out = out.replace(/[\[\]]/g, "");

  // Normalize whitespace
  out = out.replace(/[ \t]+/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}

// ─── Text Chunking ───────────────────────────────────────────

// Android TTS engines typically have a ~4000 char limit per utterance.
// We split at ~3000 chars to be safe, at sentence boundaries.
const DEFAULT_MAX_CHUNK = 3000;

// Sentence-ending pattern: period, exclamation, question mark, or ellipsis
// followed by whitespace or end of string. Vietnamese-aware.
const SENTENCE_END = /[.!?…。！？]\s+/g;

/**
 * Split plain text into chunks at sentence boundaries,
 * each chunk at most `maxLength` characters.
 * Returns an array of non-empty text chunks.
 */
export function splitIntoChunks(
  text: string,
  maxLength: number = DEFAULT_MAX_CHUNK
): string[] {
  if (!text || text.length === 0) return [];
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining.trim());
      break;
    }

    // Find the last sentence boundary within maxLength
    const window = remaining.slice(0, maxLength);
    let splitAt = -1;

    // Search for sentence endings, take the last one within window
    SENTENCE_END.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = SENTENCE_END.exec(window)) !== null) {
      splitAt = match.index + match[0].length;
    }

    if (splitAt <= 0) {
      // No sentence boundary found — look for any newline
      const newlineIdx = window.lastIndexOf("\n");
      if (newlineIdx > 0) {
        splitAt = newlineIdx + 1;
      } else {
        // Last resort: split at last space
        const spaceIdx = window.lastIndexOf(" ");
        splitAt = spaceIdx > 0 ? spaceIdx + 1 : maxLength;
      }
    }

    const chunk = remaining.slice(0, splitAt).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    remaining = remaining.slice(splitAt);
  }

  return chunks.filter((c) => c.length > 0);
}

// ─── Speed Presets ───────────────────────────────────────────

export interface SpeedOption {
  label: string;
  rate: number;
}

export const TTS_SPEEDS: SpeedOption[] = [
  { label: "0.5x", rate: 0.5 },
  { label: "0.6x", rate: 0.6 },
  { label: "0.7x", rate: 0.7 },
  { label: "0.8x", rate: 0.8 },
  { label: "0.9x", rate: 0.9 },
  { label: "1x", rate: 1.0 },
  { label: "1.1x", rate: 1.1 },
  { label: "1.2x", rate: 1.2 },
  { label: "1.3x", rate: 1.3 },
  { label: "1.4x", rate: 1.4 },
  { label: "1.5x", rate: 1.5 },
  { label: "1.6x", rate: 1.6 },
  { label: "1.7x", rate: 1.7 },
  { label: "1.8x", rate: 1.8 },
  { label: "1.9x", rate: 1.9 },
  { label: "2x", rate: 2.0 },
];

export const TTS_LANGUAGE = "vi-VN";
