/**
 * Master template registry — maps genre slug → master template.
 *
 * Used by mass-instantiate script to pick the right template for each
 * reset project based on its `ai_story_projects.genre` column.
 *
 * Some genres without dedicated templates fall back to the closest
 * archetype:
 *   - khoai-xuyen → dong-nhan (both modular xuyên-không)
 *   - quy-tac-quai-dam → linh-di (both folk-horror)
 *   - ngu-thu-tien-hoa → tien-hiep (system-bound, beast portfolio)
 */

import type { TemplateBlueprint } from '../../src/services/story-engine/blueprint/template-instantiate';
import { TIEN_HIEP_RETURNING_EXPERT_TEMPLATE } from './tien-hiep-returning-expert';
import { DO_THI_REBORN_GENIUS_TEMPLATE } from './do-thi-modern-reborn-genius';
import { HUYEN_HUYEN_BLOODLINE_TEMPLATE } from './huyen-huyen-bloodline-war';
import { LICH_SU_QUAN_TRUONG_TEMPLATE } from './lich-su-xuyen-quan-truong';
import { KHOA_HUYEN_TECH_FUSION_TEMPLATE } from './khoa-huyen-tech-fusion';
import { DONG_NHAN_REWRITE_TEMPLATE } from './dong-nhan-author-rewrite';
import { VONG_DU_TOP_PLAYER_TEMPLATE } from './vong-du-top-player-rebirth';
import { DI_GIOI_LORD_BUILDER_TEMPLATE } from './di-gioi-lord-builder';
import { LINH_DI_CORONER_TEMPLATE } from './linh-di-folk-horror-coroner';
import { MAT_THE_HOARDER_TEMPLATE } from './mat-the-doomsday-hoarder';
import { KIEM_HIEP_SWORD_SAINT_TEMPLATE } from './kiem-hiep-sword-saint';
import { NGON_TINH_CEO_SOFT_TEMPLATE } from './ngon-tinh-ceo-soft';
import { QUAN_TRUONG_BUREAUCRAT_TEMPLATE } from './quan-truong-modern-bureaucrat';

export const TEMPLATE_REGISTRY: Record<string, TemplateBlueprint> = {
  // Direct mapping: 13 genres × 1 template each.
  'tien-hiep': TIEN_HIEP_RETURNING_EXPERT_TEMPLATE,
  'do-thi': DO_THI_REBORN_GENIUS_TEMPLATE,
  'huyen-huyen': HUYEN_HUYEN_BLOODLINE_TEMPLATE,
  'lich-su': LICH_SU_QUAN_TRUONG_TEMPLATE,
  'khoa-huyen': KHOA_HUYEN_TECH_FUSION_TEMPLATE,
  'dong-nhan': DONG_NHAN_REWRITE_TEMPLATE,
  'vong-du': VONG_DU_TOP_PLAYER_TEMPLATE,
  'di-gioi': DI_GIOI_LORD_BUILDER_TEMPLATE,
  'linh-di': LINH_DI_CORONER_TEMPLATE,
  'mat-the': MAT_THE_HOARDER_TEMPLATE,
  'kiem-hiep': KIEM_HIEP_SWORD_SAINT_TEMPLATE,
  'ngon-tinh': NGON_TINH_CEO_SOFT_TEMPLATE,
  'quan-truong': QUAN_TRUONG_BUREAUCRAT_TEMPLATE,

  // Fallback mappings for low-volume genres (Phase A reset distribution).
  'khoai-xuyen': DONG_NHAN_REWRITE_TEMPLATE,
  'quy-tac-quai-dam': LINH_DI_CORONER_TEMPLATE,
  'ngu-thu-tien-hoa': TIEN_HIEP_RETURNING_EXPERT_TEMPLATE,
};

export function pickTemplateForGenre(genre: string): TemplateBlueprint | null {
  return TEMPLATE_REGISTRY[genre] || null;
}

export function listSupportedGenres(): string[] {
  return Object.keys(TEMPLATE_REGISTRY).sort();
}
