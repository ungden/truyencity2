/**
 * Story Engine v2 — Style Bible
 *
 * Genre-specific vocabulary, writing guidance, and pacing rules.
 * Each of the 13 genres has its own vocabulary, style context, and writing guidance.
 *
 * Phase 1 (2026-02-25): Full genre differentiation replacing genre-blind defaults.
 */

import type { GenreType } from '../types';

export type SceneType = 'action' | 'cultivation' | 'revelation' | 'romance' | 'dialogue' | 'tension' | 'comedy';

export interface PacingRule {
  sentenceLength: { min: number; max: number };
  dialogueRatio: { min: number; max: number };
  paceSpeed: 'fast' | 'medium' | 'slow';
}

export interface VocabularyGuide {
  emotions: {
    anger: string[];
    shock: string[];
    contempt: string[];
    determination: string[];
  };
  powerExpressions: {
    techniques: string[];
    weakToStrong: string[];
    breakthrough: string[];
  };
  atmosphere: {
    tense: string[];
    mysterious: string[];
    dangerous: string[];
  };
  honorifics: {
    superior: string[];
    peer: string[];
    enemy: string[];
  };
}

export interface StyleExemplar {
  content: string;
  notes: string[];
}

export interface EnhancedStyleBible {
  vocabulary: VocabularyGuide;
  pacingRules: Record<SceneType, PacingRule>;
  exemplars: StyleExemplar[];
  cliffhangerTechniques: Array<{ name: string; example: string }>;
}

export const CLIFFHANGER_TECHNIQUES = [
  // Action/Suspense
  { name: 'Revelation', example: 'MC phát hiện bí mật động trời' },
  { name: 'Threat', example: 'Kẻ thù mạnh xuất hiện đột ngột' },
  { name: 'Choice', example: 'MC phải chọn giữa hai điều quan trọng' },
  { name: 'Discovery', example: 'Tìm thấy vật phẩm/cổ vật bí ẩn' },
  { name: 'Promise', example: 'Lời hứa/hẹn gặp lại đầy nguy hiểm' },
  // Business/Slice-of-life
  { name: 'Pending Result', example: 'Kết quả đấu thầu/thi đấu sắp công bố, chưa biết thắng thua' },
  { name: 'Unexpected Visitor', example: 'Có người gõ cửa/gọi điện bất ngờ cuối chương' },
  { name: 'Hidden Cost', example: 'MC thắng lớn nhưng phát hiện cái giá phải trả' },
  // Emotional/Relationship
  { name: 'Confession', example: 'Nhân vật sắp nói ra sự thật/tình cảm, chương kết trước khi nói xong' },
  { name: 'Betrayal Hint', example: 'MC phát hiện manh mối đồng minh có thể phản bội' },
  { name: 'Return', example: 'Nhân vật tưởng đã mất/rời đi bất ngờ xuất hiện lại' },
  // Mystery/Knowledge
  { name: 'Forbidden Knowledge', example: 'MC vô tình đọc/nghe được thông tin không nên biết' },
  { name: 'Pattern Break', example: 'Quy luật đã thiết lập bị phá vỡ, chưa rõ nguyên nhân' },
];

// ============================================================================
// GENRE-SPECIFIC VOCABULARY (Phase 1A)
// 13 genres × 4 categories × 3-5 terms each
// ============================================================================

