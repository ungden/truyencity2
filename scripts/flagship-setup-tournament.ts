import { runFlagshipConceptTournamentForProject } from '../src/services/story-engine/flagship/setup-runtime';

const projectId = process.argv.find(value => value.startsWith('--project='))?.slice('--project='.length);
if (!projectId) throw new Error('Usage: npm run flagship:setup:tournament -- --project=<uuid>');

const result = await runFlagshipConceptTournamentForProject(projectId);
console.log(JSON.stringify({
  projectId,
  status: result.artifact.status,
  finalists: result.artifact.ranking.finalistIds,
  rejectedNearDuplicates: result.artifact.rejectedNearDuplicateIds,
  calls: result.callRoles,
  nextGate: 'human_select_one_finalist',
}, null, 2));
