/**
 * Style Bible - Qidian-style writing guidelines with few-shot exemplars
 *
 * Covers:
 * 1. Vocabulary & Tone (xưng hô, "hừ lạnh", "sát ý"...)
 * 2. Pacing rules per scene type
 * 3. Dialogue patterns
 * 4. Cliffhanger techniques
 * 5. Few-shot exemplars (5-10 "chuẩn" examples)
 */

import { GenreType } from './types';

// Scene types and their pacing rules
export type SceneType =
  | 'action'           // Chiến đấu
  | 'dialogue'         // Hội thoại
  | 'cultivation'      // Tu luyện
  | 'revelation'       // Tiết lộ bí mật
  | 'romance'          // Tình cảm
  | 'tension'          // Căng thẳng
  | 'comedy'           // Hài hước
  | 'transition';      // Chuyển cảnh

export interface PacingRule {
  sceneType: SceneType;
  sentenceLength: { min: number; max: number; avg: number };
  paragraphLength: { min: number; max: number };
  dialogueRatio: { min: number; max: number };  // % of scene
  innerMonologueRatio: { min: number; max: number };
  descriptionDensity: 'sparse' | 'moderate' | 'dense';
  paceSpeed: 'fast' | 'medium' | 'slow';
}

export interface VocabularyGuide {
  // Honorifics
  honorifics: {
    superior: string[];      // Cách xưng hô với bề trên
    peer: string[];          // Ngang hàng
    inferior: string[];      // Bề dưới
    enemy: string[];         // Kẻ thù
  };

  // Power expressions
  powerExpressions: {
    weakToStrong: string[];  // Cảm nhận khi gặp cao thủ
    breakthrough: string[];  // Mô tả đột phá
    techniques: string[];    // Thi triển chiêu thức
  };

  // Emotional expressions
  emotions: {
    anger: string[];
    shock: string[];
    determination: string[];
    contempt: string[];
    fear: string[];
  };

  // Atmosphere
  atmosphere: {
    tense: string[];
    triumphant: string[];
    mysterious: string[];
    dangerous: string[];
  };
}

export interface StyleExemplar {
  id: string;
  sceneType: SceneType;
  description: string;
  content: string;
  notes: string[];
}

// Pacing rules by scene type
export const PACING_RULES: Record<SceneType, PacingRule> = {
  action: {
    sceneType: 'action',
    sentenceLength: { min: 5, max: 20, avg: 12 },
    paragraphLength: { min: 30, max: 150 },
    dialogueRatio: { min: 0.1, max: 0.3 },
    innerMonologueRatio: { min: 0.05, max: 0.15 },
    descriptionDensity: 'sparse',
    paceSpeed: 'fast',
  },
  dialogue: {
    sceneType: 'dialogue',
    sentenceLength: { min: 8, max: 30, avg: 18 },
    paragraphLength: { min: 50, max: 200 },
    dialogueRatio: { min: 0.5, max: 0.8 },
    innerMonologueRatio: { min: 0.1, max: 0.25 },
    descriptionDensity: 'sparse',
    paceSpeed: 'medium',
  },
  cultivation: {
    sceneType: 'cultivation',
    sentenceLength: { min: 15, max: 40, avg: 25 },
    paragraphLength: { min: 100, max: 300 },
    dialogueRatio: { min: 0, max: 0.1 },
    innerMonologueRatio: { min: 0.3, max: 0.5 },
    descriptionDensity: 'dense',
    paceSpeed: 'slow',
  },
  revelation: {
    sceneType: 'revelation',
    sentenceLength: { min: 10, max: 35, avg: 20 },
    paragraphLength: { min: 80, max: 250 },
    dialogueRatio: { min: 0.2, max: 0.5 },
    innerMonologueRatio: { min: 0.2, max: 0.4 },
    descriptionDensity: 'moderate',
    paceSpeed: 'medium',
  },
  romance: {
    sceneType: 'romance',
    sentenceLength: { min: 12, max: 35, avg: 22 },
    paragraphLength: { min: 80, max: 200 },
    dialogueRatio: { min: 0.3, max: 0.6 },
    innerMonologueRatio: { min: 0.2, max: 0.35 },
    descriptionDensity: 'moderate',
    paceSpeed: 'slow',
  },
  tension: {
    sceneType: 'tension',
    sentenceLength: { min: 8, max: 25, avg: 15 },
    paragraphLength: { min: 50, max: 180 },
    dialogueRatio: { min: 0.2, max: 0.5 },
    innerMonologueRatio: { min: 0.15, max: 0.3 },
    descriptionDensity: 'moderate',
    paceSpeed: 'medium',
  },
  comedy: {
    sceneType: 'comedy',
    sentenceLength: { min: 8, max: 25, avg: 15 },
    paragraphLength: { min: 40, max: 150 },
    dialogueRatio: { min: 0.4, max: 0.7 },
    innerMonologueRatio: { min: 0.1, max: 0.25 },
    descriptionDensity: 'sparse',
    paceSpeed: 'fast',
  },
  transition: {
    sceneType: 'transition',
    sentenceLength: { min: 15, max: 40, avg: 25 },
    paragraphLength: { min: 100, max: 250 },
    dialogueRatio: { min: 0, max: 0.2 },
    innerMonologueRatio: { min: 0.1, max: 0.3 },
    descriptionDensity: 'moderate',
    paceSpeed: 'medium',
  },
};