const GENRE_VOCABULARY: Record<GenreType, VocabularyGuide> = {
  'tien-hiep': {
    emotions: {
      anger: ['phẫn nộ', 'lôi đình đại nộ', 'sát khí đằng đằng', 'căm phẫn', 'thịnh nộ'],
      shock: ['bàng hoàng', 'kinh hãi', 'kinh ngạc', 'choáng váng', 'hồn phi phách tán'],
      contempt: ['khinh bỉ', 'coi như kiến', 'xem như phế vật', 'bất xứng', 'dè bỉu'],
      determination: ['quyết tâm', 'kiên nghị', 'thệ bất bãi hưu', 'bất khuất', 'chí tại bốn phương'],
    },
    powerExpressions: {
      techniques: ['kiếm quyết', 'tuyệt kỹ', 'bí pháp', 'thần thông', 'pháp thuật'],
      weakToStrong: ['nhược đến cường', 'việt cấp chiến đấu', 'phản bại vi thắng', 'lấy nhược thắng cường'],
      breakthrough: ['đột phá', 'tiến giai', 'hóa cảnh', 'ngưng đan', 'vượt qua bình cảnh'],
    },
    atmosphere: {
      tense: ['sát khí lạnh buốt', 'nghẹt thở', 'thiên uy giáng hạ', 'gay cấn', 'hồi hộp'],
      mysterious: ['thần bí', 'huyền bí', 'bí cảnh', 'cổ trận linh quang', 'mờ ảo'],
      dangerous: ['tử địa', 'tuyệt cảnh', 'trùng trùng hiểm nguy', 'long đàm hổ huyệt', 'hiểm trở'],
    },
    honorifics: {
      superior: ['tiền bối', 'sư tôn', 'tông chủ', 'lão tổ', 'đại nhân'],
      peer: ['sư huynh', 'sư đệ', 'sư tỷ', 'sư muội', 'đạo hữu'],
      enemy: ['tiểu tử', 'thụ tử', 'cuồng đồ', 'nghịch tử', 'vật'],
    },
  },

  'huyen-huyen': {
    emotions: {
      anger: ['nộ hỏa xung thiên', 'bạo nộ', 'lôi đình', 'phẫn hận', 'sát ý bùng phát'],
      shock: ['kinh hãi', 'hồn bay phách lạc', 'mặt biến sắc', 'kinh ngạc tột độ', 'sững sờ'],
      contempt: ['coi khinh', 'xem như kiến', 'nhìn không thấu', 'bất xứng một chiêu', 'lạnh nhạo'],
      determination: ['bất khuất', 'nghiến răng kiên trì', 'thệ tử bất thối', 'ý chí bất diệt', 'quyết chiến'],
    },
    powerExpressions: {
      techniques: ['thần kỹ', 'thiên cấp chiến kỹ', 'cấm thuật', 'huyết mạch thuật', 'bản mệnh thần thông'],
      weakToStrong: ['việt cấp chiến đấu', 'nghịch thiên cải mệnh', 'phàm nhân thắng thần', 'dĩ hạ khắc thượng'],
      breakthrough: ['đột phá', 'tiến hóa', 'thăng giai', 'niết bàn trùng sinh', 'ngộ đạo'],
    },
    atmosphere: {
      tense: ['huyết sắc bao trùm', 'áp lực nghẹt thở', 'sát ý lạnh buốt', 'chiến ý bùng cháy', 'thiên địa đổi sắc'],
      mysterious: ['huyền bí', 'thượng cổ bí ẩn', 'hắc ám vô tận', 'linh hồn cổ xưa', 'không gian méo mó'],
      dangerous: ['tử vong biên giới', 'ma thú hoành hành', 'hủy diệt cấp', 'thập tử nhất sinh', 'thiên kiếp giáng hạ'],
    },
    honorifics: {
      superior: ['đại đế', 'chí tôn', 'cổ tộc tộc trưởng', 'thần vương', 'lão quái vật'],
      peer: ['huynh đệ', 'đạo hữu', 'đồng bối', 'sư huynh', 'chiến hữu'],
      enemy: ['tạp chủng', 'nghịch tặc', 'tiểu nhân', 'cuồng đồ', 'phế vật'],
    },
  },

  'do-thi': {
    emotions: {
      anger: ['tức nghẹn', 'giận run người', 'nộ khí xung thiên', 'bực bội', 'phát điên'],
      shock: ['ngỡ ngàng', 'mắt trợn tròn', 'há hốc mồm', 'sốc nặng', 'không tin nổi'],
      contempt: ['coi thường', 'khinh miệt', 'nhìn xuống', 'chê bai', 'giễu cợt'],
      determination: ['quyết tâm', 'không lùi bước', 'nhất định phải', 'dốc toàn lực', 'không từ bỏ'],
    },
    powerExpressions: {
      techniques: ['tuyệt chiêu thương trường', 'chiến lược kinh doanh', 'tay đấm hạng nặng', 'quyền cước', 'trí tuệ áp đảo'],
      weakToStrong: ['từ tay trắng dựng cơ đồ', 'lật ngược thế cờ', 'gà biến phượng', 'phản đòn ngoạn mục'],
      breakthrough: ['lên đời', 'phát tài', 'thăng chức', 'bùng nổ thực lực', 'lộ thân phận'],
    },
    atmosphere: {
      tense: ['không khí đóng băng', 'im lặng chết chóc', 'căng như dây đàn', 'khẩn trương', 'ngột ngạt'],
      mysterious: ['bí ẩn', 'khó đoán', 'thâm không đáy', 'ẩn giấu', 'ngoài dự đoán'],
      dangerous: ['nguy hiểm', 'sống còn', 'không còn đường lùi', 'cá mập quây tứ phía', 'thế cờ chết'],
    },
    honorifics: {
      superior: ['chủ tịch', 'giám đốc', 'sư phụ', 'đại ca', 'ông chủ'],
      peer: ['anh', 'chị', 'bạn', 'huynh đệ', 'đồng nghiệp'],
      enemy: ['thằng kia', 'tên này', 'đồ vô dụng', 'kẻ không biết trời cao đất dày', 'phế vật'],
    },
  },

  'kiem-hiep': {
    emotions: {
      anger: ['lôi đình đại nộ', 'nghĩa phẫn điền ưng', 'nộ phát xung quan', 'phẫn khái', 'căm hận ngút trời'],
      shock: ['kinh hãi', 'thất kinh', 'biến sắc', 'sửng sốt', 'hồn bay phách lạc'],
      contempt: ['khinh miệt', 'coi như cỏ rác', 'bất xứng', 'nhìn không thấu', 'lạnh nhạo'],
      determination: ['hiệp nghĩa tại tâm', 'chí tại giang hồ', 'thệ tử bảo vệ', 'bất khuất', 'nghĩa khí ngút trời'],
    },
    powerExpressions: {
      techniques: ['kiếm pháp', 'chưởng pháp', 'khinh công', 'nội công', 'điểm huyệt'],
      weakToStrong: ['lấy nhu thắng cương', 'bốn lạng bạt nghìn cân', 'nhược đến cường', 'vô chiêu thắng hữu chiêu'],
      breakthrough: ['lĩnh ngộ', 'đại thành', 'khai mở kinh mạch', 'nội lực đại tiến', 'kiếm ý thăng hoa'],
    },
    atmosphere: {
      tense: ['sát khí lạnh lẽo', 'kiếm khí tung hoành', 'nghẹt thở', 'giang hồ hiểm ác', 'một mất một còn'],
      mysterious: ['bí ẩn giang hồ', 'truyền thuyết vô tích', 'thần bí', 'ẩn sĩ cao nhân', 'bí kíp thất truyền'],
      dangerous: ['hiểm cảnh', 'tử chiến', 'bốn bề thụ địch', 'trùng trùng mai phục', 'long đàm hổ huyệt'],
    },
    honorifics: {
      superior: ['tiền bối', 'sư phụ', 'chưởng môn', 'bang chủ', 'minh chủ'],
      peer: ['huynh đài', 'sư huynh', 'sư đệ', 'hiệp hữu', 'bằng hữu'],
      enemy: ['cuồng đồ', 'tà ma', 'nghịch tặc', 'tiểu nhân', 'ác tặc'],
    },
  },

  'lich-su': {
    emotions: {
      anger: ['long nhan đại nộ', 'nộ bất khả át', 'phẫn hận', 'uất ức', 'căm hận ngút trời'],
      shock: ['kinh hãi', 'thất kinh', 'mặt như tro tàn', 'biến sắc', 'hồn vía lên mây'],
      contempt: ['khinh miệt', 'coi như phiến thần', 'bất xứng', 'xem thường', 'khinh bỉ'],
      determination: ['quân vương chi chí', 'thiên hạ vi công', 'bất thối', 'chí tại thiên hạ', 'quyết đoán'],
    },
    powerExpressions: {
      techniques: ['mưu kế', 'trận pháp', 'binh pháp', 'kế sách', 'quyền mưu'],
      weakToStrong: ['từ bần cùng đến đế vương', 'lật ngược càn khôn', 'chuyển bại thành thắng', 'từ thấp lên cao'],
      breakthrough: ['đăng cơ', 'thăng chức', 'đại thắng', 'bình định', 'phong vương'],
    },
    atmosphere: {
      tense: ['triều đình rung chuyển', 'mưu kế trùng trùng', 'căng thẳng', 'gươm kề cổ', 'phong ba bão táp'],
      mysterious: ['bí mật cung đình', 'ẩn mưu', 'thâm sâu khó đoán', 'cổ mộ bí ẩn', 'sấm truyền'],
      dangerous: ['nguy cơ tứ phía', 'phản loạn', 'binh biến', 'thập diện mai phục', 'mưu phản'],
    },
    honorifics: {
      superior: ['bệ hạ', 'thái hậu', 'thừa tướng', 'đại tướng quân', 'hoàng thượng'],
      peer: ['đại nhân', 'tướng quân', 'đồng liêu', 'huynh đệ', 'tả hữu'],
      enemy: ['nghịch thần', 'phản tặc', 'gian thần', 'giặc cỏ', 'tên kia'],
    },
  },

  'khoa-huyen': {
    emotions: {
      anger: ['phẫn nộ', 'tức giận run người', 'mất kiểm soát', 'bùng nổ', 'cuồng nộ'],
      shock: ['kinh ngạc', 'mắt trợn tròn', 'không thể tin được', 'sốc toàn thân', 'đầu óc trống rỗng'],
      contempt: ['coi thường', 'nhìn xuống', 'cho là nguyên thủy', 'hạ đẳng', 'khinh miệt'],
      determination: ['nhất định phải', 'không từ bỏ', 'bằng mọi giá', 'quyết tâm sắt đá', 'vì nhân loại'],
    },
    powerExpressions: {
      techniques: ['vũ khí năng lượng', 'hệ thống phòng ngự', 'pháo tuyến', 'giáp cơ khí', 'vũ khí sinh học'],
      weakToStrong: ['từ hành tinh nhỏ ra vũ trụ', 'bước nhảy văn minh', 'tiến hóa công nghệ', 'phá vỡ giới hạn'],
      breakthrough: ['đột phá công nghệ', 'phát minh', 'tiến hóa', 'thăng cấp văn minh', 'giải mã'],
    },
    atmosphere: {
      tense: ['cảnh báo đỏ', 'đếm ngược', 'áp lực nghẹt thở', 'tình trạng khẩn cấp', 'countdown'],
      mysterious: ['bí ẩn vũ trụ', 'tín hiệu lạ', 'dị thường', 'không gian méo mó', 'năng lượng tối'],
      dangerous: ['diệt vong', 'hủy diệt hành tinh', 'bức xạ chết người', 'không gian sụp đổ', 'cấp thảm họa'],
    },
    honorifics: {
      superior: ['viện sĩ', 'giáo sư', 'tư lệnh', 'chỉ huy trưởng', 'tiến sĩ'],
      peer: ['đồng nghiệp', 'đội trưởng', 'chiến hữu', 'phi hành gia', 'kỹ sư trưởng'],
      enemy: ['mục tiêu', 'thể ngoại lai', 'kẻ xâm lược', 'mối đe dọa', 'AI nổi loạn'],
    },
  },

  'vong-du': {
    emotions: {
      anger: ['tức muốn ném bàn phím', 'điên tiết', 'rage quit', 'nộ khí xung thiên', 'tức đỏ mặt'],
      shock: ['WTF', 'mắt trợn tròn', 'đứng hình', 'hốt hoảng', 'bug não'],
      contempt: ['noob', 'coi thường', 'trash', 'rác rưởi', 'không xứng đánh'],
      determination: ['quyết đấu', 'không bỏ cuộc', 'all-in', 'solo đến chết', 'phải thắng'],
    },
    powerExpressions: {
      techniques: ['skill', 'combo', 'ultimate', 'bí kỹ', 'thiên phú kỹ năng'],
      weakToStrong: ['từ lv.1 đến max', 'carry team', 'solo boss', 'clutch play', 'phản sát'],
      breakthrough: ['level up', 'tiến hóa class', 'mở khóa skill mới', 'đột phá', 'chuyển chức'],
    },
    atmosphere: {
      tense: ['boss enrage', 'timer đếm ngược', 'HP gần hết', 'last hit', 'sinh tử một chiêu'],
      mysterious: ['dungeon bí ẩn', 'hidden quest', 'NPC bí ẩn', 'easter egg', 'lore cổ đại'],
      dangerous: ['instant kill', 'PK zone', 'map tử thần', 'field boss', 'raid hell mode'],
    },
    honorifics: {
      superior: ['đại thần', 'guild master', 'server thứ nhất', 'legend', 'sư phụ'],
      peer: ['đồng đội', 'party member', 'anh em', 'guild mate', 'bạn đồng hành'],
      enemy: ['PKer', 'tên kia', 'boss', 'raid boss', 'đối thủ'],
    },
  },

  'dong-nhan': {
    emotions: {
      anger: ['phẫn nộ', 'tức giận', 'sát ý bùng phát', 'bùng nổ cảm xúc', 'nộ hỏa'],
      shock: ['kinh ngạc', 'choáng váng', 'không tin nổi', 'sửng sốt', 'thất kinh'],
      contempt: ['khinh bỉ', 'coi thường', 'xem nhẹ', 'chê bai', 'nhìn không thấu'],
      determination: ['quyết tâm thay đổi', 'nhất định phải', 'không theo nguyên tác', 'cải biến vận mệnh', 'quyết chí'],
    },
    powerExpressions: {
      techniques: ['chiêu thức', 'năng lực', 'kỹ năng đặc biệt', 'hệ thống', 'bí thuật'],
      weakToStrong: ['thay đổi số phận', 'cướp cơ duyên', 'butterfly effect', 'vượt qua nguyên tác', 'nghịch thiên cải mệnh'],
      breakthrough: ['đột phá', 'tiến hóa', 'thức tỉnh', 'mở khóa', 'vượt giới hạn nguyên tác'],
    },
    atmosphere: {
      tense: ['kịch bản thay đổi', 'lệch quỹ đạo', 'nguy hiểm', 'timeline bất ổn', 'hiệu ứng bướm'],
      mysterious: ['bí mật ẩn giấu', 'khác nguyên tác', 'thế giới song song', 'bí ẩn', 'manh mối'],
      dangerous: ['nguy cơ tử vong', 'boss cấp cao', 'tình huống chưa từng có', 'vượt ngoài tầm kiểm soát', 'thập tử nhất sinh'],
    },
    honorifics: {
      superior: ['tiền bối', 'sư phụ', 'đại nhân', 'sensei', 'lão sư'],
      peer: ['bạn đồng hành', 'nakama', 'đồng minh', 'huynh đệ', 'đồng bạn'],
      enemy: ['phản diện', 'kẻ thù', 'boss', 'đối thủ', 'ác nhân'],
    },
  },

  'mat-the': {
    emotions: {
      anger: ['giận dữ hoang dại', 'nổi điên', 'mất kiểm soát', 'cuồng nộ', 'tức muốn giết'],
      shock: ['kinh hoàng', 'sợ đến xanh mặt', 'chết lặng', 'máu đông cứng', 'hồn vía lên mây'],
      contempt: ['khinh bỉ', 'coi như rác', 'không xứng sống', 'phế vật', 'gánh nặng'],
      determination: ['phải sống', 'bằng mọi giá', 'không từ bỏ', 'sinh tồn', 'chiến đấu đến hơi thở cuối'],
    },
    powerExpressions: {
      techniques: ['năng lực dị biến', 'kỹ năng sinh tồn', 'vũ khí tự chế', 'năng lực đột biến', 'siêu năng lực'],
      weakToStrong: ['từ con mồi thành thợ săn', 'tiến hóa', 'thích nghi', 'vượt qua giới hạn', 'mạnh hơn mỗi ngày'],
      breakthrough: ['đột biến', 'tiến hóa', 'thức tỉnh', 'nâng cấp', 'biến dị'],
    },
    atmosphere: {
      tense: ['chết chóc bao trùm', 'mùi máu', 'im lặng chết chóc', 'bóng tối lảng vảng', 'nguy hiểm rình rập'],
      mysterious: ['phế tích bí ẩn', 'vùng cấm', 'đột biến kỳ lạ', 'tiếng gọi kỳ quái', 'thí nghiệm bí mật'],
      dangerous: ['zombie tràn ngập', 'quái vật đột biến', 'bức xạ chết người', 'khan hiếm tài nguyên', 'hỗn loạn xã hội'],
    },
    honorifics: {
      superior: ['thủ lĩnh', 'chỉ huy', 'đại ca', 'boss', 'người đứng đầu'],
      peer: ['đồng đội', 'anh em', 'người sống sót', 'đồng minh', 'partner'],
      enemy: ['zombie', 'quái vật', 'kẻ cướp', 'phản bội', 'tên điên'],
    },
  },

  'linh-di': {
    emotions: {
      anger: ['phẫn nộ', 'nghiến răng', 'nộ khí bùng phát', 'tức giận', 'phẫn hận'],
      shock: ['kinh hoàng', 'sợ hãi tột cùng', 'lạnh sống lưng', 'tim đập dồn dập', 'ớn lạnh toàn thân'],
      contempt: ['khinh miệt', 'coi thường', 'nhìn không thấu', 'chê bai', 'bất xứng'],
      determination: ['quyết tâm', 'dù chết cũng phải', 'không thể lùi', 'ngăn ác trừ tà', 'chí tại diệt ma'],
    },
    powerExpressions: {
      techniques: ['bùa chú', 'pháp thuật', 'trận pháp phong thủy', 'thuật triệu hồn', 'tâm linh chi lực'],
      weakToStrong: ['từ phàm nhân đến pháp sư', 'lĩnh ngộ', 'nắm vững cấm thuật', 'phá giải lời nguyền'],
      breakthrough: ['khai nhãn', 'thông linh', 'phá giải', 'lĩnh ngộ', 'thăng cấp pháp lực'],
    },
    atmosphere: {
      tense: ['rùng mình', 'gáy tóc dựng đứng', 'không khí lạnh lẽo', 'tiếng bước chân vô hình', 'bóng đen nhấp nháy'],
      mysterious: ['ám khí', 'linh hồn lang thang', 'lời nguyền cổ xưa', 'phong thủy bất thường', 'huyền bí'],
      dangerous: ['ma quỷ', 'lời nguyền chết', 'vong linh tà ác', 'quỷ dị', 'cõi âm xâm nhập'],
    },
    honorifics: {
      superior: ['sư phụ', 'thiên sư', 'đạo trưởng', 'pháp sư', 'chân nhân'],
      peer: ['đồng môn', 'đạo hữu', 'sư huynh', 'sư đệ', 'đồng bạn'],
      enemy: ['ác quỷ', 'tà linh', 'ma đầu', 'quỷ vương', 'tà sư'],
    },
  },

  'quan-truong': {
    emotions: {
      anger: ['tức giận ngấm ngầm', 'ức chế', 'phẫn nộ che giấu', 'nộ khí', 'bực bội'],
      shock: ['kinh ngạc', 'sửng sốt', 'biến sắc', 'không ngờ', 'chấn động'],
      contempt: ['coi thường', 'khinh miệt ngầm', 'xem nhẹ', 'không đáng để ý', 'bất xứng'],
      determination: ['quyết tâm leo cao', 'không lùi bước', 'nhất định phải thắng', 'dốc toàn lực', 'ẩn nhẫn'],
    },
    powerExpressions: {
      techniques: ['mưu kế chính trị', 'vận động hành lang', 'nắm thóp', 'thao túng dư luận', 'liên minh ngầm'],
      weakToStrong: ['từ cán bộ nhỏ lên đỉnh cao', 'từ cấp dưới thành cấp trên', 'lật ngược thế cờ', 'gạt bỏ mọi trở ngại'],
      breakthrough: ['thăng chức', 'được bổ nhiệm', 'nắm quyền', 'bứt phá', 'kiểm soát cục diện'],
    },
    atmosphere: {
      tense: ['không khí nặng nề', 'mưu kế ngầm', 'căng như dây đàn', 'áp lực ngột ngạt', 'cuộc chiến vô hình'],
      mysterious: ['bí mật chính trường', 'thế lực ngầm', 'tay trong', 'mạng lưới bí ẩn', 'đằng sau hậu trường'],
      dangerous: ['nguy cơ bị hất cẳng', 'bẫy chính trị', 'âm mưu phế truất', 'dao kề cổ', 'sự nghiệp tan vỡ'],
    },
    honorifics: {
      superior: ['thủ trưởng', 'bí thư', 'chủ tịch', 'lãnh đạo', 'đồng chí'],
      peer: ['đồng nghiệp', 'anh', 'chị', 'đồng chí', 'bạn'],
      enemy: ['đối thủ', 'kẻ chống đối', 'phe đối lập', 'tên kia', 'kẻ tiểu nhân'],
    },
  },

  'di-gioi': {
    emotions: {
      anger: ['phẫn nộ', 'tức giận', 'cuồng nộ', 'sát khí', 'bùng nổ cảm xúc'],
      shock: ['kinh ngạc', 'choáng váng', 'không tin nổi', 'sửng sốt', 'mắt tròn xoe'],
      contempt: ['khinh bỉ', 'coi thường', 'xem như bọn man di', 'bất xứng', 'lạc hậu'],
      determination: ['quyết tâm', 'phải sống sót', 'thích nghi', 'không lùi bước', 'chinh phục thế giới mới'],
    },
    powerExpressions: {
      techniques: ['ma pháp', 'chiêu thức', 'kỹ năng dị giới', 'năng lực đặc biệt', 'hệ thống'],
      weakToStrong: ['từ kẻ ngoại lai thành bá chủ', 'thích nghi và vượt trội', 'tri thức hiện đại áp đảo', 'phá vỡ quy tắc'],
      breakthrough: ['thăng cấp', 'đột phá', 'tiến hóa', 'mở khóa', 'lĩnh ngộ quy tắc mới'],
    },
    atmosphere: {
      tense: ['nguy hiểm rình rập', 'thế giới xa lạ', 'căng thẳng', 'đối đầu', 'ngột ngạt'],
      mysterious: ['thế giới kỳ lạ', 'sinh vật chưa thấy bao giờ', 'quy tắc khác biệt', 'bí ẩn', 'huyền bí'],
      dangerous: ['quái thú', 'bộ tộc thù địch', 'môi trường khắc nghiệt', 'hiểm cảnh', 'thập tử nhất sinh'],
    },
    honorifics: {
      superior: ['đại nhân', 'thủ lĩnh', 'tộc trưởng', 'chúa tể', 'sư phụ'],
      peer: ['đồng bạn', 'huynh đệ', 'chiến hữu', 'đồng minh', 'bạn đồng hành'],
      enemy: ['kẻ ngoại lai', 'tên xâm lược', 'quái vật', 'đối thủ', 'man tộc'],
    },
  },

  'ngon-tinh': {
    emotions: {
      anger: ['tức giận', 'hờn dỗi', 'ấm ức', 'bực mình', 'nổi nóng'],
      shock: ['sững sờ', 'tim đập nhanh', 'ngỡ ngàng', 'choáng váng', 'không tin nổi'],
      contempt: ['ghét bỏ', 'coi thường', 'khinh khỉnh', 'chê bai', 'lạnh nhạt'],
      determination: ['quyết tâm', 'không lùi bước', 'phải chứng minh', 'kiên cường', 'mạnh mẽ'],
    },
    powerExpressions: {
      techniques: ['sức hút cá nhân', 'năng lực sự nghiệp', 'tài năng thiên bẩm', 'trí tuệ cảm xúc', 'duyên ngầm'],
      weakToStrong: ['từ cô bé bình thường thành nữ cường', 'lột xác', 'chứng minh bản thân', 'từ bị khinh đến được nể'],
      breakthrough: ['thành công sự nghiệp', 'được công nhận', 'vượt qua tổn thương', 'trưởng thành', 'tỏa sáng'],
    },
    atmosphere: {
      tense: ['im lặng nặng nề', 'không khí đóng băng', 'khoảng cách vô hình', 'áp lực', 'căng thẳng'],
      mysterious: ['bí ẩn', 'quá khứ che giấu', 'thân phận bí mật', 'manh mối', 'ẩn giấu'],
      dangerous: ['mối đe dọa', 'nguy cơ chia ly', 'hiểm họa', 'bẫy', 'âm mưu'],
    },
    honorifics: {
      superior: ['tổng tài', 'giám đốc', 'anh ấy', 'ông chủ', 'đại nhân vật'],
      peer: ['anh', 'em', 'bạn thân', 'chị', 'đồng nghiệp'],
      enemy: ['con bé kia', 'tình địch', 'nữ phụ', 'kẻ thứ ba', 'đối thủ'],
    },
  },
};

