import { readFileSync } from 'fs';
import { getSupabase } from '../src/services/story-engine/utils/supabase';
import { FlagshipSetupBriefV2Schema } from '../src/services/story-engine/flagship/setup-contracts';
import { FlagshipModelRoutesV2Schema } from '../src/services/story-engine/flagship/model-routes';

async function main(): Promise<void> {
  const arg = (name: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const title = arg('title');
  const slug = arg('slug');
  const briefPath = arg('brief');
  const routesPath = arg('routes');
  if (!title || !slug || !briefPath || !routesPath) {
    throw new Error('Usage: npm run flagship:create-pilot -- --title="..." --slug=... --brief=/absolute/brief.json --routes=/absolute/routes.json');
  }

  const brief = FlagshipSetupBriefV2Schema.parse(JSON.parse(readFileSync(briefPath, 'utf8')));
  const routes = FlagshipModelRoutesV2Schema.parse(JSON.parse(readFileSync(routesPath, 'utf8')));
  const { data, error } = await getSupabase().rpc('create_flagship_pilot_v2', {
    p_working_title: title,
    p_slug: slug,
    p_brief: brief,
    p_model_routes: routes,
    p_target_chapter_length: 2400,
  });
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
