import { approveFlagshipCheckpointForProject } from '../src/services/story-engine/flagship/setup-runtime';

const projectId = process.argv.find(value => value.startsWith('--project='))?.slice('--project='.length);
const reviewer = process.argv.find(value => value.startsWith('--reviewer='))?.slice('--reviewer='.length);
const stage = process.argv.find(value => value.startsWith('--stage='))?.slice('--stage='.length);
const allowed = ['chapter_3', 'chapter_10', 'chapter_30', 'chapter_50'] as const;
if (!projectId || !reviewer || !allowed.includes(stage as typeof allowed[number])) {
  throw new Error('Usage: npm run flagship:approve-checkpoint -- --project=<uuid> --stage=chapter_3|chapter_10|chapter_30|chapter_50 --reviewer=<name>');
}
await approveFlagshipCheckpointForProject(projectId, stage as typeof allowed[number], reviewer);
console.log(JSON.stringify({ projectId, stage, approved: true }, null, 2));