// ============================================================================
// GENRE-SPECIFIC WRITING GUIDANCE (Phase 1B)
// Injected into Writer prompt via buildStyleContext()
// ============================================================================

interface GenreWritingGuide {
  sentenceStyle: string;
  dialogueStyle: string;
  descriptionFocus: string;
  emotionalTone: string;
  narrativeStrength: string;
}

const GENRE_WRITING_GUIDES: Record<GenreType, GenreWritingGuide> = {
  'tien-hiep': {
    sentenceStyle: 'Câu văn cổ kính, trang trọng. Chiến đấu: câu ngắn dứt khoát. Tu luyện: câu dài miêu tả thiên địa dị tượng. Dùng cấu trúc Hán-Việt khi mô tả tu luyện.',
    dialogueStyle: 'Hội thoại trang trọng, cổ phong. Tiền bối nói ít, ngụ ý sâu. Thiếu niên có thể bộc trực hơn. Dùng ngữ khí từ: "ngươi", "bản tọa", "lão phu".',
    descriptionFocus: 'Miêu tả cảnh giới, linh khí biến hóa, thiên tượng dị thường khi đột phá. Chiến đấu miêu tả chiêu thức bằng hình ảnh thiên nhiên (kiếm như long, chưởng như sơn).',
    emotionalTone: 'Nén chặt cảm xúc — nhân vật tu sĩ ít biểu lộ. Thể hiện cảm xúc qua hành động, ánh mắt, linh áp thay đổi. Chỉ bùng nổ vào thời khắc then chốt.',
    narrativeStrength: 'Thế giới quan hùng vĩ, hệ thống sức mạnh rõ ràng, tham vọng vô hạn.',
  },
  'huyen-huyen': {
    sentenceStyle: 'Hoành tráng, bùng nổ. Chiến đấu: câu ngắn liên tục, tiết tấu nhanh như sấm sét. Miêu tả sức mạnh: dùng hình ảnh vũ trụ (tinh hà, hỗn độn, hủy diệt).',
    dialogueStyle: 'Bá khí, tự tin. MC nói ít nhưng mỗi câu đều mang áp lực. Villain huênh hoang trước, câm lặng sau. Đồng bối nói năng huynh đệ nghĩa khí.',
    descriptionFocus: 'Chiêu thức epic scale (thiên địa đổi sắc, sơn hà vỡ vụn). Chiến trường miêu tả vạn người, máu nhuộm bầu trời. Linh thú, thần binh, bảo vật miêu tả chi tiết.',
    emotionalTone: 'Hot blood, nhiệt huyết. Không ngại thể hiện sự phẫn nộ, quyết tâm. Nhưng vẫn có khoảnh khắc yên tĩnh sâu sắc giữa bão phong.',
    narrativeStrength: 'Chiến đấu hoành tráng, leo thang xung đột không ngừng, hệ sức mạnh đa dạng.',
  },
  'do-thi': {
    sentenceStyle: 'Hiện đại, gọn gàng, nhịp nhanh. Đối thoại sắc bén, hài hước. Tránh câu văn quá dài. Miêu tả đời sống xa hoa bằng chi tiết cụ thể (thương hiệu, giá tiền, địa danh).',
    dialogueStyle: 'Nói năng hiện đại, có thể xen tiếng lóng. Thiếu gia ngạo mạn, nữ tổng tài lạnh lùng, MC tỉnh bơ mỉa mai. Đối thoại nhanh qua lại kiểu khẩu chiến.',
    descriptionFocus: 'Đời sống thượng lưu: siêu xe, biệt thự, nhà hàng, tiệc tùng. Kinh doanh: số liệu, chiến lược, đàm phán. Trang phục, ngoại hình miêu tả tinh tế.',
    emotionalTone: 'Sảng văn — MC bình thản nhưng hành động nói lên tất cả. Người xung quanh phản ứng thay người đọc (há hốc mồm, sợ hãi, ngưỡng mộ).',
    narrativeStrength: 'Tát mặt sướng, lộ thân phận sốc, flex tài sản quyền lực, đời sống thượng lưu.',
  },
  'kiem-hiep': {
    sentenceStyle: 'Cổ điển, thi vị. Chiến đấu miêu tả bằng hình ảnh thơ mộng (kiếm như sương mai, chưởng tựa thác đổ). Câu văn có nhịp điệu, đôi khi đối xứng như thơ.',
    dialogueStyle: 'Hào sảng, nghĩa khí. Anh hùng nói chuyện giữa chén rượu. Hiệp khách trọng lời hứa. Ác nhân nói ẩn ý sâu. Dùng cổ ngữ tự nhiên, không gượng ép.',
    descriptionFocus: 'Giang hồ, sơn thủy, tửu quán, kiếm pháp. Miêu tả chiêu thức qua cảm giác (gió kiếm, kiếm ý, sát khí). Bối cảnh cổ trang chi tiết: phong tục, ẩm thực, trang phục.',
    emotionalTone: 'Bi tráng, hào sảng. Ân oán phân minh, tình thù giao tranh. Tình huynh đệ nặng như sơn. Tình yêu bi kịch nhưng đẹp.',
    narrativeStrength: 'Nghĩa khí giang hồ, tình huynh đệ, kiếm pháp thơ mộng, ân oán minh bạch.',
  },
  'lich-su': {
    sentenceStyle: 'Trang trọng, có trọng lượng. Miêu tả triều chính bằng ngôn từ trang nhã. Chiến trận miêu tả macro (đội hình, chiến thuật, hậu cần). Mưu kế diễn giải logic, nhiều tầng.',
    dialogueStyle: 'Triều đình: trang trọng, nhiều ẩn ý. Đối đáp chính trị: mỗi câu đều có mưu tính. Quân sự: ngắn gọn, dứt khoát. Dân gian: bình dị, chân thực.',
    descriptionFocus: 'Chi tiết lịch sử chân thực (triều đại, phong tục, quân sự, kinh tế). Cung điện, chiến trường, chợ búa thời đại. Đồ ăn, trang phục, nghi lễ phù hợp lịch sử.',
    emotionalTone: 'Sâu lắng, chín chắn. Cảm xúc kìm nén sau lớp vỏ triều đình. Đau thương vì sự hy sinh. Hào sảng khi thắng trận. Bi phẫn trước bất công.',
    narrativeStrength: 'Mưu kế IQ cao, chi tiết lịch sử chân thực, quyền lực chính trị, chiến thuật quân sự.',
  },
  'khoa-huyen': {
    sentenceStyle: 'Logic, hiện đại, khoa học. Miêu tả công nghệ chi tiết nhưng dễ hiểu. Chiến đấu bằng vũ khí/tàu vũ trụ miêu tả quy mô lớn. Dùng thuật ngữ khoa học tự nhiên.',
    dialogueStyle: 'Chuyên nghiệp, logic. Nhà khoa học tranh luận bằng dữ kiện. Quân nhân ngắn gọn, hiệu quả. AI nói lạnh lùng, chính xác. MC phân tích tình huống bằng lý trí.',
    descriptionFocus: 'Công nghệ: tàu vũ trụ, vũ khí năng lượng, giáp cơ khí. Không gian vũ trụ: tinh vân, hành tinh, black hole. Phòng thí nghiệm, trạm không gian, thành phố tương lai.',
    emotionalTone: 'Lý trí dẫn đầu nhưng không thiếu cảm xúc. Nhân loại đối mặt diệt vong tạo bi tráng. Tình đồng đội trong khó khăn. Đạo đức nan đề khi chọn hy sinh.',
    narrativeStrength: 'Hard sci-fi logic, quy mô vũ trụ, đạo đức nan đề, khám phá tri thức.',
  },
  'vong-du': {
    sentenceStyle: 'Gaming style, nhanh nhẹn, đôi khi hài hước. Chiến đấu miêu tả combo, skill, HP bar. Xen kẽ hệ thống notification (ngắn gọn, không spam). Level up có cảm giác sướng.',
    dialogueStyle: 'Game chat style: casual, đôi khi trash talk. Guild meeting nghiêm túc hơn. NPC nói chuyện theo setting game. MC có thể breaking 4th wall nhẹ.',
    descriptionFocus: 'Giao diện game, stats, inventory. Dungeon, raid, PvP arena miêu tả chi tiết. Boss design, skill effect, combo animation. Loot, equipment, upgrade.',
    emotionalTone: 'Vui nhộn, competitive. Hồi hộp khi raid boss. Sướng khi loot rare item. Bực bội khi bị PK. Nhưng cũng có khoảnh khắc nghiêm túc về IRL stakes.',
    narrativeStrength: 'Hệ thống game hấp dẫn, PvP kịch tính, loot addiction, guild drama.',
  },
  'dong-nhan': {
    sentenceStyle: 'Linh hoạt theo thế giới gốc. Nếu là anime: sống động, năng lượng cao. Nếu là wuxia: cổ phong. Quan trọng là giữ tone của nguyên tác nhưng thêm twist.',
    dialogueStyle: 'Nhân vật gốc phải in-character. MC xuyên không có thể dùng ngôn ngữ hiện đại tạo contrast hài hước. Callback đến plot gốc qua đối thoại tự nhiên.',
    descriptionFocus: 'Setting nguyên tác miêu tả chính xác (vị trí, sự kiện, nhân vật). Điểm khác biệt (butterfly effect) highlight rõ ràng. Easter egg cho fan nguyên tác.',
    emotionalTone: 'Tùy nguyên tác nhưng thêm chiều sâu. Nếu nguyên tác vui → thêm bi kịch nhẹ. Nếu nguyên tác nghiêm túc → thêm hài hước. Tạo emotional contrast.',
    narrativeStrength: 'Fan service callback, butterfly effect, thay đổi vận mệnh, cross-world knowledge.',
  },
  'mat-the': {
    sentenceStyle: 'Gồ ghề, thô ráp, thực tế. Miêu tả máu me, bạo lực trực diện. Câu ngắn trong nguy hiểm. Miêu tả cảm giác đói, khát, mệt, đau thể xác cụ thể.',
    dialogueStyle: 'Ngắn gọn, thực dụng. Không có thời gian dài dòng. Giao tiếp bằng ký hiệu khi ẩn nấp. Xung đột nảy sinh từ tài nguyên. Trust issues trong mọi cuộc đối thoại.',
    descriptionFocus: 'Cảnh hoang tàn: thành phố đổ nát, đường phố hoang vắng, xác chết. Tài nguyên: thức ăn, nước, vũ khí, thuốc men. Zombie/quái vật miêu tả kinh dị chi tiết.',
    emotionalTone: 'Tuyệt vọng xen hy vọng. Mất mát liên tục. Trust nobody. Nhưng tình người hiếm hoi trong mạt thế càng quý giá. Sự sống mong manh.',
    narrativeStrength: 'Sinh tồn khốc liệt, tài nguyên khan hiếm, trust issues, tình người giữa hỗn loạn.',
  },
  'linh-di': {
    sentenceStyle: 'Rùng rợn, chậm rãi, tạo không khí. Câu dài miêu tả bóng tối, âm thanh kỳ lạ. Im lặng đáng sợ hơn tiếng ồn. Miêu tả 5 giác quan tập trung vào sợ hãi.',
    dialogueStyle: 'Ít nói, nhiều im lặng. Tiếng thì thầm, lời cảnh báo bí ẩn. Ma quỷ nói lời dụ dỗ ngọt ngào. Pháp sư nói kinh văn, thần chú. NPC nói nửa vời, ẩn ý.',
    descriptionFocus: 'Không khí: bóng tối, sương mù, ánh nến, tiếng gió. Ma quỷ: hình dáng méo mó, mùi hôi thối, nhiệt độ thay đổi. Phong thủy: trận pháp, bùa chú, linh vật.',
    emotionalTone: 'Sợ hãi từ từ leo thang. Không jump scare — dùng atmospheric horror. Nghi ngờ mọi thứ. Cảm giác bị theo dõi. An toàn là ảo giác.',
    narrativeStrength: 'Atmospheric horror, mystery puzzle, phong thủy huyền bí, tâm lý sợ hãi.',
  },
  'quan-truong': {
    sentenceStyle: 'Điềm đạm, sâu sắc, nhiều tầng nghĩa. Mỗi câu trong hội nghị đều có mưu tính. Miêu tả quyền lực qua chi tiết nhỏ (vị trí ngồi, ai rót trà, ai im lặng).',
    dialogueStyle: 'Nói một đằng nghĩ một nẻo. Hội thoại chính trường: ẩn ý, bóng gió, thăm dò. Không ai nói thẳng mục đích. Lời khen có thể là lời đe dọa. Im lặng là vũ khí.',
    descriptionFocus: 'Phòng họp, văn phòng, bàn tiệc — nơi quyền lực giao dịch. Chi tiết: ai bắt tay ai, ai phớt lờ ai, vị trí ngồi thể hiện thứ bậc. Ô tô, nhà ở = biểu tượng quyền lực.',
    emotionalTone: 'Kìm nén tối đa. Thể hiện cảm xúc = lộ sơ hở. Chiến thắng bình thản, thất bại cũng bình thản. Chỉ khi một mình mới để lộ áp lực.',
    narrativeStrength: 'IQ cao, mưu kế nhiều tầng, leo lên quyền lực, quan hệ phức tạp.',
  },
  'di-gioi': {
    sentenceStyle: 'Phiêu lưu, sống động. Miêu tả thế giới mới bằng con mắt kinh ngạc. So sánh với thế giới cũ tạo contrast. Khám phá = hứng thú. Nguy hiểm = hồi hộp.',
    dialogueStyle: 'MC dùng ngôn ngữ hiện đại tạo hài hước khi giao tiếp với dân dị giới. Rào cản ngôn ngữ tạo tình huống thú vị. Dân bản địa nói theo phong cách thế giới đó.',
    descriptionFocus: 'Thế giới mới: cảnh quan kỳ lạ, sinh vật chưa thấy, quy tắc vật lý khác. Ẩm thực, trang phục, kiến trúc dị giới. Hệ thống ma pháp/sức mạnh độc đáo.',
    emotionalTone: 'Kích thích, phấn khích khi khám phá. Lo lắng khi đối mặt cái lạ. Nhớ nhà. Dần yêu thế giới mới. Xung đột giữa hai thế giới.',
    narrativeStrength: 'Worldbuilding phong phú, khám phá mới mẻ, tri thức hiện đại vs dị giới, culture clash.',
  },
  'ngon-tinh': {
    sentenceStyle: 'Mềm mại, giàu cảm xúc. Câu dài miêu tả nội tâm, cảm giác. Câu ngắn khi đối thoại ngọt ngào hoặc căng thẳng. Ẩn dụ về thiên nhiên, mùa, thời tiết phản chiếu tâm trạng.',
    dialogueStyle: 'Tình cảm, nhiều tầng nghĩa. Nam chính nói ít nhưng mỗi câu đều sâu. Nữ chính nội tâm phong phú, nói không hết ý. Đối thoại ngọt ngào xen kẽ hiểu lầm tạo drama.',
    descriptionFocus: 'Cảm xúc nội tâm: tim đập, má đỏ, hơi thở, ánh mắt. Chi tiết lãng mạn: quà tặng, khoảnh khắc bất ngờ, cử chỉ nhỏ. Sự nghiệp nữ chính: công việc, thành tựu, nỗ lực.',
    emotionalTone: 'Giàu cảm xúc, tinh tế. Ngọt ngào xen kẽ đau lòng. Rung động nhẹ nhàng, không quá dramatic. Hiểu lầm tạo đau khổ nhưng hòa giải tạo cảm động.',
    narrativeStrength: 'Rung động tình cảm, sweet moment, nội tâm sâu sắc, sủng chiều.',
  },
};

