import {
  genreContractIssuesToCriticIssues,
  validateGenreChapterContract,
  validateGenreSetupContract,
} from '@/services/story-engine/quality/genre-contract-validator';
import { formatTypedGenreContractForPrompt, getGenreContract } from '@/services/story-engine/templates/genre-contracts';
import type { GenreType } from '@/services/story-engine/types';

const ALL_GENRES: GenreType[] = [
  'tien-hiep',
  'huyen-huyen',
  'do-thi',
  'kiem-hiep',
  'lich-su',
  'khoa-huyen',
  'vong-du',
  'dong-nhan',
  'mat-the',
  'linh-di',
  'quan-truong',
  'di-gioi',
  'ngon-tinh',
  'quy-tac-quai-dam',
  'ngu-thu-tien-hoa',
  'khoai-xuyen',
];

describe('typed genre contract validator', () => {
  it('exposes prompt contracts for the five audited genres', () => {
    for (const genre of ALL_GENRES) {
      const contract = getGenreContract(genre);
      expect(contract).toBeDefined();
      expect(contract.genre).toBe(genre);
      expect(contract.setupMustHave.length).toBeGreaterThan(0);
      expect(contract.chapterMustHave.length).toBeGreaterThan(0);
      expect(contract.forbidden.length).toBeGreaterThan(0);
      expect(contract.criticChecklist.length).toBeGreaterThan(0);
      expect(formatTypedGenreContractForPrompt(genre)).toContain('TYPED GENRE CONTRACT');
    }
  });

  it('all primary genre setup contracts reject generic setup', () => {
    for (const genre of ALL_GENRES) {
      const issues = validateGenreSetupContract({
        genre,
        worldDescription: 'Một thế giới rộng lớn có nhiều nhân vật. Nhân vật chính phiêu lưu, gặp bạn bè, vượt qua khó khăn và trở nên nổi tiếng.',
        setupKernel: { readerFantasy: 'MC mạnh dần', pleasureLoop: ['gặp chuyện', 'xử lý', 'nhận thưởng', 'đi tiếp'] },
        masterOutline: { arcs: [{ name: 'phiêu lưu' }] },
        storyOutline: { premise: 'hành trình lớn' },
      });

      expect(issues.length).toBeGreaterThan(0);
    }
  });

  it('flags golden finger secret leaks as critical', () => {
    const issues = validateGenreChapterContract({
      genre: 'di-gioi',
      chapterNumber: 8,
      content: 'Lục Huy nhìn Garen rồi nói: ta có hệ thống Phụ Tá Lãnh Chúa và ta là người xuyên việt từ thế giới khác. Từ nay ông phải giữ bí mật này cho ta.'.repeat(20),
    });

    expect(issues.some((issue) => issue.code === 'secret_leak' && issue.severity === 'critical')).toBe(true);
    expect(genreContractIssuesToCriticIssues(issues).some((issue) => issue.type === 'continuity')).toBe(true);
  });

  it('flags public oracle service drift in urban oracle stories', () => {
    const issues = validateGenreChapterContract({
      genre: 'do-thi',
      chapterNumber: 13,
      content: 'Lâm Phong mở sạp xem quẻ trước cửa chợ, phán quẻ miễn phí cho người lạ và giúp một bà lão qua đường không cần báo đáp. Cả chương chỉ xoay quanh người qua đường cảm ơn, không có doanh thu, nguồn hàng, hợp đồng hay lợi ích cho Lâm Gia.'.repeat(18),
    });

    expect(issues.some((issue) => issue.code === 'public_oracle_service')).toBe(true);
  });

  it('passes fanfic chapters that use canon recall plus divergence payoff', () => {
    const issues = validateGenreChapterContract({
      genre: 'dong-nhan',
      chapterNumber: 6,
      content: 'Chu Gia Minh nhớ rõ theo nguyên tác Đường Tam sẽ gặp Đại Sư tại Nặc Đinh, còn Vũ Hồn Điện sẽ bỏ sót một cơ duyên nhỏ ở ven rừng. Anh dùng Thiên Cơ Bàn xác nhận tọa độ, dẫn A Hổ đi trước một canh giờ, lấy U Linh Thảo trước khi tuyến canon kịp chạm tới. Khi Đường Tam xuất hiện, phản ứng của cậu lệch khỏi cốt truyện gốc, tạo butterfly effect đầu tiên và mở tuyến đồng minh mới cho Chu Gia.'.repeat(16),
    });

    expect(issues.filter((issue) => issue.code === 'fanfic_no_canon_recall' || issue.code === 'foreknowledge_unused')).toHaveLength(0);
  });

  it('flags generic fanfic chapters without canon recall or foreknowledge', () => {
    const issues = validateGenreChapterContract({
      genre: 'dong-nhan',
      chapterNumber: 9,
      content: 'Chu Gia Minh bước qua khu rừng, gặp một con thú dữ và dùng sức mạnh đánh bại nó. Nhóm trẻ vui mừng, mọi người tiếp tục lên đường. Anh cảm thấy tương lai còn dài và cần cố gắng hơn nữa. Chương chỉ có phiêu lưu chung chung như một fantasy độc lập, không có mốc quen thuộc hay kế hoạch meta nào.'.repeat(18),
    });

    expect(issues.some((issue) => issue.code === 'fanfic_no_canon_recall')).toBe(true);
    expect(issues.some((issue) => issue.code === 'foreknowledge_unused')).toBe(true);
  });

  it('passes territory-builder chapters with production payoff', () => {
    const issues = validateGenreChapterContract({
      genre: 'di-gioi',
      chapterNumber: 12,
      content: 'Lục Huy kiểm tra mỏ muối số ba, điều chỉnh bể kết tinh và ghi lại sản lượng tăng từ một trăm lên ba trăm cân. Thương đội Rolf đặt cọc hợp đồng mới, kho lãnh địa có thêm ba xe hàng, dân Greyhollow nhận thuế giảm vì doanh thu muối tăng. Người ngoài chỉ thấy lãnh chúa trẻ giỏi kỹ thuật và quản trị.'.repeat(18),
    });

    expect(issues.some((issue) => issue.code === 'territory_build_loop_missing')).toBe(false);
  });

  it('flags beast evolution chapters without bond and process', () => {
    const issues = validateGenreChapterContract({
      genre: 'ngu-thu-tien-hoa',
      chapterNumber: 25,
      content: 'Lâm Tuyên chạy trong cống ngầm, né đội chấp pháp và dùng khói hóa học cắt đuôi. Anh quan sát đường thoát, đánh lừa đối thủ rồi biến mất trong bóng tối. Chương tập trung vào truy đuổi người với người, các thiết bị hóa học và đường thoát hiểm, như một cảnh hành động đô thị.'.repeat(18),
    });

    expect(issues.some((issue) => issue.code === 'pet_bond_missing')).toBe(true);
    expect(issues.some((issue) => issue.code === 'pet_evolution_process_missing')).toBe(true);
  });

  it('catches setup that lacks the genre resource spine', () => {
    const issues = validateGenreSetupContract({
      genre: 'di-gioi',
      worldDescription: 'Một người trẻ xuyên qua thế giới khác và gặp nhiều nhân vật thú vị. Anh phiêu lưu qua nhiều vùng đất, kết bạn, đánh bại kẻ xấu và dần nổi tiếng.',
      setupKernel: { readerFantasy: 'phiêu lưu', pleasureLoop: ['đi', 'gặp', 'đánh', 'thắng'] },
      masterOutline: { arcs: [{ name: 'phiêu lưu' }] },
      storyOutline: { premise: 'hành trình kỳ lạ' },
    });

    expect(issues.some((issue) => issue.code === 'territory_build_loop_missing')).toBe(true);
  });
});
