import { approveFlagshipStorySpecForProject } from '../src/services/story-engine/flagship/setup-runtime';

const projectId = process.argv.find(value => value.startsWith('--project='))?.slice('--project='.length);
const reviewer = process.argv.find(value => value.startsWith('--reviewer='))?.slice('--reviewer='.length);
if (!projectId || !reviewer) throw new Error('Usage: npm run flagship:setup:approve -- --project=<uuid> --reviewer=<name>');

await approveFlagshipStorySpecForProject(projectId, reviewer);
console.log(JSON.stringify({ projectId, approved: true, nextGate: 'manual_chapter_1_write' }, null, 2));
