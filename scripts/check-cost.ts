import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  const { data } = await s.from('cost_tracking')
    .select('task,model,input_tokens,output_tokens,cost,created_at')
    .eq('project_id', '85335c19-4e47-4d47-a627-0fc6e2f3080c')
    .order('created_at');
  const rows = (data || []).map((r: Record<string, unknown>) => ({
    t: String(r.created_at).slice(11, 19),
    task: r.task,
    model: r.model,
    in: r.input_tokens,
    out: r.output_tokens,
  }));
  console.table(rows);
})();