// ============================================================================
// PACING RULES (scene-type based, genre-agnostic — adequate for all genres)
// ============================================================================

const DEFAULT_PACING_RULES: Record<SceneType, PacingRule> = {
  action: {
    sentenceLength: { min: 5, max: 15 },
    dialogueRatio: { min: 0.1, max: 0.3 },
    paceSpeed: 'fast',
  },
  cultivation: {
    sentenceLength: { min: 10, max: 25 },
    dialogueRatio: { min: 0.1, max: 0.2 },
    paceSpeed: 'slow',
  },
  revelation: {
    sentenceLength: { min: 8, max: 20 },
    dialogueRatio: { min: 0.2, max: 0.4 },
    paceSpeed: 'medium',
  },
  romance: {
    sentenceLength: { min: 10, max: 25 },
    dialogueRatio: { min: 0.3, max: 0.5 },
    paceSpeed: 'slow',
  },
  dialogue: {
    sentenceLength: { min: 5, max: 15 },
    dialogueRatio: { min: 0.5, max: 0.7 },
    paceSpeed: 'medium',
  },
  tension: {
    sentenceLength: { min: 5, max: 12 },
    dialogueRatio: { min: 0.1, max: 0.25 },
    paceSpeed: 'fast',
  },
  comedy: {
    sentenceLength: { min: 5, max: 15 },
    dialogueRatio: { min: 0.4, max: 0.6 },
    paceSpeed: 'medium',
  },
};

