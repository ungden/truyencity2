import {
  buildMcOriginLockBlock,
  detectOriginContradiction,
} from '../../services/story-engine/plan/origin-guard';
import type { StoryKernel } from '../../services/story-engine/types';

function kernel(mcOrigin?: StoryKernel['mcOrigin']): StoryKernel {
  return { mcOrigin } as unknown as StoryKernel;
}

describe('origin-guard — detectOriginContradiction', () => {
  it('flags transmigration tokens when origin=native', () => {
    const outline = {
      volumes: [{ subArcs: [{ description: 'MC xuyên không thành linh điền sư' }] }],
    };
    expect(detectOriginContradiction(kernel('native'), outline)).toMatch(/xuyên không/);
  });

  it('flags reincarnation tokens when origin=native', () => {
    const outline = { mainPlotline: 'MC giữ ký ức kiếp trước để báo thù' };
    expect(detectOriginContradiction(kernel('native'), outline)).toMatch(/kiếp trước/);
  });

  it('allows xuyên không when origin=transmigrator', () => {
    const outline = { subArcs: [{ description: 'kẻ xuyên không thích nghi thế giới mới' }] };
    expect(detectOriginContradiction(kernel('transmigrator'), outline)).toBeNull();
  });

  it('flags trọng sinh when origin=transmigrator', () => {
    const outline = { subArcs: [{ description: 'MC trọng sinh về thời niên thiếu' }] };
    expect(detectOriginContradiction(kernel('transmigrator'), outline)).toMatch(/trọng sinh/);
  });

  it('allows kiếp trước when origin=reincarnated', () => {
    const outline = { mainPlotline: 'MC trọng sinh giữ ký ức kiếp trước' };
    expect(detectOriginContradiction(kernel('reincarnated'), outline)).toBeNull();
  });

  it('flags xuyên không when origin=reincarnated', () => {
    const outline = { mainPlotline: 'MC xuyên việt từ Trái Đất' };
    expect(detectOriginContradiction(kernel('reincarnated'), outline)).toMatch(/xuyên việt/);
  });

  it('returns null for a clean native outline (no false positives)', () => {
    const outline = {
      mainPlotline: 'Lục Trần dùng linh điền trồng trọt, từng bước đắc đạo trường sinh',
      volumes: [{ subArcs: [{ description: 'Khai khẩn linh điền, thu phục dân làng' }] }],
    };
    expect(detectOriginContradiction(kernel('native'), outline)).toBeNull();
  });

  it('returns null when mcOrigin is missing (no constraint)', () => {
    const outline = { mainPlotline: 'MC xuyên không' };
    expect(detectOriginContradiction(kernel(undefined), outline)).toBeNull();
  });
});

describe('origin-guard — buildMcOriginLockBlock', () => {
  it('returns empty string when no origin', () => {
    expect(buildMcOriginLockBlock(kernel(undefined))).toBe('');
  });

  it('includes the origin label + forbidden tokens for native', () => {
    const block = buildMcOriginLockBlock(kernel('native'));
    expect(block).toMatch(/KHOÁ GỐC GÁC MC/);
    expect(block).toMatch(/native/);
    expect(block).toMatch(/xuyên không/);
    expect(block).toMatch(/trọng sinh/);
  });
});