// Qidian vocabulary guide
export const QIDIAN_VOCABULARY: VocabularyGuide = {
  honorifics: {
    superior: [
      'tiền bối', 'sư tổ', 'lão tổ', 'đại nhân', 'các hạ',
      'tông chủ', 'chưởng môn', 'trưởng lão', 'sư phụ', 'thánh nhân'
    ],
    peer: [
      'huynh', 'đệ', 'sư huynh', 'sư đệ', 'đạo hữu', 'bằng hữu',
      'hiền đệ', 'lão ca', 'huynh đài', 'ngươi'
    ],
    inferior: [
      'tiểu tử', 'hậu bối', 'đệ tử', 'thằng nhóc', 'tiểu quỷ',
      'nhóc con', 'tiểu hài', 'tên kia'
    ],
    enemy: [
      'tên khốn', 'thằng chó', 'lão quỷ', 'ngươi', 'tên vô sỉ',
      'tên khốn kiếp', 'thằng điên', 'con giun'
    ],
  },
  powerExpressions: {
    weakToStrong: [
      'như núi Thái Sơn đè xuống',
      'hơi thở nghẹt ngào',
      'không thể nhúc nhích',
      'sát khí ngút trời',
      'uy áp kinh người',
      'thần hồn điên đảo',
      'tim gan run rẩy',
      'máu lạnh trong người',
    ],
    breakthrough: [
      'thiên địa gầm rung',
      'sấm vang chín tầng',
      'kinh lôi giáng xuống',
      'linh khí cuồn cuộn',
      'đan điền chấn động',
      'cảnh giới vững chắc',
      'nền tảng kiên cố',
      'khí tức bùng nổ',
    ],
    techniques: [
      'xuất thủ như điện',
      'kiếm mang lóe sáng',
      'quyền phong cuồng bạo',
      'thủ ấn biến hóa',
      'pháp lực tuôn trào',
      'linh lực quanh thân',
      'hư không rung chuyển',
      'không khí nổ vang',
    ],
  },
  emotions: {
    anger: [
      'mắt phóng lên tia sáng lạnh',
      'sát ý ngút trời',
      'hừ lạnh một tiếng',
      'giọng lạnh như băng',
      'nanh vuốt lộ ra',
      'sát khí toát ra',
      'lửa giận bùng lên',
      'máu nóng sôi trào',
    ],
    shock: [
      'tim suýt nhảy ra ngoài',
      'hít một ngụm khí lạnh',
      'sắc mặt đại biến',
      'đồng tử co lại',
      'không thể tin nổi',
      'như sét đánh ngang tai',
      'kinh ngạc đến cực điểm',
      'đầu óc trống rỗng',
    ],
    determination: [
      'ánh mắt kiên định',
      'quyết tâm như sắt',
      'ý chí không lay chuyển',
      'sống chết cũng phải',
      'dù chết cũng không lùi',
      'một khi đã quyết',
      'lòng như sắt đá',
      'quyết không thỏa hiệp',
    ],
    contempt: [
      'cười nhạt',
      'xem như không khí',
      'không thèm liếc mắt',
      'kiến mà cũng đòi',
      'ếch ngồi đáy giếng',
      'quá không biết trời cao đất dày',
      'cũng dám mơ',
      'đúng là không biết sống chết',
    ],
    fear: [
      'lạnh sống lưng',
      'chân run lẩy bẩy',
      'mồ hôi lạnh toát ra',
      'tim đập loạn nhịp',
      'như rơi vào địa ngục',
      'hồn phi phách tán',
      'không dám tin',
      'sợ đến phát run',
    ],
  },
  atmosphere: {
    tense: [
      'không khí đông đặc',
      'im lặng đến nghẹt thở',
      'căng thẳng như dây cung',
      'một mất một còn',
      'ngàn cân treo sợi tóc',
      'không gian ngưng đọng',
    ],
    triumphant: [
      'hào khí ngút trời',
      'oai phong lẫm liệt',
      'khí thế như hồng',
      'vinh quang tột đỉnh',
      'thiên hạ đệ nhất',
      'không ai địch nổi',
    ],
    mysterious: [
      'bí ẩn khó dò',
      'mây mù bao phủ',
      'thiên cơ bất khả lộ',
      'huyền bí vô cùng',
      'không ai biết được',
      'ẩn chứa bí mật',
    ],
    dangerous: [
      'nguy hiểm tứ phía',
      'sát cơ trùng trùng',
      'chết bất cứ lúc nào',
      'như đi trên bờ vực',
      'hung hiểm cực độ',
      'mạng như cỏ rác',
    ],
  },
};

