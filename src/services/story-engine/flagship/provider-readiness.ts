import { FlagshipModelRoutesV2Schema } from './model-routes';

export interface FlagshipProviderReadinessV1 {
  ready: boolean;
  configuredProjects: number;
  invalidRouteProjects: string[];
  requiredProviders: Array<'gemini' | 'deepseek'>;
  missingProviders: Array<'gemini' | 'deepseek'>;
}

type ProjectRouteInput = { id: string; style_directives?: unknown };
type ProviderEnv = { GEMINI_API_KEY?: string; DEEPSEEK_API_KEY?: string };

/**
 * Check credentials before the cron claims a lease. A missing provider leaves
 * every job queued and every canon artifact untouched.
 */
export function getFlagshipProviderReadiness(
  projects: ProjectRouteInput[],
  env: ProviderEnv = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  },
): FlagshipProviderReadinessV1 {
  const providers = new Set<'gemini' | 'deepseek'>();
  const invalidRouteProjects: string[] = [];
  for (const project of projects) {
    const raw = (project.style_directives as { flagship_model_routes?: unknown } | null)?.flagship_model_routes;
    const parsed = FlagshipModelRoutesV2Schema.safeParse(raw);
    if (!parsed.success) {
      invalidRouteProjects.push(project.id);
      continue;
    }
    for (const model of Object.values(parsed.data)) {
      providers.add(model.startsWith('deepseek-') ? 'deepseek' : 'gemini');
    }
  }
  const requiredProviders = [...providers].sort();
  const missingProviders = requiredProviders.filter(provider => provider === 'gemini'
    ? !env.GEMINI_API_KEY?.trim()
    : !env.DEEPSEEK_API_KEY?.trim());
  return {
    ready: invalidRouteProjects.length === 0 && missingProviders.length === 0,
    configuredProjects: projects.length,
    invalidRouteProjects,
    requiredProviders,
    missingProviders,
  };
}
