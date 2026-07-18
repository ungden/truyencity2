import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  FlagshipLaunchPackV3Schema,
  FlagshipModelRoutesV3Schema,
  runOfflineOpeningV3,
  runOfflinePlannedWindowV3,
} from '@/services/story-engine/flagship-v3';

const launchPack = FlagshipLaunchPackV3Schema.parse(JSON.parse(readFileSync(
  path.join(process.cwd(), 'blueprints/flagship-v3/canaries/dt-01/launch-pack-v3.json'),
  'utf8',
)));
const routes = FlagshipModelRoutesV3Schema.parse(JSON.parse(readFileSync(
  path.join(process.cwd(), 'blueprints/flagship-v3/model-routes-canary.json'),
  'utf8',
)));

const qualityGates = {
  premise_interest: true, character_voice: true, scene_tension: true, causal_surprise: true,
  emotional_movement: true, domain_truth: true, prose_naturalness: true, agency: true,
  earned_pleasure: true, recovery_pacing: true, desire_to_read_next: true,
};
const hardGates = {
  canon: true, timeline: true, resource_causality: true, character_knowledge: true,
  authority: true, prompt_leak: true, plan_fidelity: true,
};

describe('flagship v3 offline opening runner', () => {
  it('advances three chapters in memory without a database commit', async () => {
    const calls: string[] = [];
    const result = await runOfflineOpeningV3({ launchPack, routes, chapters: 3, targetWordCount: 1500 }, {
      invoke: async ({ chapterNumber, model, call }) => {
        calls.push(`${chapterNumber}:${call.role}:${model}`);
        const plan = launchPack.initialWindow.plans[chapterNumber - 1];
        const markers = plan.requiredDeltas.map(delta => `Dấu mốc ${delta.id} đã hiện rõ trong hành động.`);
        const content = `${markers.join(' ')} ${Array.from({ length: 8 }, () => 'Nhân vật tự kiểm tra nguồn lực, nói chuyện với người liên quan rồi chấp nhận cái giá của lựa chọn trước khi nhận kết quả. '.repeat(10)).join('\n\n')}`;
        const payload = call.role === 'writer' || call.role === 'writer_revision'
          ? { title: `Chương ${chapterNumber}: Lựa chọn có giá`, scenes: plan.scenes.map(scene => ({ sceneId: scene.id, paragraphs: content.split(/\n\s*\n/u) })) }
          : {
              status: 'pass', hardGates, qualityGates, issues: [],
              revisionInstructions: [],
              realizedDeltaEvidence: plan.requiredDeltas.map(delta => ({
                deltaId: delta.id,
                spanId: 'span_001',
              })),
            };
        return {
          content: JSON.stringify(payload),
          model,
          promptTokens: 100,
          completionTokens: 200,
          estimatedCostUsd: 0.02,
          finishReason: 'STOP',
        };
      },
    });

    expect(result.completedChapters).toBe(3);
    expect(result.stoppedAtChapter).toBeNull();
    expect(result.finalState.chapterNumber).toBe(3);
    expect(result.chapters.map(chapter => chapter.callRoles)).toEqual([
      ['writer', 'editor'],
      ['writer', 'editor'],
      ['writer', 'editor'],
    ]);
    expect(calls).toHaveLength(6);
  });

  it('stops at the first rejected chapter and keeps the last committed in-memory state', async () => {
    const result = await runOfflineOpeningV3({ launchPack, routes, chapters: 3 }, {
      invoke: async ({ chapterNumber, model, call }) => {
        const plan = launchPack.initialWindow.plans[chapterNumber - 1];
        const marker = 'Nhân vật chưa trả được cái giá đã hứa.';
        const content = `${marker} ${Array.from({ length: 8 }, () => 'Anh kiểm tra tình hình rồi lựa chọn cách giải quyết phù hợp với người trong cảnh. '.repeat(12)).join('\n\n')}`;
        const payload = call.role === 'writer' || call.role === 'writer_revision'
          ? { title: `Chương ${chapterNumber}: Bản thử`, scenes: plan.scenes.map(scene => ({ sceneId: scene.id, paragraphs: (call.role === 'writer_revision' ? `${content} Bản sửa vẫn không tạo được nguồn lực hợp lệ.` : content).split(/\n\s*\n/u) })) }
          : {
              status: 'issues',
              hardGates: { ...hardGates, resource_causality: false },
              qualityGates: { ...qualityGates, domain_truth: false },
              issues: [{
                gate: 'resource_causality',
                severity: 'critical',
                message: 'Nguồn lực thay đổi nhưng chưa có nguồn và chi phí trong cảnh.',
                spanId: 'span_001',
                locality: 'non_local',
                repairMode: 'full_rewrite',
              }],
              revisionInstructions: ['Viết lại cảnh để mọi thay đổi nguồn lực có nguồn và chi phí nhìn thấy được.'],
              realizedDeltaEvidence: plan.requiredDeltas.map(delta => ({
                deltaId: delta.id,
                spanId: 'span_001',
              })),
            };
        return {
          content: JSON.stringify(payload),
          model,
          promptTokens: 100,
          completionTokens: 200,
          estimatedCostUsd: 0.02,
          finishReason: 'STOP',
        };
      },
    });

    expect(result.completedChapters).toBe(0);
    expect(result.stoppedAtChapter).toBe(1);
    expect(result.finalState.chapterNumber).toBe(0);
    expect(result.chapters[0].status).toBe('quality_blocked');
    expect(result.chapters).toHaveLength(1);
  });

  it('refuses a rolling calibration window that skips the committed chapter', async () => {
    await expect(runOfflinePlannedWindowV3({
      title: launchPack.kernel.title,
      kernel: launchPack.kernel,
      arc: launchPack.arc,
      state: launchPack.initialState,
      plans: [launchPack.initialWindow.plans[1]],
      routes,
    }, {
      invoke: async () => { throw new Error('model must not be called'); },
    })).rejects.toThrow('contiguous with committed state');
  });
});