// Few-shot exemplars - Qidian style
export const QIDIAN_EXEMPLARS: StyleExemplar[] = [
  {
    id: 'action_fight_1',
    sceneType: 'action',
    description: 'Cảnh chiến đấu tốc độ cao với nhân vật mạnh hơn',
    content: `Lâm Phong không kịp phản ứng, nắm đấm của đối phương đã ập đến.

"Bang!"

Hắn bay ngược ra sau, máu tuôn ra từ khóe miệng. Nhưng ánh mắt vẫn lạnh như băng.

"Chỉ có thế thôi sao?"

Linh lực bùng nổ! Thân hình hắn biến mất tại chỗ, xuất hiện ngay sau lưng kẻ địch.

Một kiếm!

Kiếm mang lóe lên, xé toạc không khí. Máu tươi phun ra.

"Ngươi..."

Kẻ địch không kịp nói hết câu, đã ngã xuống.`,
    notes: [
      'Câu ngắn, tiết tấu nhanh',
      'Nhiều dấu chấm than và onomatopoeia',
      'Dialogue ngắn gọn, đầy tính chiến đấu',
      'Mô tả hành động trực tiếp, không rườm rà',
    ],
  },
  {
    id: 'humiliation_revenge_1',
    sceneType: 'dialogue',
    description: 'Cảnh bị sỉ nhục và thề báo thù - chuẩn Qidian',
    content: `"Thằng phế vật, cũng dám đứng trước mặt ta?"

Trương Hạo cười lạnh, ánh mắt đầy khinh bỉ nhìn xuống Lâm Phong.

Xung quanh, tiếng cười chế nhạo vang lên.

"Luyện Khí tầng ba? Ha ha ha!"
"Cũng dám đòi vào tông môn?"
"Có lẽ hắn muốn quét dọn sân bãi?"

Lâm Phong im lặng. Nắm tay siết chặt, móng tay đâm sâu vào lòng bàn tay, máu từ từ chảy ra.

Hắn ngẩng đầu lên, ánh mắt như đao.

"Được. Ta nhớ ngươi rồi."

Giọng nói bình tĩnh đến lạ thường, nhưng ai cũng cảm nhận được cơn bão đang ẩn giấu trong đó.

"Ba năm! Ba năm nữa, ta sẽ quay lại đây. Lúc đó..."

Hắn quay người bước đi, để lại một câu vang vọng:

"Ngươi sẽ quỳ dưới chân ta."`,
    notes: [
      'Cấu trúc: Sỉ nhục → Chịu đựng → Thề phục hận',
      'Villain tự cao tự đại, dùng từ khinh miệt',
      'MC im lặng chịu đựng, tích tụ quyết tâm',
      'Câu nói cuối tạo cliffhanger',
    ],
  },
  {
    id: 'cultivation_breakthrough_1',
    sceneType: 'cultivation',
    description: 'Cảnh đột phá cảnh giới với mô tả chi tiết',
    content: `Lâm Phong ngồi xếp bằng trong động phủ, linh khí xung quanh cuồn cuộn kéo đến.

Đã ba ngày ba đêm.

Trong đan điền, luồng linh lực ngày càng lớn mạnh. Từng đường kinh mạch được khai thông, từng huyệt đạo được tẩy luyện.

"Phụp!"

Một âm thanh vang lên trong cơ thể. Hắn cảm giác như có thứ gì đó vỡ ra.

Thiên địa bỗng nhiên rung chuyển!

Mây đen kéo đến từ bốn phương tám hướng. Sấm gầm vang dội. Đây là... thiên kiếp?

Không! Không phải thiên kiếp. Đây là dấu hiệu của Trúc Cơ thành công!

Linh lực trong cơ thể Lâm Phong bùng nổ. Cảnh giới từ Luyện Khí đỉnh phong, chính thức bước vào Trúc Cơ sơ kỳ!

"Ha ha ha!"

Hắn ngửa mặt cười lớn. Bao nhiêu năm chịu đựng, bao nhiêu sỉ nhục, cuối cùng cũng đến lúc trả lại!`,
    notes: [
      'Pacing chậm, mô tả chi tiết quá trình',
      'Dùng onomatopoeia cho moment đột phá',
      'Kết hợp hiện tượng thiên nhiên (mây, sấm)',
      'Kết thúc bằng cảm xúc mãnh liệt',
    ],
  },
  {
    id: 'revelation_secret_1',
    sceneType: 'revelation',
    description: 'Cảnh tiết lộ bí mật gây sốc',
    content: `"Ngươi... ngươi nói gì?"

Lâm Phong như bị sét đánh, đứng chết lặng tại chỗ.

Lão nhân nhìn hắn, ánh mắt đầy phức tạp.

"Ta nói, cha ngươi không phải người phàm. Hắn ta... là tiên nhân bị đày xuống trần!"

"Không thể nào!"

Lâm Phong lắc đầu. Trong ký ức của hắn, cha chỉ là một tiều phu bình thường. Sao có thể là tiên nhân?

"Nghĩ xem, tại sao linh căn của ngươi lại kỳ dị như vậy? Tại sao ngươi có thể tu luyện những thứ mà người khác không thể? Tất cả... đều là vì huyết mạch tiên nhân trong người ngươi!"

Mỗi lời của lão nhân như búa nện vào tim Lâm Phong.

Hắn bỗng nhớ lại. Những lần cha nhìn bầu trời đêm với ánh mắt đầy hoài niệm. Những câu nói khó hiểu trước khi cha qua đời.

"Cha... cha thật sự..."

Lâm Phong ngồi xuống, đầu óc quay cuồng. Mọi thứ hắn biết đã bị đảo lộn hoàn toàn.`,
    notes: [
      'Dùng dialogue để tiết lộ dần dần',
      'Phản ứng của MC: Sốc → Từ chối → Hồi tưởng → Chấp nhận',
      'Kết nối với các chi tiết đã rải trước đó',
      'Để mở cho development tiếp theo',
    ],
  },
  {
    id: 'cliffhanger_tension_1',
    sceneType: 'tension',
    description: 'Kết chương với cliffhanger căng thẳng',
    content: `Lâm Phong đứng giữa vòng vây.

Phía trước, năm trưởng lão Kim Đan kỳ.
Phía sau, hơn trăm đệ tử tay cầm pháp khí.
Trên trời, còn có Nguyên Anh cường giả đang khoanh tay đứng.

Không còn đường lui.

"Lâm Phong, ngươi đã giết Thiếu Tông Chủ. Tội này, không thể tha!"

Thanh kiếm trong tay hắn run lên. Không phải vì sợ, mà vì phấn khích.

Đây là tử địa? Không. Đây là cơ hội!

Hắn mỉm cười, một nụ cười khiến tất cả đều rùng mình.

"Các ngươi muốn mạng ta?"

Linh lực bùng nổ, một luồng khí tức khủng khiếp từ trong người Lâm Phong tuôn ra.

"Được! Nhưng trước tiên..."

Hắn ngẩng đầu nhìn Nguyên Anh cường giả trên không, ánh mắt không chút sợ hãi.

"... ngươi phải trả giá trước!"

[Hết chương]`,
    notes: [
      'Setup tình thế tuyệt vọng',
      'MC vẫn giữ bình tĩnh, thậm chí tự tin',
      'Hint về hidden power hoặc trump card',
      'Kết thúc ngay trước moment quyết định',
    ],
  },
  {
    id: 'face_slapping_1',
    sceneType: 'dialogue',
    description: 'Cảnh "tát mặt" - đảo ngược tình thế',
    content: `"Luyện Khí tầng ba dám thách đấu ta? Ngươi điên rồi!"

Vương Thiên cười lớn, hoàn toàn không coi Lâm Phong ra gì.

"Ta cho ngươi một chiêu. Đứng vững được, ta thua!"

Nắm đấm của hắn vung ra, mang theo uy lực của Trúc Cơ trung kỳ.

Mọi người đều nghĩ Lâm Phong sẽ bay ra. Nhưng...

"Bang!"

Lâm Phong không nhúc nhích. Một tay hắn nhẹ nhàng đỡ lấy quyền phong.

"Hết rồi sao?"

"Ngươi...!"

Vương Thiên biến sắc. Làm sao có thể? Luyện Khí tầng ba đỡ được đòn của Trúc Cơ trung kỳ?

"Đến lượt ta."

Lâm Phong vung tay. Chỉ một chưởng!

"Bàng!"

Vương Thiên bay ngược ra xa, máu phun thành vòi. Khi rơi xuống đất, đã bất tỉnh nhân sự.

Im lặng. Im lặng tuyệt đối.

Tất cả mọi người đều há hốc miệng nhìn cảnh tượng trước mắt, không thể tin nổi.

Lâm Phong phủi tay, bình thản bước đi.

"Chỉ có thế mà cũng đòi Trúc Cơ trung kỳ?"`,
    notes: [
      'Setup: Villain tự tin, xem thường MC',
      'Build-up: Villain tấn công trước',
      'Twist: MC dễ dàng đỡ được',
      'Payoff: MC một hit KO, câu nói cuối đầy ngạo nghễ',
    ],
  },
  {
    id: 'inner_monologue_1',
    sceneType: 'tension',
    description: 'Inner monologue trong tình huống nguy hiểm',
    content: `"Chết rồi!"

Lâm Phong thầm kinh hãi. Đối phương là Nguyên Anh cường giả, chỉ một ngón tay là có thể nghiền nát hắn.

Chạy? Không kịp rồi.
Đánh? Chênh lệch quá lớn.
Cầu xin? Hừ, Lâm Phong này đến chết cũng không cầu xin!

Nghĩ nhanh! Phải có cách!

Ánh mắt hắn liếc qua địa hình xung quanh. Bên trái là vách đá. Bên phải là rừng sâu. Phía sau là vực thẳm.

Vực thẳm...

Một tia sáng lóe lên trong đầu Lâm Phong.

Hắn nhớ ra. Trong Ngọc Giản mà cha để lại, có ghi chép về một pháp quyết. Bất Tử Kim Thân! Chỉ cần rơi xuống không chết, hắn có thể trốn thoát!

Rủi ro cực lớn. Nhưng đây là cơ hội duy nhất.

Lâm Phong hít một hơi thật sâu, rồi... nhảy xuống vực!

"Muốn chết!"

Nguyên Anh cường giả chỉ kịp thấy bóng dáng Lâm Phong biến mất trong màn sương.`,
    notes: [
      'Suy nghĩ nhanh, liệt kê các options',
      'Tìm ra giải pháp bất ngờ',
      'Connect với setup trước (Ngọc Giản của cha)',
      'Kết thúc bằng hành động táo bạo',
    ],
  },
];

