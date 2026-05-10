import {
  buildCausalLogicHealth,
  evaluateCausalLogic,
} from '../../services/story-engine/quality/causal-logic-check';

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
});
