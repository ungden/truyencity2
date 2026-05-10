import dotenv from 'dotenv';

// Must run before any other modules import Supabase or read env flags.
dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true, override: true });
dotenv.config({ path: '.env.codex', quiet: true, override: true });

// If the CLI explicitly requests offline, force it early.
if (process.argv.includes('--offline')) {
  process.env.CODEX_AUTOMATION_OFFLINE = '1';
  process.env.STORY_ENGINE_OFFLINE = '1';
} else if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.CODEX_AUTOMATION_OFFLINE = '0';
  process.env.STORY_ENGINE_OFFLINE = '0';
}
