import { getSupabase } from '../src/services/story-engine/utils/supabase';

async function main(): Promise<void> {
  const arg = (name: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const projectId = arg('project');
  const reviewer = arg('reviewer');
  const reason = arg('reason');
  if (!projectId || !reviewer || !reason) {
    throw new Error('Usage: npm run flagship:reject-pilot -- --project=<uuid> --reviewer=<name> --reason="<20+ characters>"');
  }

  const { data, error } = await getSupabase().rpc('reject_flagship_pilot_v2', {
    p_project_id: projectId,
    p_reviewer_ref: reviewer,
    p_reason: reason,
  });
  if (error) throw error;
  console.log(JSON.stringify(data, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
