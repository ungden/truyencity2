import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
import { createClient } from '@supabase/supabase-js';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main(): Promise<void> {
  const { data: before } = await s.from('app_versions').select('*').eq('platform', 'ios').maybeSingle();
  console.log('▶ Before:', before);

  const { data, error } = await s.from('app_versions')
    .update({
      latest_version: '1.0.6',
      latest_build: '45',
      release_notes: 'Sửa lỗi cuộn trang đọc + tinh chỉnh Age Rating cho App Store.',
      released_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('platform', 'ios')
    .select()
    .single();

  if (error) {
    console.error('✗ Update failed:', error.message);
    process.exit(1);
  }
  console.log('\n✓ Updated app_versions:');
  console.log(data);
}
main().catch(console.error);
