import { getFlagshipProviderReadiness } from '@/services/story-engine/flagship/provider-readiness';

const geminiRoutes = {
  setupCreative: 'gemini-pro',
  setupJudge: 'gemini-flash',
  director: 'gemini-pro',
  writer: 'gemini-pro',
  editor: 'gemini-flash',
  planner: 'gemini-pro',
};

describe('flagship provider readiness', () => {
  it('leaves jobs unclaimable when the configured provider credential is missing', () => {
    expect(getFlagshipProviderReadiness([
      { id: 'p1', style_directives: { flagship_model_routes: geminiRoutes } },
    ], {})).toEqual({
      ready: false,
      configuredProjects: 1,
      invalidRouteProjects: [],
      requiredProviders: ['gemini'],
      missingProviders: ['gemini'],
    });
  });

  it('becomes ready when every explicit route provider has a credential', () => {
    const mixed = { ...geminiRoutes, writer: 'deepseek-v4-pro' };
    expect(getFlagshipProviderReadiness([
      { id: 'p1', style_directives: { flagship_model_routes: mixed } },
    ], { GEMINI_API_KEY: 'g', DEEPSEEK_API_KEY: 'd' })).toMatchObject({
      ready: true,
      requiredProviders: ['deepseek', 'gemini'],
      missingProviders: [],
    });
  });

  it('fails closed on invalid or absent route contracts', () => {
    expect(getFlagshipProviderReadiness([
      { id: 'broken', style_directives: {} },
    ], { GEMINI_API_KEY: 'g' })).toMatchObject({
      ready: false,
      invalidRouteProjects: ['broken'],
    });
  });
});
