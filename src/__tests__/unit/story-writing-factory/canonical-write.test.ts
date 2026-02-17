import { writeSingleChapterCanonical } from '@/services/story-writing-factory/canonical-write';

const mockSetCallbacks = jest.fn();
const mockRun = jest.fn();

jest.mock('@/services/story-writing-factory/runner', () => {
  return {
    StoryRunner: jest.fn().mockImplementation(() => ({
      setCallbacks: mockSetCallbacks,
      run: mockRun,
    })),
  };
});

const mockSummarizeChapter = jest.fn();

jest.mock('@/services/story-writing-factory/context-generators', () => ({
  summarizeChapter: (...args: unknown[]) => mockSummarizeChapter(...args),
  generateSynopsis: jest.fn(),
  generateArcPlan: jest.fn(),
  generateStoryBible: jest.fn(),
}));

const mockSaveChapterSummary = jest.fn();

jest.mock('@/services/story-writing-factory/context-loader', () => ({
  ContextLoader: class ContextLoader {
    async load() {
      return {
        synopsis: null,
        arcChapterSummaries: [],
        storyBible: null,
        hasStoryBible: false,
        recentChapters: [],
      };
    }
  },
  saveChapterSummary: (...args: unknown[]) => mockSaveChapterSummary(...args),
}));

type MockState = {
  updateCalled: number;
};

function createMockSupabase(state: MockState) {
  const projectRow = {
    id: 'project-1',
    user_id: 'user-1',
    novel_id: 'novel-1',
    main_character: 'Lâm Phong',
    genre: 'tien-hiep',
    current_chapter: 7,
    total_planned_chapters: 100,
    world_description: 'World',
    temperature: 0.8,
    target_chapter_length: 2500,
    ai_model: 'gemini-3-flash-preview',
    novels: { id: 'novel-1', title: 'Novel Title' },
  };

  return {
    from: (table: string) => {
      if (table === 'ai_story_projects') {
        return {
          select: () => ({
            eq: jest.fn().mockReturnThis(),
            single: async () => ({ data: projectRow, error: null }),
          }),
          update: () => ({
            eq: async () => {
              state.updateCalled += 1;
              return { error: null };
            },
          }),
        };
      }

      if (table === 'chapters') {
        return {
          upsert: async () => ({ error: null }),
          select: () => ({
            eq: jest.fn().mockReturnThis(),
            single: async () => ({
              data: { title: 'Chương 8: Tiếp nối', content: 'Noi dung chuong 8' },
              error: null,
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as any;
}

describe('writeSingleChapterCanonical', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not update current_chapter when summary save fails', async () => {
    const state: MockState = { updateCalled: 0 };
    const supabase = createMockSupabase(state);

    mockSetCallbacks.mockImplementation((callbacks: { onChapterCompleted?: (chapterNumber: number, result: { data?: { title: string; content: string; wordCount?: number } }) => Promise<void> }) => {
      mockRun.mockImplementation(async () => {
        if (callbacks.onChapterCompleted) {
          await callbacks.onChapterCompleted(8, {
            data: {
              title: 'Chương 8: Tiếp nối',
              content: 'Noi dung chuong 8',
              wordCount: 4,
            },
          });
        }
        return {
          success: true,
          state: {
            status: 'completed',
            projectId: 'project-1',
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            currentChapter: 8,
            currentArc: 1,
            totalChapters: 100,
            totalArcs: 5,
            chaptersWritten: 8,
            arcsCompleted: 1,
            chaptersFailed: 0,
            totalWords: 10000,
            averageWordsPerChapter: 1250,
            statusMessage: 'ok',
            costs: {
              totalCalls: 0,
              totalTokens: 0,
              estimatedCost: 0,
              costByTask: {},
            },
          },
        };
      });
    });

    mockSummarizeChapter.mockResolvedValue({
      summary: 'summary',
      openingSentence: 'opening',
      mcState: 'mc',
      cliffhanger: 'cliff',
    });

    mockSaveChapterSummary.mockRejectedValue(new Error('summary failed'));

    await expect(
      writeSingleChapterCanonical({
        supabase,
        aiService: {} as any,
        projectId: 'project-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('summary failed');

    expect(state.updateCalled).toBe(0);
  });
});