// Cliffhanger techniques
export const CLIFFHANGER_TECHNIQUES = [
  {
    name: 'Nguy hiểm cận kề',
    description: 'Kết thúc ngay trước moment nguy hiểm',
    example: 'Thanh kiếm hướng thẳng về phía cổ họng hắn—',
  },
  {
    name: 'Tiết lộ gây sốc',
    description: 'Reveal information quan trọng ở câu cuối',
    example: '"Kẻ đã giết cha ngươi... chính là ta!"',
  },
  {
    name: 'Xuất hiện bất ngờ',
    description: 'Nhân vật mới/quan trọng xuất hiện',
    example: 'Một bóng người từ từ bước ra từ trong bóng tối. Gương mặt đó... không thể nào!',
  },
  {
    name: 'Quyết định khó khăn',
    description: 'MC phải đưa ra lựa chọn quan trọng',
    example: 'Cứu nàng, hay cứu sư phụ? Hắn chỉ có thể chọn một.',
  },
  {
    name: 'Đột phá/Biến cố',
    description: 'Sự thay đổi lớn xảy ra',
    example: 'Thiên địa rung chuyển. Cảnh giới của hắn... đang đột phá!',
  },
  {
    name: 'Lời thề/Tuyên bố',
    description: 'MC đưa ra tuyên bố mạnh mẽ',
    example: '"Từ hôm nay, ai dám động vào gia tộc ta, ta sẽ tru diệt cửu tộc!"',
  },
];

