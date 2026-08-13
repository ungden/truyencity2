import { z } from 'zod';

const PortfolioSlotSchema = z.object({
  slotKey: z.string().regex(/^(HX|TH|DT)-\d{2}$/),
  group: z.enum(['fantasy', 'urban_era_dual_world']),
  genreLane: z.string().regex(/^[a-z][a-z0-9_]+$/),
}).strict();

/** Only the allocation survives the clean break; every story detail is rebuilt. */
export const FIRST_30_PORTFOLIO = z.array(PortfolioSlotSchema).length(30).parse([
  { slotKey: 'HX-01', group: 'fantasy', genreLane: 'xuanhuan_rules' },
  { slotKey: 'HX-02', group: 'fantasy', genreLane: 'xuanhuan_invincible_start' },
  { slotKey: 'HX-03', group: 'fantasy', genreLane: 'xuanhuan_global_awakening' },
  { slotKey: 'HX-04', group: 'fantasy', genreLane: 'xuanhuan_civilization_lord' },
  { slotKey: 'HX-05', group: 'fantasy', genreLane: 'xuanhuan_crafting_multiplier' },
  { slotKey: 'HX-06', group: 'fantasy', genreLane: 'xuanhuan_apocalypse_survival' },
  { slotKey: 'HX-07', group: 'fantasy', genreLane: 'xuanhuan_villain_fate' },
  { slotKey: 'HX-08', group: 'fantasy', genreLane: 'xuanhuan_beast_evolution' },
  { slotKey: 'HX-09', group: 'fantasy', genreLane: 'xuanhuan_dungeon_loot' },
  { slotKey: 'HX-10', group: 'fantasy', genreLane: 'xuanhuan_summon_army' },
  { slotKey: 'HX-11', group: 'fantasy', genreLane: 'xuanhuan_ranking_broadcast' },
  { slotKey: 'HX-12', group: 'fantasy', genreLane: 'xuanhuan_sign_in_growth' },
  { slotKey: 'HX-13', group: 'fantasy', genreLane: 'xuanhuan_territory_merge' },
  { slotKey: 'HX-14', group: 'fantasy', genreLane: 'xuanhuan_family_evolution' },
  { slotKey: 'HX-15', group: 'fantasy', genreLane: 'xuanhuan_simulation' },
  { slotKey: 'TH-01', group: 'fantasy', genreLane: 'xianxia_clan_growth' },
  { slotKey: 'TH-02', group: 'fantasy', genreLane: 'xianxia_clone_cultivation' },
  { slotKey: 'TH-03', group: 'fantasy', genreLane: 'xianxia_lifespan_reversal' },
  { slotKey: 'TH-04', group: 'fantasy', genreLane: 'xianxia_world_trade' },
  { slotKey: 'TH-05', group: 'fantasy', genreLane: 'xianxia_sect_domination' },
  { slotKey: 'DT-01', group: 'urban_era_dual_world', genreLane: 'dual_world_trade' },
  { slotKey: 'DT-02', group: 'urban_era_dual_world', genreLane: 'entertainment_creator_rebirth' },
  { slotKey: 'DT-03', group: 'urban_era_dual_world', genreLane: 'game_developer_rebirth' },
  { slotKey: 'DT-04', group: 'urban_era_dual_world', genreLane: 'urban_tycoon_counterattack' },
  { slotKey: 'DT-05', group: 'urban_era_dual_world', genreLane: 'era_foreknowledge_rise' },
  { slotKey: 'DT-06', group: 'urban_era_dual_world', genreLane: 'urban_collectibles_appraisal' },
  { slotKey: 'DT-07', group: 'urban_era_dual_world', genreLane: 'sports_career_system' },
  { slotKey: 'DT-08', group: 'urban_era_dual_world', genreLane: 'disaster_foreknowledge' },
  { slotKey: 'DT-09', group: 'urban_era_dual_world', genreLane: 'quick_world_missions' },
  { slotKey: 'DT-10', group: 'urban_era_dual_world', genreLane: 'city_profession_awakening' },
]);

if (new Set(FIRST_30_PORTFOLIO.map(slot => slot.slotKey)).size !== 30
  || new Set(FIRST_30_PORTFOLIO.map(slot => slot.genreLane)).size !== 30) {
  throw new Error('The first-30 allocation must contain unique slots and lanes.');
}
