/**
 * Story Engine v2 — JSON Repair Utilities
 *
 * Gemini often returns truncated JSON. These utilities fix common issues.
 */

/**
 * Extract JSON from AI response (may be wrapped in markdown code blocks).
 */
export function extractJSON(text: string): string {
  // Try markdown code block first
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();

  // Try raw JSON object/array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) return jsonMatch[1].trim();

  return text.trim();
}

/**
 * Parse JSON with repair for truncated Gemini responses.
 * Handles Gemini's habit of wrapping JSON objects in arrays: [{...}] → {...}
 */
export function parseJSON<T>(text: string): T | null {
  const raw = extractJSON(text);

  // Try direct parse first
  try {
    const parsed = JSON.parse(raw);
    // Unwrap single-element array (Gemini sometimes returns [{...}] instead of {...})
    if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'object') {
      return parsed[0] as T;
    }
    return parsed as T;
  } catch {
    // Fall through to repair
  }

  // Attempt repair
  try {
    const repaired = repairTruncatedJSON(raw);
    const parsed = JSON.parse(repaired);
    // Unwrap single-element array after repair
    if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'object') {
      return parsed[0] as T;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Repair truncated JSON by closing unclosed brackets and fixing trailing issues.
 */
function repairTruncatedJSON(input: string): string {
  let s = input.trim();

  // Remove trailing partial string (unclosed quote)
  if ((s.match(/"/g) || []).length % 2 !== 0) {
    // Find last unclosed quote and close it
    const lastQuote = s.lastIndexOf('"');
    const afterQuote = s.slice(lastQuote + 1);
    if (!afterQuote.includes('"')) {
      s = s.slice(0, lastQuote + 1) + '"';
    }
  }

  // Remove trailing partial key-value (ends with "key": or "key":)
  s = s.replace(/,?\s*"[^"]*"\s*:\s*$/g, '');

  // Remove trailing commas before closing brackets
  s = s.replace(/,\s*([}\]])/g, '$1');

  // Remove trailing comma at end
  s = s.replace(/,\s*$/, '');

  // Count and close unclosed brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;

  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    if (ch === '}') openBraces--;
    if (ch === '[') openBrackets++;
    if (ch === ']') openBrackets--;
  }

  // Close unclosed string
  if (inString) s += '"';

  // Clean up any new trailing issues
  s = s.replace(/,\s*$/, '');

  // Close brackets
  for (let i = 0; i < openBrackets; i++) s += ']';
  for (let i = 0; i < openBraces; i++) s += '}';

  return s;
}
