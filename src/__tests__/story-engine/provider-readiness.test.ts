import { getFlagshipProviderReadiness } from '@/services/story-engine/flagship/provider-readiness';
import { flagshipProviderForModel } from '@/services/story-engine/flagship/provider';

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
    const mixed = { ...geminiRoutes, writer: 'gpt-5.6-luna', director: 'deepseek-v4-pro' };
    expect(getFlagshipProviderReadiness([
      { id: 'p1', style_directives: { flagship_model_routes: mixed } },
    ], { GEMINI_API_KEY: 'g', DEEPSEEK_API_KEY: 'd', OPENAI_API_KEY: 'o' })).toMatchObject({
      ready: true,
      requiredProviders: ['deepseek', 'gemini', 'openai'],
      missingProviders: [],
    });
  });

  it('blocks an official OpenAI Writer before claiming when its key is absent', () => {
    const mixed = { ...geminiRoutes, writer: 'gpt-5.6-luna' };
    expect(getFlagshipProviderReadiness([
      { id: 'p1', style_directives: { flagship_model_routes: mixed } },
    ], { GEMINI_API_KEY: 'g' })).toMatchObject({
      ready: false,
      requiredProviders: ['gemini', 'openai'],
      missingProviders: ['openai'],
    });
  });

  it('maps only explicit supported model prefixes and never guesses a fallback provider', () => {
    expect(flagshipProviderForModel('gpt-5.6-luna')).toBe('openai');
    expect(flagshipProviderForModel('gemini-3.5-flash')).toBe('gemini');
    expect(flagshipProviderForModel('deepseek-v4-pro')).toBe('deepseek');
    expect(() => flagshipProviderForModel('mystery-writer')).toThrow('Unsupported flagship model route');
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
