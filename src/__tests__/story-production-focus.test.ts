describe('story production focus helper', () => {
  const originalEnv = process.env;

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  it('Phase Q (2026-05-12): default UUID allowlist empty; flag-based opt-in', async () => {
    delete process.env.STORY_FOCUS_MODE;
    delete process.env.FOCUSED_PROJECT_IDS;
    jest.resetModules();

    const focus = await import('@/lib/story-production-focus');

    expect(focus.FOCUS_MODE_ENABLED).toBe(true);
    expect(focus.FOCUSED_PROJECT_IDS).toEqual([]);
    // Legacy id-only check returns false for any id (allowlist empty).
    expect(focus.isFocusedProject('not-on-the-list')).toBe(false);
    // Flag-based opt-in: project with style_directives.production_enabled passes.
    expect(focus.isProductionEnabled({ id: 'some-id', style_directives: { production_enabled: true } })).toBe(true);
    expect(focus.isProductionEnabled({ id: 'some-id', style_directives: { production_enabled: false } })).toBe(false);
    expect(focus.isProductionEnabled({ id: 'some-id', style_directives: null })).toBe(false);
  });

  it('legacy env FOCUSED_PROJECT_IDS still allowlists by id (emergency override)', async () => {
    process.env.FOCUSED_PROJECT_IDS = 'legacy-uuid-1';
    jest.resetModules();

    const focus = await import('@/lib/story-production-focus');

    expect(focus.FOCUSED_PROJECT_IDS).toEqual(['legacy-uuid-1']);
    expect(focus.isProductionEnabled({ id: 'legacy-uuid-1', style_directives: null })).toBe(true);
    expect(focus.isProductionEnabled({ id: 'other-id', style_directives: null })).toBe(false);
  });

  it('supports env override for focused ids', async () => {
    process.env.FOCUSED_PROJECT_IDS = 'project-a, project-b';
    jest.resetModules();

    const focus = await import('@/lib/story-production-focus');

    expect(focus.FOCUSED_PROJECT_IDS).toEqual(['project-a', 'project-b']);
    expect(focus.filterFocusedProjects([{ id: 'project-a' }, { id: 'project-c' }])).toEqual([{ id: 'project-a' }]);
  });

  it('passes all projects through when focus mode is disabled', async () => {
    process.env.STORY_FOCUS_MODE = '0';
    process.env.FOCUSED_PROJECT_IDS = 'project-a';
    jest.resetModules();

    const focus = await import('@/lib/story-production-focus');

    expect(focus.FOCUS_MODE_ENABLED).toBe(false);
    expect(focus.isFocusedProject('project-c')).toBe(true);
    expect(focus.filterFocusedProjects([{ id: 'project-a' }, { id: 'project-c' }])).toEqual([
      { id: 'project-a' },
      { id: 'project-c' },
    ]);
  });
});
