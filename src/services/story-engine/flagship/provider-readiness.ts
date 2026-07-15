import { FlagshipModelRoutesV2Schema } from './model-routes';
import { flagshipProviderForModel, type FlagshipProvider } from './provider';

export interface FlagshipProviderReadinessV1 {
  ready: boolean;
  configuredProjects: number;
  invalidRouteProjects: string[];
  requiredProviders: FlagshipProvider[];
  missingProviders: FlagshipProvider[];
}

type ProjectRouteInput = { id: string; style_directives?: unknown };
type ProviderEnv = { GEMINI_API_KEY?: string; DEEPSEEK_API_KEY?: string; OPENAI_API_KEY?: string };

/**
 * Check credentials before the cron claims a lease. A missing provider leaves
 * every job queued and every canon artifact untouched.
 */
export function getFlagshipProviderReadiness(
  projects: ProjectRouteInput[],
  env: ProviderEnv = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
): FlagshipProviderReadinessV1 {
  const providers = new Set<FlagshipProvider>();
  const invalidRouteProjects: string[] = [];
  for (const project of projects) {
    const raw = (project.style_directives as { flagship_model_routes?: unknown } | null)?.flagship_model_routes;
    const parsed = FlagshipModelRoutesV2Schema.safeParse(raw);
    if (!parsed.success) {
      invalidRouteProjects.push(project.id);
      continue;
    }
    try {
      for (const model of Object.values(parsed.data)) providers.add(flagshipProviderForModel(model));
    } catch {
      invalidRouteProjects.push(project.id);
    }
  }
  const requiredProviders = [...providers].sort();
  const missingProviders = requiredProviders.filter(provider => {
    if (provider === 'gemini') return !env.GEMINI_API_KEY?.trim();
    if (provider === 'deepseek') return !env.DEEPSEEK_API_KEY?.trim();
    return !env.OPENAI_API_KEY?.trim();
  });
  return {
    ready: invalidRouteProjects.length === 0 && missingProviders.length === 0,
    configuredProjects: projects.length,
    invalidRouteProjects,
    requiredProviders,
    missingProviders,
  };
}
