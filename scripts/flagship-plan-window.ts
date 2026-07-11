import { planNextFlagshipWindowForProject } from '../src/services/story-engine/flagship/rolling-planner';

async function main(): Promise<void> {
  const projectId = process.argv.find(value => value.startsWith('--project='))?.slice('--project='.length);
  if (!projectId) throw new Error('Usage: npm run flagship:plan-window -- --project=<uuid>');
  const window = await planNextFlagshipWindowForProject(projectId);
  console.log(JSON.stringify({ projectId, startChapter: window.startChapter, endChapter: window.endChapter, saved: true }, null, 2));
}
main().catch(error => { console.error(error); process.exit(1); });
