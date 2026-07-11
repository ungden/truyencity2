import { readFileSync } from 'fs';
import { installFlagshipSetupBriefForProject } from '../src/services/story-engine/flagship/setup-runtime';

const projectId = process.argv.find(value => value.startsWith('--project='))?.slice('--project='.length);
const briefPath = process.argv.find(value => value.startsWith('--brief='))?.slice('--brief='.length);
const routesPath = process.argv.find(value => value.startsWith('--routes='))?.slice('--routes='.length);
if (!projectId || !briefPath || !routesPath) throw new Error('Usage: npm run flagship:setup:brief -- --project=<uuid> --brief=/absolute/brief.json --routes=/absolute/model-routes.json');
await installFlagshipSetupBriefForProject(projectId, JSON.parse(readFileSync(briefPath, 'utf8')), JSON.parse(readFileSync(routesPath, 'utf8')));
console.log(JSON.stringify({ projectId, installed: true, nextStep: 'flagship:setup:tournament' }, null, 2));
