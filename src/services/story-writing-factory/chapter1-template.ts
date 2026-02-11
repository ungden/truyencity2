/**
 * Story Writing Quality Guidelines - Flexible by Genre
 * 
 * Key Principles (NOT rigid rules):
 * 1. Writing QUALITY matters more than structure
 * 2. Show, don't tell - use 5 senses, not summaries
 * 3. Villains should be cold/calculated, not cliché
 * 4. Emotional depth over speed
 * 5. Genre-appropriate pacing
 */

import { GenreType } from './types';

// Quality Metrics - Universal across all genres
export interface QualityMetrics {
  showDontTell: number;      // 0-100
  sensoryDetail: number;     // 0-100
  emotionalDepth: number;    // 0-100
  villainQuality: number;    // 0-100
  pacing: number;            // 0-100
  dialogue: number;          // 0-100
}

// Genre-specific pacing recommendations (NOT rules)
export const GENRE_PACING_GUIDELINES: Record<GenreType, {
  description: string;
  wordCountRange: { min: number; max: number };
  recommendedStructure: string[];
  canRevengeInChapter1: boolean;
  notes: string;
}> = {
  'tien-hiep': {
    description: 'Tiên Hiệp - Build up before payoff',
    wordCountRange: { min: 2000, max: 5000 },
    recommendedStructure: [
      'Opening: MC weak state',
      'Conflict: Humiliation/build-up',
      'Transformation: Power awakening',
      'Climax: Can be revenge or cliffhanger'
    ],
    canRevengeInChapter1: false, // Usually needs build-up
    notes: 'Readers expect slow build before face-slap. But can do quick revenge if done well with detail.',
  },
  'huyen-huyen': {
    description: 'Huyền Huyễn - Epic scale',
    wordCountRange: { min: 2000, max: 5000 },
    recommendedStructure: [
      'Opening: World introduction',
      'Conflict: MC underestimated',
      'Action: Can have early fight',
      'Ending: Power reveal or cliffhanger'
    ],
    canRevengeInChapter1: true, // More flexible
    notes: 'Can have early action if fight is detailed and emotional.',
  },
  'do-thi': {
    description: 'Đô Thị - Face-slapping heavy',
    wordCountRange: { min: 1500, max: 4000 },
    recommendedStructure: [
      'Opening: MC underestimated',
      'Conflict: Immediate confrontation',
      'Action: CAN revenge immediately',
      'Ending: Aftermath or bigger threat'
    ],
    canRevengeInChapter1: true, // Very common
    notes: 'Urban novels often have quick revenge cycle. Quality comes from detailed execution.',
  },
  'kiem-hiep': {
    description: 'Kiếm Hiệp - Honor and revenge',
    wordCountRange: { min: 2000, max: 4500 },
    recommendedStructure: [
      'Opening: Jianghu atmosphere',
      'Conflict: Insult to honor',
      'Action: Can fight immediately',
      'Ending: Resolution or new enemy'
    ],
    canRevengeInChapter1: true,
    notes: 'Honor-based conflicts can resolve quickly but need detailed swordplay.',
  },
  'mat-the': {
    description: 'Tận Thế - Survival first',
    wordCountRange: { min: 1500, max: 3500 },
    recommendedStructure: [
      'Opening: Apocalypse hits',
      'Conflict: Immediate danger',
      'Action: Kill threats immediately',
      'Ending: Survival or new threat'
    ],
    canRevengeInChapter1: true, // Very common
    notes: 'Survival genre: enemies die fast, but QUALITY comes from detailed kills and desperation.',
  },
  'khoa-huyen': {
    description: 'Khoa Huyễn - Sci-fi logic',
    wordCountRange: { min: 2000, max: 4500 },
    recommendedStructure: [
      'Opening: Tech world building',
      'Conflict: System/threat appears',
      'Action: Problem-solving or combat',
      'Ending: Tech reveal or cliffhanger'
    ],
    canRevengeInChapter1: true,
    notes: 'Can have quick action but must explain tech/mechanics.',
  },
  'lich-su': {
    description: 'Lịch Sử - Political intrigue',
    wordCountRange: { min: 2500, max: 5000 },
    recommendedStructure: [
      'Opening: Court/political scene',
      'Conflict: Scheme revealed',
      'Action: Usually slower, strategic',
      'Ending: Scheme success or twist'
    ],
    canRevengeInChapter1: false, // Usually slower
    notes: 'Political novels need setup. Revenge is slow burn.',
  },
  'dong-nhan': {
    description: 'Đồng Nhân - Fanfiction',
    wordCountRange: { min: 2000, max: 4500 },
    recommendedStructure: [
      'Opening: Canon divergence point',
      'Conflict: Canon event disrupted',
      'Action: Can change canon quickly',
      'Ending: Butterfly effect begins'
    ],
    canRevengeInChapter1: true,
    notes: 'Fanfic can move fast because readers know canon.',
  },
  'vong-du': {
    description: 'Võng Du - Game world',
    wordCountRange: { min: 1500, max: 3500 },
    recommendedStructure: [
      'Opening: Game login/tutorial',
      'Conflict: Tutorial threat or PK',
      'Action: CAN kill immediately',
      'Ending: Level up or boss loot'
    ],
    canRevengeInChapter1: true, // Very common
    notes: 'Game novels often have immediate action. Focus on detailed combat mechanics.',
  },
  'ngon-tinh': {
    description: 'Ngôn Tình - Romance',
    wordCountRange: { min: 2000, max: 4000 },
    recommendedStructure: [
      'Opening: Meet cute or conflict',
      'Conflict: Misunderstanding',
      'Action: Emotional, not physical',
      'Ending: Tension builds'
    ],
    canRevengeInChapter1: false,
    notes: 'Romance focuses on emotional tension, not revenge.',
  },
  'linh-di': {
    description: 'Linh Dị - Horror/Mystery',
    wordCountRange: { min: 2000, max: 4500 },
    recommendedStructure: [
      'Opening: Atmosphere building',
      'Conflict: Ghost/mystery appears',
      'Action: Investigation or escape',
      'Ending: Cliffhanger reveal'
    ],
    canRevengeInChapter1: false,
    notes: 'Horror needs atmosphere. Immediate resolution kills tension.',
  },
  'quan-truong': {
    description: 'Quan Trường - Politics',
    wordCountRange: { min: 2500, max: 5000 },
    recommendedStructure: [
      'Opening: Political landscape',
      'Conflict: Power struggle begins',
      'Action: Scheming, not fighting',
      'Ending: Advantage gained/lost'
    ],
    canRevengeInChapter1: false,
    notes: 'Political novels are chess games, not brawls.',
  },
  'di-gioi': {
    description: 'Dị Giới - Isekai',
    wordCountRange: { min: 2000, max: 4500 },
    recommendedStructure: [
      'Opening: Transport to new world',
      'Conflict: Immediate danger',
      'Action: CAN fight immediately',
      'Ending: Survival or ally found'
    ],
    canRevengeInChapter1: true,
    notes: 'Isekai often drops MC in danger. Can kill immediately.',
  },
};

