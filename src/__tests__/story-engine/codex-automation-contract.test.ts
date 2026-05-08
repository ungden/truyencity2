import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import {
  assertCoverImageFile,
  parseCoverApplyInput,
  parseStoryFactoryPayload,
} from '@/services/story-engine/codex-automation/contract';

function validStoryPayload() {
  return {
    title: 'Thành Phố Đổi Vận',
    genres: ['do-thi'],
    description: 'Một kỹ sư dữ liệu tỉnh lẻ trở về thành phố cũ, dùng khả năng đọc dòng tiền và thói quen thị trường để dựng lại xưởng gia đình. Truyện tập trung vào lựa chọn nghề nghiệp, quan hệ cộng đồng, các bước tăng trưởng nhỏ nhưng đều có payoff rõ. Mỗi chương cần có giao dịch, feedback xã hội và một thay đổi cụ thể về tài nguyên hoặc uy tín.',
    mainCharacter: 'Lâm Việt',
    worldDescription: 'Bối cảnh là thành phố cảng An Hòa năm 2026, nơi các xưởng nhỏ bị sàn thương mại điện tử, đầu nậu nguyên liệu và hội nhóm tín dụng ép biên lợi nhuận đến đáy. Lâm Việt từng làm dữ liệu chuỗi cung ứng ở Sài Gòn, trở về vì cha bệnh và xưởng cơ khí gia đình đứng trước nguy cơ bán tháo. Thế giới vận hành bằng hợp đồng nhỏ, uy tín trong chợ vật tư, dữ liệu giá nguyên liệu, lịch giao hàng và mối quan hệ với thợ cả. Không có phe lớn chú ý ngay từ đầu; sự công nhận tăng dần qua từng đơn hàng được cứu, từng khoản nợ được tái cấu trúc và từng người trong phố chứng kiến Lâm Việt giải bài toán thật. Phase đầu tập trung quanh xưởng, kho hàng, bến xe tải và quán cơm công nhân để tạo sân chơi lặp đủ dày cho các cảnh giao dịch, kiểm hàng, sửa lỗi và phản ứng cộng đồng.',
    coverPrompt: 'Vietnamese urban webnovel cover, a determined young engineer standing in a rainy industrial street, warm workshop lights behind him, subtle data lines reflected in puddles, title text area at top, premium serialized fiction cover, 3:4.',
    setupKernel: {
      readerFantasy: 'Reader theo dõi một người bình thường dùng năng lực nghề nghiệp và lựa chọn tỉnh táo để cứu xưởng gia đình, tăng uy tín từng bước trong thành phố.',
      protagonistEngine: 'Lâm Việt thắng bằng phân tích dữ liệu, hiểu con người, đàm phán cẩn thận và luôn đổi mỗi hành động thành lợi ích cụ thể.',
      pleasureLoop: ['nhìn thấy vấn đề thật', 'thu thập dữ liệu nhỏ', 'ra quyết định có rủi ro', 'nhận feedback xã hội', 'chốt payoff tài nguyên'],
      systemMechanic: {
        name: 'Bảng Dòng Tiền',
        input: 'hóa đơn, lịch giao hàng, giá nguyên liệu, lời hứa miệng',
        output: 'mô hình rủi ro và điểm nghẽn lợi nhuận',
        limit: 'không đọc được lòng người và cần dữ liệu thật',
        reward: 'giảm lỗ, tăng uy tín, mở quan hệ mới',
      },
      mcSecret: {
        secret: 'Kinh nghiệm dữ liệu từ tương lai nghề nghiệp của Lâm Việt',
        outsideWorldKnowledge: 'Người ngoài chỉ thấy hắn tính nhanh và làm chắc',
        revealRule: 'Không ai biết toàn bộ năng lực trong 200 chương đầu',
      },
      benefitLoop: {
        goal: 'giữ xưởng và trả nợ',
        action: 'chọn đơn hàng có biên lợi nhuận thật',
        benefit: 'tiền mặt, quan hệ, uy tín chợ',
        cadence: 'mỗi 1-3 chương có một thay đổi đo được',
      },
      interventionRule: 'Lâm Việt chỉ can thiệp khi có lợi ích rõ ràng cho xưởng, gia đình, quan hệ nghề nghiệp hoặc dữ liệu cần thiết.',
      phase1Playground: {
        locations: ['xưởng cơ khí', 'chợ vật tư', 'quán cơm công nhân'],
        cast: ['cha Lâm Việt', 'thợ cả Trương', 'chủ kho Minh'],
        resources: ['sổ nợ cũ', 'máy tiện đời cũ', 'dữ liệu giá vật tư'],
        localAntagonists: ['đầu nậu ép giá'],
        repeatableSceneTypes: ['đàm phán đơn hàng', 'kiểm tra sổ nợ', 'xử lý lỗi giao hàng'],
      },
      socialReactor: {
        witnesses: ['thợ xưởng', 'chủ kho', 'khách nhỏ'],
        reactionModes: ['nghi ngờ', 'kinh ngạc có kiểm chứng'],
        reportBackCadence: 'sau mỗi payoff nhỏ, tin đồn lan thêm một vòng',
      },
      noveltyLadder: [
        { chapterRange: '1-50', newToy: 'đơn hàng nhỏ', keepsSameLane: 'vẫn là cứu xưởng bằng dữ liệu' },
        { chapterRange: '51-120', newToy: 'hợp đồng phố', keepsSameLane: 'vẫn là chuỗi cung ứng địa phương' },
        { chapterRange: '121-220', newToy: 'chuỗi cung ứng quận', keepsSameLane: 'vẫn là thương chiến nghề nghiệp' },
      ],
      controlRules: {
        payoffCadence: 'mỗi chương có payoff nhỏ hoặc nợ rõ cho chương sau',
        attentionGradient: 'người lớn chỉ chú ý khi thành tích đủ nhìn thấy',
        openThreadsPerArc: 3,
        closeThreadsPerArc: 2,
      },
      patternCards: ['competence-porn', 'business-payoff', 'community-recognition'],
    },
    masterOutline: { arcs: [{ name: 'Giữ xưởng', chapters: '1-80', payoff: 'thoát bán tháo' }] },
    storyOutline: { premise: 'Lâm Việt cứu xưởng gia đình bằng dữ liệu và đàm phán.' },
    arcPlan: [
      { chapter: 1, goal: 'phát hiện lỗ đơn hàng' },
      { chapter: 2, goal: 'đàm phán với chủ kho' },
      { chapter: 3, goal: 'giữ khách đầu tiên' },
    ],
    totalPlannedChapters: 1000,
  };
}

describe('codex automation contract', () => {
  it('validates a complete story factory payload', () => {
    expect(parseStoryFactoryPayload(validStoryPayload()).title).toBe('Thành Phố Đổi Vận');
  });

  it('rejects a new story missing setup spine', () => {
    const payload = validStoryPayload() as Record<string, unknown>;
    delete payload.setupKernel;
    expect(() => parseStoryFactoryPayload(payload)).toThrow();
  });

  it('rejects missing cover image files', () => {
    const input = parseCoverApplyInput({
      novelId: '00000000-0000-4000-8000-000000000001',
      prompt: 'A real cover prompt long enough for validation.',
      imagePath: '/tmp/definitely-missing-cover.png',
      provider: 'codex_image_tool',
    });
    expect(() => assertCoverImageFile(input.imagePath)).toThrow(/not found/);
  });

  it('accepts supported generated cover files', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'codex-cover-'));
    const imagePath = path.join(dir, 'cover.png');
    writeFileSync(imagePath, Buffer.alloc(2048, 1));
    expect(assertCoverImageFile(imagePath)).toMatchObject({ mimeType: 'image/png', sizeBytes: 2048 });
    rmSync(dir, { recursive: true, force: true });
  });
});
