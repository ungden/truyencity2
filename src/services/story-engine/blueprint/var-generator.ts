/**
 * Auto-generate {{TOKEN}} vars for a TemplateBlueprint based on novel
 * title (and optional genre/topic hints) using DeepSeek.
 *
 * Workflow:
 *   1. Load template's requiredVars + varGuidance + optionalVars
 *   2. Build a JSON-mode prompt asking DeepSeek to emit a vars object
 *   3. Parse + validate (every required var present + non-empty)
 *   4. Return Record<string, string> ready for instantiateTemplate()
 *
 * The novel title is the only hard input. Genre is implicit (derived
 * from the template choice). Optional `extraContext` lets the caller
 * pass topic / mood / world hints if available.
 */

import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { TemplateBlueprint } from './template-instantiate';

export interface VarGenInput {
  /** Novel title — the primary signal. */
  title: string;
  /** Optional topic / theme / mood hints from `topic_prompt_hints` etc. */
  extraContext?: string;
  /** Optional explicit MC name override (skip AI for MC_NAME if provided). */
  mcNameOverride?: string;
  /** projectId for cost tracking. */
  projectId: string;
}

export interface VarGenResult {
  vars: Record<string, string>;
  /** Raw model output (for debug). */
  raw: string;
  promptTokens: number;
  completionTokens: number;
}

const SYSTEM_PROMPT = `Bạn là tác giả truyện đỉnh cấp Trung Quốc-Việt Nam, có nhiệm vụ tạo bộ biến số {{TOKEN}} cho master template blueprint của một bộ tiểu thuyết 1000 chương.

CHÍNH XÁC OUTPUT FORMAT: trả về DUY NHẤT 1 JSON object — không có text khác, không reasoning, không prefix, không suffix, không markdown. Bắt đầu output bằng "{" và kết thúc bằng "}".

Nhiệm vụ: cho title của bộ truyện, sinh giá trị cho TỪNG required var theo guidance đi kèm. Key = tên var (VD MC_NAME), value = string.

Yêu cầu:
- Mọi required var đều phải có giá trị non-empty.
- Giá trị bám sát title — nếu title đã có tên MC, dùng tên đó.
- Giá trị mang tone genre + setup phù hợp (huyền huyễn dùng tên Hán Việt, đô thị dùng tên hiện đại Việt Nam, đồng nhân match nguyên tác, etc.).
- Tránh trùng tên giữa các nhân vật / địa danh.
- KHÔNG include optional vars (chỉ requiredVars).
- KHÔNG markdown wrap, KHÔNG reasoning, KHÔNG giải thích — chỉ JSON thuần.

Ví dụ format đúng: {"MC_NAME":"Tiêu Diệp","MC_FAMILY":"Tiêu","HOMETOWN":"Lâm An phủ"}`;

export async function generateVarsForTemplate(
  template: TemplateBlueprint,
  input: VarGenInput,
): Promise<VarGenResult> {
  const guidanceLines = template.requiredVars.map((v) => {
    const g = template.varGuidance?.[v] || '(no guidance)';
    return `- ${v}: ${g}`;
  });

  const userPrompt = `Title: ${input.title}
Template: ${template.templateId}
Genre: ${template.genre}
${input.extraContext ? `Extra context: ${input.extraContext}\n` : ''}
${input.mcNameOverride ? `MC_NAME phải là: "${input.mcNameOverride}"` : ''}

Required vars + guidance:
${guidanceLines.join('\n')}

Trả về DUY NHẤT 1 JSON object với ${template.requiredVars.length} keys: ${template.requiredVars.join(', ')}.

Bắt đầu ngay bằng "{" — không có text trước.`;

  // Try up to 3 attempts. Attempt 1: standard. Attempt 2: lower temp +
  // higher tokens. Attempt 3: explicit missing-fields completion prompt
  // when partial JSON returned in attempt 2.
  let promptTokens = 0;
  let completionTokens = 0;
  let parsed: Record<string, string> | null = null;
  let lastRaw = '';
  let lastMissingMsg = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    let prompt = userPrompt;
    let temperature = 0.5;
    if (attempt === 2) temperature = 0.3;
    if (attempt === 3) {
      temperature = 0.2;
      // Explicit completion prompt with missing fields
      const missingNow = parsed
        ? template.requiredVars.filter((v) => !parsed![v] || !parsed![v].trim())
        : template.requiredVars;
      const partial = parsed
        ? `\nĐầu ra trước thiếu fields: ${missingNow.join(', ')}\nĐây là partial: ${JSON.stringify(parsed)}\n\nVUI LÒNG trả về JSON ĐẦY ĐỦ với TẤT CẢ ${template.requiredVars.length} keys, không bỏ sót.`
        : `\nVUI LÒNG trả về JSON đầy đủ ${template.requiredVars.length} keys: ${template.requiredVars.join(', ')}.`;
      prompt = userPrompt + partial;
    }

    const response = await callGemini(prompt, {
      model: 'deepseek-v4-flash',
      temperature,
      maxTokens: attempt === 1 ? 2000 : 4000,
      systemPrompt: SYSTEM_PROMPT,
    }, { jsonMode: true, tracking: { projectId: input.projectId, task: 'template_var_gen' } });
    lastRaw = response.content;
    promptTokens = response.promptTokens;
    completionTokens = response.completionTokens;
    const newParsed = parseJSON<Record<string, string>>(response.content);
    if (newParsed && typeof newParsed === 'object' && !Array.isArray(newParsed)) {
      // Merge with previous partial (in case attempt 3 fills gaps)
      parsed = { ...(parsed || {}), ...newParsed };
      // Check if all required vars present + non-empty
      const stillMissing = template.requiredVars.filter((v) => !parsed![v] || !parsed![v].trim());
      if (stillMissing.length === 0) break;
      lastMissingMsg = stillMissing.join(', ');
    }
  }

  if (!parsed) {
    throw new Error(`var-gen: failed to parse JSON after 3 attempts. Raw: ${lastRaw.slice(0, 500)}`);
  }

  // Validate every required var present + non-empty
  const missing = template.requiredVars.filter((v) => !parsed![v] || !parsed![v].trim());
  if (missing.length > 0) {
    throw new Error(`var-gen: missing required vars after 3 attempts: ${missing.join(', ')} (last: ${lastMissingMsg}). Got: ${JSON.stringify(parsed)}`);
  }

  // Strip out non-required keys (in case AI included optional)
  const allowedKeys = new Set([
    ...template.requiredVars,
    ...Object.keys(template.optionalVars || {}),
  ]);
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (allowedKeys.has(k) && typeof v === 'string') {
      vars[k] = v.trim();
    }
  }

  // Apply MC override if provided
  if (input.mcNameOverride && template.requiredVars.includes('MC_NAME')) {
    vars.MC_NAME = input.mcNameOverride;
  }

  return {
    vars,
    raw: lastRaw,
    promptTokens,
    completionTokens,
  };
}