// Universal Writing Quality Rules
export const WRITING_QUALITY_RULES = {
  // Show, don't tell
  showDontTell: {
    description: 'Show through action, not tell through narration',
    examples: {
      bad: 'Anh ta rất đau đớn và tuyệt vọng.',
      good: 'Móng tay đâm sâu vào lòng bàn tay, máu chảy ra từ kẽ tay. Anh ta cắn chặt môi đến bật máu, nhưng không phát ra tiếng kêu nào.',
    },
    forbidden: [
      'rất đau đớn',
      'rất tuyệt vọng', 
      'rất tức giận',
      'rất sợ hãi',
      'rất buồn',
    ],
  },

  // 5 Senses
  fiveSenses: {
    description: 'Use all 5 senses, not just visual',
    senses: ['sight', 'sound', 'smell', 'taste', 'touch'],
    example: 'Mùi ẩm mốc nồng nặc (smell). Tiếng chuột chạy trong tường (sound). Ánh đèn vàng yếu ớt rung rinh (sight). Vị máu tanh nơi khóe miệng (taste). Lạnh. Rất lạnh (touch).',
  },

  // Villain Quality
  villainQuality: {
    description: 'Villains should be cold/calculated, not cliché',
    forbiddenPhrases: [
      'ngươi chỉ là con kiến',
      'tìm chết',
      'ngươi dám',
      'đồ phế vật',
      'cút đi',
      'biến',
      'muốn chết sao',
      'không biết trở trở',
      'ếch ngồi đáy giếng',
      'cũng dám mơ',
    ],
    recommended: [
      'Xử lý sạch sẽ',
      'Đừng để chết trong tông môn, phiền phức',
      'Ngươi nên cảm ơn ta. Ít nhất, ngươi còn được đứng đây',
      'Ở thành phố này, công lý chỉ là một công cụ',
      'Cường giả vi tôn. Đây là quy luật',
    ],
    techniques: [
      'Ra lệnh cho thuộc hạ, không tự tay làm',
      'Không nhìn MC, nhìn qua vai hoặc xem điện thoại',
      'Nói ít, hành động nhiều',
      'Dùng logic thay vì chửi rủa',
    ],
  },

  // Anti-Speed (Câu chương)
  antiSpeed: {
    description: 'Expand scenes, don\'t summarize',
    forbidden: [
      'sau đó',
      'tiếp theo', 
      'rồi thì',
      'không lâu sau',
      'một lúc sau',
    ],
    techniques: [
      'Phân rã hành động: Nắm tay → Cơ bắp căng → Vai xoay → Bắn ra',
      'Nội tâm nhiều lớp: Surface → Deeper → Deepest fear',
      'Phản ứng đám đông: Kẻ cưở nhạo, ngườ xót xa, kẻ quay đi',
      'Xen kẽ flashback: Khi đau đớn, nhớ về quá khứ tốt đẹp',
      'Môi trường phản chiếu: Mưa bão = Tuyệt vọng',
    ],
  },

  // System/Game Writing
  systemWriting: {
    description: 'Avoid game-like notifications unless genre appropriate',
    forbidden: [
      /\d+%.*\d+%.*100%/, // Loading bars
      /Chúc mừng.*nhận được/i, // Congratulations messages
      /Loading\.\.\./i,
    ],
    alternatives: [
      'Một luồng khí lạnh từ vực sâu tràn vào cơ thể',
      'Hàng ngàn giọng thì thầm vang lên trong đầu',
      'Cơ thể như bị xé rách rồi khâu lại bằng chỉ đen',
      'Máu trong ngườ sôi sục như muốn nổ tung',
    ],
  },
};

