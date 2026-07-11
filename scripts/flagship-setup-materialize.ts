import { readFileSync } from 'fs';
import { materializeFlagshipSetupForProject } from '../src/services/story-engine/flagship/setup-runtime';

async function main(): Promise<void> {
  const projectId = process.argv.find(value => value.startsWith('--project='))?.slice('--project='.length);
  const selectionPath = process.argv.find(value => value.startsWith('--selection='))?.slice('--selection='.length);
  if (!projectId || !selectionPath) throw new Error('Usage: npm run flagship:setup:materialize -- --project=<uuid> --selection=/absolute/selection.json');
  const selection = JSON.parse(readFileSync(selectionPath, 'utf8'));
  const result = await materializeFlagshipSetupForProject(projectId, selection);
  console.log(JSON.stringify({ projectId, selectedConceptId: result.launchPack.selectedConceptId, foundation: result.foundationScore, calls: result.callRoles, nextGate: 'human_review_story_spec' }, null, 2));
}
main().catch(error => { console.error(error); process.exit(1); });