// ============================================================================
// PUBLIC API (Phase 1C)
// ============================================================================

/**
 * Get genre-specific enhanced style bible.
 * Returns vocabulary tuned to the genre (cultivation terms for tiên-hiệp,
 * modern business terms for đô-thị, horror terms for linh-dị, etc.)
 */
export function getEnhancedStyleBible(genre: GenreType): EnhancedStyleBible {
  return {
    vocabulary: GENRE_VOCABULARY[genre] ?? GENRE_VOCABULARY['tien-hiep'],
    pacingRules: DEFAULT_PACING_RULES,
    exemplars: [],
    cliffhangerTechniques: CLIFFHANGER_TECHNIQUES,
  };
}

/**
 * Build genre-specific and scene-type-specific writing style context.
 * Injected into the Writer prompt to guide tone, vocabulary, and narrative approach.
 */
export function buildStyleContext(genre: GenreType, dominantSceneType: string): string {
  const guide = GENRE_WRITING_GUIDES[genre] ?? GENRE_WRITING_GUIDES['tien-hiep'];

  // Determine pacing guidance based on dominant scene type
  const sceneType = (dominantSceneType as SceneType) || 'dialogue';
  const pacing = DEFAULT_PACING_RULES[sceneType] ?? DEFAULT_PACING_RULES.dialogue;
  const pacingLabel = pacing.paceSpeed === 'fast' ? 'NHANH — câu ngắn, dứt khoát'
    : pacing.paceSpeed === 'slow' ? 'CHẬM — câu dài, miêu tả sâu'
    : 'VỪA — xen kẽ câu dài ngắn';

  return `PHONG CÁCH VIẾT (${genre.toUpperCase()}):
- Câu văn: ${guide.sentenceStyle}
- Đối thoại: ${guide.dialogueStyle}
- Miêu tả: ${guide.descriptionFocus}
- Giọng cảm xúc: ${guide.emotionalTone}
- Thế mạnh thể loại: ${guide.narrativeStrength}
- Nhịp scene chính: ${pacingLabel}
- Show don't tell: miêu tả biểu cảm, hành động, cảm giác cơ thể — KHÔNG tường thuật cảm xúc
- Mỗi nhân vật có giọng riêng biệt, nhận diện qua ngữ khí và cách nói`;
}
