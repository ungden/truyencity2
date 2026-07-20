import { z } from 'zod';

const PortfolioSlotSchema = z.object({
  slotKey: z.string().regex(/^(HX|TH|DT)-\d{2}$/),
  group: z.enum(['fantasy', 'urban_era_dual_world']),
  genreLane: z.string().regex(/^[a-z][a-z0-9_]+$/),
}).strict();

/** Only the allocation survives the clean break; every story detail is rebuilt. */
export const FIRST_30_PORTFOLIO = z.array(PortfolioSlotSchema).length(30).parse([
  { slotKey: 'HX-01', group: 'fantasy', genreLane: 'xuanhuan_rules' },
  { slotKey: 'HX-02', group: 'fantasy', genreLane: 'xuanhuan_high_martial' },
  { slotKey: 'HX-03', group: 'fantasy', genreLane: 'xuanhuan_beast_family' },
  { slotKey: 'HX-04', group: 'fantasy', genreLane: 'xuanhuan_civilization' },
  { slotKey: 'HX-05', group: 'fantasy', genreLane: 'xuanhuan_crafting' },
  { slotKey: 'HX-06', group: 'fantasy', genreLane: 'xuanhuan_apocalypse' },
  { slotKey: 'HX-07', group: 'fantasy', genreLane: 'xuanhuan_villain_fate' },
  { slotKey: 'TH-01', group: 'fantasy', genreLane: 'xianxia_clan' },
  { slotKey: 'TH-02', group: 'fantasy', genreLane: 'xianxia_sect_business' },
  { slotKey: 'TH-03', group: 'fantasy', genreLane: 'xianxia_research' },
  { slotKey: 'TH-04', group: 'fantasy', genreLane: 'xianxia_simulation' },
  { slotKey: 'TH-05', group: 'fantasy', genreLane: 'xianxia_healing_community' },
  { slotKey: 'DT-01', group: 'urban_era_dual_world', genreLane: 'era_coastal' },
  { slotKey: 'DT-02', group: 'urban_era_dual_world', genreLane: 'era_mountain' },
  { slotKey: 'DT-03', group: 'urban_era_dual_world', genreLane: 'era_industrial' },
  { slotKey: 'DT-04', group: 'urban_era_dual_world', genreLane: 'rural_leisure' },
  { slotKey: 'DT-05', group: 'urban_era_dual_world', genreLane: 'dual_world_trade' },
  { slotKey: 'DT-06', group: 'urban_era_dual_world', genreLane: 'entertainment_creator' },
  { slotKey: 'DT-07', group: 'urban_era_dual_world', genreLane: 'family_parenting' },
  { slotKey: 'DT-08', group: 'urban_era_dual_world', genreLane: 'urban_professional' },
  { slotKey: 'DT-09', group: 'urban_era_dual_world', genreLane: 'male_script_breaker' },
  { slotKey: 'DT-10', group: 'urban_era_dual_world', genreLane: 'game_community_economy' },
  { slotKey: 'DT-11', group: 'urban_era_dual_world', genreLane: 'urban_collectibles' },
  { slotKey: 'DT-12', group: 'urban_era_dual_world', genreLane: 'sports_career' },
  { slotKey: 'DT-13', group: 'urban_era_dual_world', genreLane: 'medical_professional' },
  { slotKey: 'DT-14', group: 'urban_era_dual_world', genreLane: 'infrastructure_engineering' },
  { slotKey: 'DT-15', group: 'urban_era_dual_world', genreLane: 'transport_logistics' },
  { slotKey: 'DT-16', group: 'urban_era_dual_world', genreLane: 'cozy_inn_food' },
  { slotKey: 'DT-17', group: 'urban_era_dual_world', genreLane: 'dual_world_relief' },
  { slotKey: 'DT-18', group: 'urban_era_dual_world', genreLane: 'quick_world_missions' },
]);

if (new Set(FIRST_30_PORTFOLIO.map(slot => slot.slotKey)).size !== 30
  || new Set(FIRST_30_PORTFOLIO.map(slot => slot.genreLane)).size !== 30) {
  throw new Error('The first-30 allocation must contain unique slots and lanes.');
}