// Get style bible for genre
export function getEnhancedStyleBible(genre: GenreType): {
  vocabulary: VocabularyGuide;
  pacingRules: Record<SceneType, PacingRule>;
  exemplars: StyleExemplar[];
  cliffhangerTechniques: typeof CLIFFHANGER_TECHNIQUES;
} {
  // Base Qidian style applies to all genres
  return {
    vocabulary: QIDIAN_VOCABULARY,
    pacingRules: PACING_RULES,
    exemplars: QIDIAN_EXEMPLARS,
    cliffhangerTechniques: CLIFFHANGER_TECHNIQUES,
  };
}

// Build style context for prompts
export function buildStyleContext(genre: GenreType, sceneType: SceneType): string {
  const style = getEnhancedStyleBible(genre);
  const pacing = style.pacingRules[sceneType];
  const relevantExemplars = style.exemplars.filter(e => e.sceneType === sceneType);

  const lines = [
    '## Style Guidelines:',
    '',
    '### Pacing for this scene:',
    `- Sentence length: ${pacing.sentenceLength.min}-${pacing.sentenceLength.max} words`,
    `- Paragraph length: ${pacing.paragraphLength.min}-${pacing.paragraphLength.max} chars`,
    `- Dialogue ratio: ${Math.round(pacing.dialogueRatio.min * 100)}-${Math.round(pacing.dialogueRatio.max * 100)}%`,
    `- Pace: ${pacing.paceSpeed}`,
    '',
    '### Vocabulary examples:',
  ];

  // Add relevant vocabulary
  if (sceneType === 'action') {
    lines.push('Power expressions:');
    lines.push(...style.vocabulary.powerExpressions.techniques.slice(0, 5).map(e => `- "${e}"`));
  } else if (sceneType === 'dialogue') {
    lines.push('Emotional expressions:');
    lines.push(...style.vocabulary.emotions.contempt.slice(0, 3).map(e => `- "${e}"`));
    lines.push(...style.vocabulary.emotions.anger.slice(0, 3).map(e => `- "${e}"`));
  }

  // Add exemplar
  if (relevantExemplars.length > 0) {
    const exemplar = relevantExemplars[0];
    lines.push('');
    lines.push('### Example (follow this style):');
    lines.push('```');
    lines.push(exemplar.content);
    lines.push('```');
    lines.push('');
    lines.push('Notes:');
    lines.push(...exemplar.notes.map(n => `- ${n}`));
  }

  // Add cliffhanger tip if near end
  lines.push('');
  lines.push('### Cliffhanger techniques:');
  lines.push(...CLIFFHANGER_TECHNIQUES.slice(0, 3).map(c => `- ${c.name}: ${c.example}`));

  return lines.join('\n');
}
