/**
 * What in the playbook has not been re-checked lately, and what the composed prompts
 * actually say right now.
 *
 *   npm run craft:audit
 *   npm run craft:audit -- --days=60 --print=premise
 *
 * Craft rots. This makes the rot visible instead of waiting for a reader to notice.
 */
import { activeRules, craftBlock, payoffKindIds, playbook, staleRules, CRAFT_ROLES, type CraftRole } from '@/services/serial/playbook';
import { SERIAL_PROMPT_VERSION } from '@/services/serial/prompts';

const value = (name: string): string | undefined =>
  process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const days = Number(value('days') ?? 120);
const printRole = value('print') as CraftRole | undefined;

const book = playbook();
console.log(JSON.stringify({
  playbookVersion: book.version,
  promptVersion: SERIAL_PROMPT_VERSION,
  payoffKinds: payoffKindIds().length,
  rulesByRole: Object.fromEntries(CRAFT_ROLES.map(role => [role, activeRules(role).length])),
  retired: book.rules.filter(rule => rule.status === 'retired').map(rule => rule.id),
}, null, 2));

const stale = staleRules(days);
console.log(`\nRules not re-checked in ${days} days: ${stale.length}`);
for (const rule of stale) {
  console.log(`  ${String(rule.ageDays).padStart(4)}d  ${rule.role.padEnd(8)} ${rule.id.padEnd(30)} ${rule.evidence}`);
}
if (stale.length === 0) console.log('  (none — every active rule has recent evidence)');

if (printRole) {
  if (!CRAFT_ROLES.includes(printRole)) {
    console.error(`\n--print must be one of: ${CRAFT_ROLES.join(', ')}`);
    process.exit(1);
  }
  console.log(`\n===== composed craft block for ${printRole} =====\n`);
  console.log(craftBlock(printRole));
}
