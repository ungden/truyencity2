describe('story production focus helper', () => {
  const originalEnv = process.env;

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  it('enables focus mode by default with 10 default project ids', async () => {
    delete process.env.STORY_FOCUS_MODE;
    delete process.env.FOCUSED_PROJECT_IDS;
    jest.resetModules();

    const focus = await import('@/lib/story-production-focus');

    expect(focus.FOCUS_MODE_ENABLED).toBe(true);
    expect(focus.FOCUSED_PROJECT_IDS).toHaveLength(10);
    expect(focus.isFocusedProject('6c281b11-95ad-4346-8bee-f3a94fdfa60d')).toBe(true);
    expect(focus.isFocusedProject('not-on-the-list')).toBe(false);
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
