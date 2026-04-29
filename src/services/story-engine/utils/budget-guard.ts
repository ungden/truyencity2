/**
 * Budget Guardrails (Phase 23 S5)
 *
 * Tracks monthly LLM spend and pauses cron when nearing limit.
 * Env: MONTHLY_BUDGET_USD (default $1500), BUDGET_HARD_PAUSE_PCT (default 100).
 */

import { getSupabase } from './supabase';

const DEFAULT_MONTHLY_BUDGET = 1500;
const SOFT_THRESHOLD_PCT = 80;  // alert at 80%
const SOFT_SPAWN_PAUSE_PCT = 90; // pause new spawns at 90%
const HARD_PAUSE_PCT = 100;     // pause all writing at 100%

export interface BudgetStatus {
  budgetUsd: number;
  spentUsd: number;
  pctUsed: number;
  shouldPauseSpawn: boolean;
  shouldPauseWrites: boolean;
  alertLevel: 'ok' | 'warn' | 'critical' | 'over';
}

export async function checkMonthlyBudget(): Promise<BudgetStatus> {
  const budgetUsd = parseFloat(process.env.MONTHLY_BUDGET_USD || String(DEFAULT_MONTHLY_BUDGET));

  // Get current month start (1st of month, 00:00 UTC)
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const db = getSupabase();
  const { data } = await db
    .from('cost_tracking')
    .select('cost')
    .gte('created_at', monthStart);

  const spentUsd = (data || []).reduce((sum: number, r: { cost: number | null }) => sum + (Number(r.cost) || 0), 0);
  const pctUsed = budgetUsd > 0 ? (spentUsd / budgetUsd) * 100 : 0;

  let alertLevel: BudgetStatus['alertLevel'] = 'ok';
  if (pctUsed >= HARD_PAUSE_PCT) alertLevel = 'over';
  else if (pctUsed >= SOFT_SPAWN_PAUSE_PCT) alertLevel = 'critical';
  else if (pctUsed >= SOFT_THRESHOLD_PCT) alertLevel = 'warn';

  return {
    budgetUsd,
    spentUsd,
    pctUsed,
    shouldPauseSpawn: pctUsed >= SOFT_SPAWN_PAUSE_PCT,
    shouldPauseWrites: pctUsed >= HARD_PAUSE_PCT,
    alertLevel,
  };
}