// Flexible Template Generator
export interface ChapterConfig {
  genre: GenreType;
  chapterNumber: number;
  protagonistName: string;
  wordCountTarget: number;
  // Optional customizations
  includeRevenge?: boolean;
  pacingStyle?: 'slow' | 'medium' | 'fast';
}

export function generateFlexibleChapterPrompt(config: ChapterConfig): string {
  const genreGuide = GENRE_PACING_GUIDELINES[config.genre];
  const wordCount = config.wordCountTarget || genreGuide.wordCountRange.min;
  const canRevenge = config.includeRevenge ?? genreGuide.canRevengeInChapter1;
  
  return `Viết chương ${config.chapterNumber} thể loại ${config.genre}

THÔNG TIN CƠ BẢN:
- Nhân vật chính: ${config.protagonistName}
- Độ dài: ${wordCount} từ
- Thể loại: ${genreGuide.description}

GỢI Ý CẤU TRÚC (${genreGuide.canRevengeInChapter1 ? 'Có thể trả thù sớm' : 'Nên build-up trước'}):
${genreGuide.recommendedStructure.map((s, i) => `${i + 1}. ${s}`).join('\n')}

LƯU Ý QUAN TRỌNG:
${genreGuide.notes}

YÊU CẦU CHẤT LƯỢNG (QUAN TRỌNG HƠN CẤU TRÚC):

1. SHOW, DON'T TELL
   ❌ Không: "Anh ta rất đau"
   ✅ Có: "Móng tay đâm vào lòng bàn tay, máu chảy ra."

2. 5 GIÁC QUAN
   Mô tả bằng: thị giác, thính giác, khứu giác, vị giác, xúc giác

3. PHẢN DIỆN CHẤT LƯỢNG
   ❌ Không nói: "Ngươi là phế vật"
   ✅ Thể hiện: Ra lệnh cho thuộc hạ, không nhìn MC, nói ít

4. CÂU CHƯƠNG (KHÔNG TÓM TẮT)
   ❌ Không: "Sau đó anh ta đánh lại"
   ✅ Có: Mô tả chi tiết từng đòn, cảm giác, phản ứng

5. CẢM XÚC SÂU
   - Nội tâm nhiều lớp
   - Xen kẽ flashback
   - Phản ứng đám đông

VIẾT CHƯƠNG:`;
}

