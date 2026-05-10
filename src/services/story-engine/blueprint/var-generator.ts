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

  // Try up to 2 attempts (first temperature 0.5, retry temperature 0.3)
  let promptTokens = 0;
  let completionTokens = 0;
  let parsed: Record<string, string> | null = null;
  let lastRaw = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await callGemini(userPrompt, {
      model: 'deepseek-v4-flash',
      temperature: attempt === 1 ? 0.5 : 0.3,
      maxTokens: 2000,
      systemPrompt: SYSTEM_PROMPT,
    }, { jsonMode: true, tracking: { projectId: input.projectId, task: 'template_var_gen' } });
    lastRaw = response.content;
    promptTokens = response.promptTokens;
    completionTokens = response.completionTokens;
    parsed = parseJSON<Record<string, string>>(response.content);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) break;
    parsed = null;
  }

  if (!parsed) {
    throw new Error(`var-gen: failed to parse JSON after 2 attempts. Raw: ${lastRaw.slice(0, 500)}`);
  }

  // Validate every required var present + non-empty
  const missing = template.requiredVars.filter((v) => !parsed[v] || !parsed[v].trim());
  if (missing.length > 0) {
    throw new Error(`var-gen: missing required vars: ${missing.join(', ')}. Got: ${JSON.stringify(parsed)}`);
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
