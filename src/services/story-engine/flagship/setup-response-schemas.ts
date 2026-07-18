import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CausalWorldV2Schema,
  CharacterDesignV2Schema,
  ConceptBatchV2Schema,
  ConceptRankingV2Schema,
  FlagshipLaunchPackV2Schema,
  OpeningTrialTransportV2Schema,
} from './setup-contracts';

function supportedSubset(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(supportedSubset);
  if (!value || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const constraintHints: string[] = [];
  if (typeof source.minLength === 'number') constraintHints.push(`minimum string length: ${source.minLength}`);
  if (typeof source.maxLength === 'number') constraintHints.push(`maximum string length: ${source.maxLength}`);
  for (const [key, child] of Object.entries(source)) {
    // Gemini structured output supports array cardinality constraints. Keep
    // them in the provider schema so discriminated pass/issues contracts are
    // constrained during decoding, then validate the response again in Zod.
    if (['$schema', 'pattern', 'minLength', 'maxLength'].includes(key)) continue;
    if (key === 'const') {
      result.enum = [child];
      continue;
    }
    result[key] = supportedSubset(child);
  }
  if (constraintHints.length) {
    const existing = typeof result.description === 'string' ? `${result.description} ` : '';
    result.description = `${existing}CONSTRAINTS: ${constraintHints.join('; ')}.`;
  }
  return result;
}

export const toGeminiResponseJsonSchema = (schema: Parameters<typeof zodToJsonSchema>[0]): Record<string, unknown> =>
  supportedSubset(zodToJsonSchema(schema, { $refStrategy: 'none', target: 'jsonSchema7' })) as Record<string, unknown>;

export const FLAGSHIP_SETUP_RESPONSE_SCHEMAS = Object.freeze({
  concept_lab: toGeminiResponseJsonSchema(ConceptBatchV2Schema),
  concept_judge: toGeminiResponseJsonSchema(ConceptRankingV2Schema),
  opening_simulator: toGeminiResponseJsonSchema(OpeningTrialTransportV2Schema),
  character_designer: toGeminiResponseJsonSchema(CharacterDesignV2Schema),
  causal_world: toGeminiResponseJsonSchema(CausalWorldV2Schema),
  launch_architect: toGeminiResponseJsonSchema(FlagshipLaunchPackV2Schema),
});
