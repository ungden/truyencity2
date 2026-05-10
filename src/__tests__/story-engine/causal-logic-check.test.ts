import {
  buildCausalLogicHealth,
  evaluateCausalLogic,
} from '../../services/story-engine/quality/causal-logic-check';
import {
  evaluateBlueprintAlignment,
  formatChapterBlueprintContext,
  shouldRequireChapterBlueprint,
  validateChapterBlueprintCoverage,
  type ChapterBlueprint,
} from '../../services/story-engine/plan/chapter-blueprints';

const baseContext = {
  chapterNumber: 43,
  protagonistName: 'Lâm Duy',
  focusKey: 'sang-the-than-minh',
  arcPlanText: [
    'Arc học viện Băng Lộ-Rêu Lam.',
    'Không mở đại kỳ ngộ Thần Cách.',
    'Không cho đối thủ đột nhập Học Viện hoặc vượt quyền học viện.',
    'Lăng Hạo chỉ là đối tác/rival giao dịch công khai có hợp đồng và dữ liệu mờ.',
  ].join('\n'),
  currentBrief: 'Lâm Duy dùng điểm công hợp pháp vào phòng mô phỏng, cân bằng Băng Lộ và Rêu Lam.',
  activeThreads: ['Khảo hạch học viện: Lâm Duy tích điểm công qua mô phỏng có giám sát.'],
};

describe('causal logic check', () => {
  it('blocks weak rival taking academy assets without authority', () => {
    const content = [
      'Lăng Hạo nhân lúc đêm xuống lẻn vào Học Viện, bẻ khóa kho mô phỏng và lấy được bản đồ tọa độ bí mật.',
      'Hắn ném bản đồ cho Lâm Duy rồi cười lạnh.',
    ].join('\n');

    const issues = evaluateCausalLogic(content, {
      ...baseContext,
      currentBrief: 'Lăng Hạo xuất hiện ở khu giao dịch công khai, đề nghị trao đổi dữ liệu nhiệm vụ vòng ngoài bằng hợp đồng học viện.',
    });

    expect(issues.some((issue) => issue.code === 'authority_access_violation')).toBe(true);
    expect(buildCausalLogicHealth(issues).verdict).toBe('block');
  });

  it('allows public rival trade with source and cost', () => {
    const content = [
      'Tại khu giao dịch công khai của Học Viện, Lăng Hạo đặt hợp đồng được giám sát bởi chấp sự.',
      'Nguồn tin của hắn đến từ bảng nhiệm vụ vòng ngoài, giá là ba điểm công và một phần quyền ưu tiên mua Băng Lộ.',
      'Lâm Duy kiểm tra ledger, xác nhận chi phí rồi mới ký.',
    ].join('\n');

    const issues = evaluateCausalLogic(content, {
      ...baseContext,
      currentBrief: 'Lăng Hạo xuất hiện ở khu giao dịch công khai, đề nghị trao đổi dữ liệu nhiệm vụ vòng ngoài bằng hợp đồng học viện.',
    });

    expect(issues).toEqual([]);
  });

  it('blocks forbidden Than Cach arc drift', () => {
    const content = 'Băng Linh mở bàn tay, trao cho Lâm Duy một mảnh Thần Cách không cần trả giá.';

    const issues = evaluateCausalLogic(content, baseContext);

    expect(issues.some((issue) => issue.code === 'arc_rail_violation')).toBe(true);
    expect(issues.some((issue) => issue.code === 'resource_without_source')).toBe(true);
  });

  it('blocks high-value resource without source or ledger', () => {
    const content = 'Lâm Duy vừa bước vào cửa đã nhận được một lõi pháp tắc băng, không ai hỏi vì sao.';

    const issues = evaluateCausalLogic(content, {
      ...baseContext,
      arcPlanText: 'Arc khảo hạch Băng Lộ, không nhắc lõi pháp tắc cấp cao.',
    });

    expect(issues.some((issue) => issue.code === 'resource_without_source')).toBe(true);
  });

  it('blocks literal prompt artifacts in chapter content', () => {
    const content = 'Lâm Duy khép sổ.\n\nHook: chương sau hắn sẽ vào phòng mô phỏng.';

    const issues = evaluateCausalLogic(content, baseContext);

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'literal_artifact_leak', severity: 'critical' }),
    ]));
  });

  it('blocks plot-moving rival intrusion when the chapter brief did not schedule that rival', () => {
    const content = [
      'Lăng Hạo bước tới, đề nghị hợp tác dữ liệu mô phỏng và đưa ra một hợp đồng vòng ngoài.',
      'Lâm Duy tạm thời nhận lời để đổi lấy lợi thế trong khảo hạch.',
    ].join('\n');

    const issues = evaluateCausalLogic(content, {
      ...baseContext,
      currentBrief: 'Lâm Duy trồng mầm cây phù sa và chốt ledger đất-sương-rêu.',
    });

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unscheduled_rival_intrusion', severity: 'major' }),
    ]));
  });

  it('blocks chapter content that violates blueprint forbidden terms/resource/authority', () => {
    const blueprint: ChapterBlueprint = {
      project_id: 'p',
      chapter_number: 43,
      goal: 'Lâm Duy vào phòng mô phỏng hợp pháp.',
      payoff: 'Nhận điểm công và mẫu Băng Lộ hợp pháp.',
      resource_ledger_delta: 'Điểm công và Băng Lộ phải có nguồn/chi phí.',
      authority_constraints: 'Học Viện/phòng mô phỏng cần đăng ký, hợp đồng hoặc giám sát.',
      forbidden_terms: ['Thần Cách'],
      status: 'planned',
      version: 1,
    };

    const issues = evaluateBlueprintAlignment(
      'Lâm Duy bước vào Học Viện, nhặt một mảnh Thần Cách rồi đem Băng Lộ về Thần Vực.',
      blueprint,
    );

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'blueprint_forbidden_term', severity: 'critical' }),
      expect.objectContaining({ code: 'authority_access_violation', severity: 'major' }),
      expect.objectContaining({ code: 'blueprint_resource_mismatch', severity: 'major' }),
    ]));
  });

  it('formats blueprint as writer rail and toggles requirement from style directives', () => {
    const context = formatChapterBlueprintContext({
      project_id: 'p',
      chapter_number: 36,
      goal: 'Đăng ký khảo hạch hợp pháp.',
      payoff: 'Có quyền vào phòng mô phỏng sơ cấp.',
      status: 'planned',
      version: 2,
    });

    expect(context).toContain('FULL CHAPTER BLUEPRINT');
    expect(context).toContain('Đăng ký khảo hạch');
    expect(shouldRequireChapterBlueprint({ require_full_chapter_blueprint: true })).toBe(true);
    expect(shouldRequireChapterBlueprint({ chapter_blueprint_version: 2 })).toBe(true);
    expect(shouldRequireChapterBlueprint({ flash_bulk_cheap_mode: true })).toBe(false);
  });

  it('requires full blueprint coverage from 1 to target chapter', async () => {
    const rows = [
      { chapter_number: 1, status: 'used' },
      { chapter_number: 3, status: 'planned' },
      { chapter_number: 4, status: 'invalid' },
    ];
    const fakeDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              gte: () => ({
                lte: async () => ({ data: rows, error: null }),
              }),
            }),
          }),
        }),
      }),
    };

    const coverage = await validateChapterBlueprintCoverage('p', 4, 1, fakeDb as never);

    expect(coverage.ok).toBe(false);
    expect(coverage.generatedChapters).toBe(3);
    expect(coverage.missingChapters).toEqual([2]);
    expect(coverage.invalidChapters).toEqual([4]);
  });
});