// Quality Checker (flexible, not rigid)
export interface ChapterQualityCheck {
  score: number; // 0-100
  issues: string[];
  strengths: string[];
  suggestions: string[];
}

export function checkChapterQuality(
  content: string,
  config: ChapterConfig
): ChapterQualityCheck {
  const issues: string[] = [];
  const strengths: string[] = [];
  const suggestions: string[] = [];
  
  const wordCount = content.split(/\s+/).length;
  const genreGuide = GENRE_PACING_GUIDELINES[config.genre];
  
  // Word count check
  if (wordCount < genreGuide.wordCountRange.min) {
    issues.push(`Chương hơi ngắn: ${wordCount} từ (nên ${genreGuide.wordCountRange.min}+)`);
  } else if (wordCount > genreGuide.wordCountRange.max) {
    suggestions.push(`Chương khá dài: ${wordCount} từ (có thể cắt bớt)`);
  } else {
    strengths.push(`Độ dài phù hợp: ${wordCount} từ`);
  }
  
  // Show don't tell check
  const tellingWords = ['rất đau', 'rất buồn', 'rất tức giận', 'rất sợ'];
  const tellingCount = tellingWords.filter(w => 
    content.toLowerCase().includes(w.toLowerCase())
  ).length;
  
  if (tellingCount > 3) {
    issues.push(`Phát hiện ${tellingCount} chỗ "tell" thay vì "show". Cần mô tả chi tiết hơn.`);
  } else if (tellingCount === 0) {
    strengths.push('Tốt: Không phát hiện "telling", toàn bộ là "showing"');
  }
  
  // 5 senses check
  const sensoryWords = {
    sight: ['nhìn', 'thấy', 'sáng', 'tối', 'màu', 'ánh sáng'],
    sound: ['nghe', 'tiếng', 'âm thanh', 'vang', 'im lặng'],
    smell: ['mùi', 'thơm', 'hôi', 'nồng', 'tanh'],
    taste: ['vị', 'ngọt', 'đắng', 'máu', 'nước miếng'],
    touch: ['lạnh', 'nóng', 'mềm', 'cứng', 'mồ hôi', 'run'],
  };
  
  const sensesFound = Object.entries(sensoryWords).filter(([sense, words]) => 
    words.some(w => content.toLowerCase().includes(w.toLowerCase()))
  ).map(([sense]) => sense);
  
  if (sensesFound.length >= 3) {
    strengths.push(`Tốt: Sử dụng ${sensesFound.length} giác quan (${sensesFound.join(', ')})`);
  } else {
    suggestions.push(`Có thể thêm mô tả giác quan khác (hiện có: ${sensesFound.join(', ')})`);
  }
  
  // Villain cliché check
  const villainClichés = WRITING_QUALITY_RULES.villainQuality.forbiddenPhrases;
  const clichésFound = villainClichés.filter(phrase => 
    content.toLowerCase().includes(phrase.toLowerCase())
  );
  
  if (clichésFound.length > 0) {
    issues.push(`Phát hiện cliché villain: "${clichésFound[0]}" - nên viết lại lạnh lùng hơn`);
  }
  
  // Anti-speed check
  const speedWords = ['sau đó', 'tiếp theo', 'rồi thì', 'không lâu sau'];
  const speedCount = speedWords.filter(w => 
    content.toLowerCase().includes(w.toLowerCase())
  ).length;
  
  if (speedCount > 5) {
    suggestions.push(`Phát hiện ${speedCount} từ nối nhanh. Có thể mở rộng thêm chi tiết.`);
  }
  
  // Calculate score
  const baseScore = 70;
  const issuePenalty = issues.length * 10;
  const strengthBonus = strengths.length * 5;
  const score = Math.max(0, Math.min(100, baseScore - issuePenalty + strengthBonus));
  
  return {
    score,
    issues,
    strengths,
    suggestions,
  };
}

// Default export
export default {
  GENRE_PACING_GUIDELINES,
  WRITING_QUALITY_RULES,
  generateFlexibleChapterPrompt,
  checkChapterQuality,
};
