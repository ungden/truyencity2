import { flagshipProviderForModel, type FlagshipProvider } from '../flagship/provider';
import { FlagshipModelRoutesV3Schema } from './model-routes';

export interface FlagshipV3ProviderReadiness {
  ready: boolean;
  configuredProjects: number;
  invalidRouteProjects: string[];
  requiredProviders: FlagshipProvider[];
  missingProviders: FlagshipProvider[];
}

export function getFlagshipV3ProviderReadiness(
  projects: Array<{ id: string; style_directives?: unknown }>,
  env: { GEMINI_API_KEY?: string; DEEPSEEK_API_KEY?: string; OPENAI_API_KEY?: string } = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
): FlagshipV3ProviderReadiness {
  const providers = new Set<FlagshipProvider>();
  const invalidRouteProjects: string[] = [];
  for (const project of projects) {
    const raw = (project.style_directives as { flagship_model_routes_v3?: unknown } | null)?.flagship_model_routes_v3;
    const parsed = FlagshipModelRoutesV3Schema.safeParse(raw);
    if (!parsed.success) {
      invalidRouteProjects.push(project.id);
      continue;
    }
    try {
      [
        ...parsed.data.setupGenerators,
        ...parsed.data.setupJudges,
        parsed.data.openingSimulator,
        parsed.data.launchArchitect,
        parsed.data.planner,
        parsed.data.writer,
        parsed.data.editor,
      ]
        .forEach(model => providers.add(flagshipProviderForModel(model)));
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
