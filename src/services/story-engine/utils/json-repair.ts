/**
 * Story Engine v2 — JSON Repair Utilities
 *
 * Gemini often returns truncated JSON. These utilities fix common issues.
 */

/**
 * Extract JSON from AI response (may be wrapped in markdown code blocks).
 */
export function extractJSON(text: string): string {
  // 1. Try markdown code block first
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();

  // 2. Try raw completed JSON object/array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) return jsonMatch[1].trim();

  // 3. Try to find the start of a truncated JSON object or array
  // Find the first { or [ that is followed by a JSON key pattern or list pattern
  const startMatch = text.match(/(\{\s*"|\[\s*\{|\[\s*")/);
  if (startMatch && startMatch.index !== undefined) {
    return text.slice(startMatch.index).trim();
  }

  // 4. Fallback to first { or [ if found
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    return text.slice(firstBrace).trim();
  }
  if (firstBracket !== -1) {
    return text.slice(firstBracket).trim();
  }

  return text.trim();
}

/**
 * Escape literal newlines inside double-quoted strings in JSON.
 */
export function escapeLiteralNewlines(s: string): string {
  let result = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) {
        result += ch;
        escape = false;
      } else if (ch === '\\') {
        result += ch;
        escape = true;
      } else if (ch === '"') {
        result += ch;
        inString = false;
      } else if (ch === '\n') {
        result += '\\n';
      } else if (ch === '\r') {
        result += '\\r';
      } else if (ch === '\t') {
        result += '\\t';
      } else {
        result += ch;
      }
    } else {
      if (ch === '"') {
        inString = true;
      }
      result += ch;
    }
  }
  return result;
}

/**
 * Parse JSON with repair for truncated Gemini responses.
 * Handles Gemini's habit of wrapping JSON objects in arrays: [{...}] → {...}
 */
export function parseJSON<T>(text: string): T | null {
  const extracted = extractJSON(text);
  const raw = escapeLiteralNewlines(extracted);

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
  let repaired = '';
  try {
    repaired = escapeLiteralNewlines(repairTruncatedJSON(extracted));
    const parsed = JSON.parse(repaired);
    // Unwrap single-element array after repair
    if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === 'object') {
      return parsed[0] as T;
    }
    return parsed as T;
  } catch (err) {
    console.error(`[json-repair] Failed to parse repaired JSON. Error:`, err instanceof Error ? err.message : String(err));
    console.error(`[json-repair] Repaired text length: ${repaired.length}. Snippet of repaired text:`);
    console.error(repaired.slice(0, 500) + ' ... [TRUNCATED] ... ' + repaired.slice(-500));
    return null;
  }
}


/**
 * Repair truncated JSON by closing unclosed brackets and fixing trailing issues.
 */
function repairTruncatedJSON(input: string): string {
  let s = input.trim();

  // First, parse the string character by character to understand state
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;
  let stringStartIdx = -1;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      if (inString) {
        stringStartIdx = i;
      }
      continue;
    }
    if (inString) continue;

    if (ch === '{') openBraces++;
    if (ch === '}') openBraces--;
    if (ch === '[') openBrackets++;
    if (ch === ']') openBrackets--;
  }

  // If we ended inside a string, we need to decide whether it's a key or a value
  if (inString && stringStartIdx !== -1) {
    // Find the first non-whitespace character before stringStartIdx
    let beforeChar = '';
    for (let i = stringStartIdx - 1; i >= 0; i--) {
      if (!/\s/.test(s[i])) {
        beforeChar = s[i];
        break;
      }
    }

    if (beforeChar === ':') {
      // It's a VALUE string! Keep it and just close the quote
      s += '"';
    } else {
      // It's a KEY string or array element dở dang. Cut it off.
      s = s.slice(0, stringStartIdx);
    }
  }

  // Remove trailing partial key-value (ends with "key": or similar)
  s = s.replace(/,?\s*"[^"]*"\s*:\s*$/g, '');

  // Remove trailing commas before closing brackets
  s = s.replace(/,\s*([}\]])/g, '$1');

  // Remove trailing comma at end
  s = s.replace(/,\s*$/, '');

  // Count open brackets/braces again in the modified string
  openBraces = 0;
  openBrackets = 0;
  inString = false;
  escape = false;

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

  if (inString) s += '"';
  s = s.replace(/,\s*$/, '');

  // Close brackets
  for (let i = 0; i < openBrackets; i++) s += ']';
  for (let i = 0; i < openBraces; i++) s += '}';

  return s;
}
