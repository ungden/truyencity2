import { z } from 'zod';

export const PortfolioAudienceV1Schema = z.literal('male');
export const PortfolioGroupV1Schema = z.enum(['fantasy', 'urban_era_dual_world']);

export const GenreLaneV2Schema = z.enum([
  'xuanhuan_rules',
  'xuanhuan_high_martial',
  'xuanhuan_beast_family',
  'xuanhuan_civilization',
  'xuanhuan_crafting',
  'xuanhuan_apocalypse',
  'xianxia_clan',
  'xianxia_sect_business',
  'xianxia_research',
  'xianxia_simulation',
  'xuanhuan_villain_fate',
  'xianxia_healing_community',
  'era_coastal',
  'era_mountain',
  'era_industrial',
  'rural_leisure',
  'dual_world_trade',
  'entertainment_creator',
  'family_parenting',
  'urban_professional',
  'male_script_breaker',
  'game_community_economy',
  'urban_collectibles',
  'sports_career',
  'medical_professional',
  'infrastructure_engineering',
  'transport_logistics',
  'cozy_inn_food',
  'dual_world_relief',
  'quick_world_missions',
]);

export const AdvantageFamilyV1Schema = z.enum([
  'native',
  'rebirth',
  'transmigration',
  'script_awareness',
  'bounded_system',
  'dual_world',
  'simulation_loop',
]);

export const PortfolioWorldModeV1Schema = z.enum(['realistic', 'fictionalized', 'alternate_world']);
export const PromotionCohortV1Schema = z.enum(['opening_tournament', 'reserve', 'lab_reference']);

export type GenreLaneV2 = z.infer<typeof GenreLaneV2Schema>;
export type PortfolioAudienceV1 = z.infer<typeof PortfolioAudienceV1Schema>;
export type PortfolioGroupV1 = z.infer<typeof PortfolioGroupV1Schema>;
export type AdvantageFamilyV1 = z.infer<typeof AdvantageFamilyV1Schema>;
export type PortfolioWorldModeV1 = z.infer<typeof PortfolioWorldModeV1Schema>;
export type PromotionCohortV1 = z.infer<typeof PromotionCohortV1Schema>;
