/**
 * Dialogue Analyzer - Detect cliche patterns, voice uniqueness, quality
 *
 * Solves:
 * 1. Dialogue patterns giống nhau ("You dare?!", "Courting death!")
 * 2. Characters all sound the same
 * 3. Exposition dumps trong dialogue
 * 4. "As you know" dialogue
 * 5. Overuse of exclamations
 */

// ============================================================================
// CLICHE PATTERNS - Vietnamese & English cultivation/wuxia cliches
// ============================================================================

export const CLICHE_PHRASES = {
  // Extreme cliches (should be avoided or heavily limited)
  extreme: [
    // Vietnamese
    'ngươi dám', 'mi dám', 'tìm chết', 'muốn chết', 'cút ngay', 
    'quỳ xuống', 'hãy quỳ', 'không biết trời cao đất dày',
    'ta sẽ giết ngươi', 'ta thề sẽ giết', 'ngươi chờ đó',
    'ta sẽ xé xác ngươi', 'đợi đấy',
    // English equivalents (if mixed content)
    'you dare', 'courting death', 'kneel before me', 'you\'re seeking death',
    'junior dares', 'scram', 'know your place',
  ],
  
  // Overused phrases (limit to 1-2 per chapter)
  overused: [
    // Vietnamese
    'không ngờ', 'quả nhiên', 'thật sự', 'chấn động', 'kinh hãi',
    'sửng sốt', 'há hốc mồm', 'trợn mắt', 'không thể tin',
    'ngươi không có tư cách', 'không xứng', 'đồ phế vật',
    'tiểu tử', 'tiểu nha đầu', 'lão già', 'tên này',
    'hừ', 'hừ lạnh', 'cười lạnh', 'cười nhạo', 'khinh bỉ',
    // Power descriptions
    'hủy thiên diệt địa', 'che trời lấp đất', 'vô song', 'bất bại',
    'thiên tài', 'yêu nghiệt', 'quỷ tài',
  ],
  
  // Common but acceptable (track frequency)
  common: [
    'không được', 'dừng lại', 'cẩn thận', 'coi chừng',
    'đi thôi', 'theo ta', 'chờ đã', 'khoan đã',
    'tốt lắm', 'được rồi', 'hay lắm', 'giỏi lắm',
  ],
};

// Young Master archetype detection
export const YOUNG_MASTER_PATTERNS = {
  dialogue: [
    'ngươi biết ta là ai không',
    'cha ta là',
    'tông môn của ta',
    'dám động vào ta',
    'ta sẽ bảo',
    'có tiền mà không',
    'đồ hèn hạ',
    'đồ thấp kém',
  ],
  actions: [
    'nhìn khinh bỉ',
    'vênh mặt',
    'ngạo mạn',
    'huênh hoang',
    'khoe khoang',
    'dọa nạt',
  ],
};

// Exposition dump patterns ("As you know" dialogue)
export const EXPOSITION_PATTERNS = [
  'như ngươi biết',
  'như mọi người đều biết',
  'ai cũng biết',
  'theo truyền thuyết',
  'người ta nói rằng',
  'có câu chuyện kể rằng',
  'để ta giải thích',
  'ta sẽ kể cho ngươi nghe',
  'nghe này', // when followed by long explanation
];

// ============================================================================
// TYPES
// ============================================================================

export interface DialogueAnalysisResult {
  totalDialogues: number;
  clicheUsage: {
    extreme: Array<{ phrase: string; count: number; locations: number[] }>;
    overused: Array<{ phrase: string; count: number }>;
    totalClicheScore: number; // 0-100, lower is better
  };
  expositionScore: number; // 0-100, higher = more exposition dumps
  exclamationRatio: number; // % of dialogues ending with !
  questionRatio: number;
  voiceAnalysis: {
    avgSentenceLength: number;
    vocabularyDiversity: number;
    formalityScore: number;
  };
  youngMasterCount: number;
  issues: DialogueIssue[];
  suggestions: string[];
}

export interface DialogueIssue {
  type: 'cliche' | 'exposition' | 'exclamation' | 'voice' | 'young_master';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  location?: number; // Character position in content
  suggestion: string;
}

export interface CharacterVoiceProfile {
  characterName: string;
  speechPatterns: string[];
  favoriteWords: string[];
  sentenceLengthRange: [number, number];
  formalityLevel: 'casual' | 'neutral' | 'formal' | 'archaic';
  emotionalTendency: 'stoic' | 'expressive' | 'volatile';
  uniqueQuirks: string[];
}

// ============================================================================
// DIALOGUE ANALYZER CLASS
// ============================================================================

export class DialogueAnalyzer {
  private characterProfiles: Map<string, CharacterVoiceProfile> = new Map();
  
  /**
   * Full dialogue analysis
   */
  analyzeDialogues(content: string): DialogueAnalysisResult {
    const dialogues = this.extractDialogues(content);
    const issues: DialogueIssue[] = [];
    const suggestions: string[] = [];
    
    // Analyze cliches
    const clicheAnalysis = this.analyzeCliches(content, dialogues);
    issues.push(...clicheAnalysis.issues);
    
    // Analyze exposition
    const expositionScore = this.analyzeExposition(dialogues);
    if (expositionScore > 30) {
      issues.push({
        type: 'exposition',
        severity: expositionScore > 50 ? 'major' : 'moderate',
        description: `Exposition dump detected (${expositionScore}% dialogue là giải thích)`,
        suggestion: 'Show thông tin qua hành động thay vì kể trong dialogue',
      });
      suggestions.push('Giảm "info dump" trong dialogue, dùng action để reveal thông tin');
    }
    
    // Analyze exclamations
    const exclamationRatio = this.analyzeExclamations(dialogues);
    if (exclamationRatio > 40) {
      issues.push({
        type: 'exclamation',
        severity: exclamationRatio > 60 ? 'major' : 'moderate',
        description: `Quá nhiều dấu chấm than (${exclamationRatio}% dialogues)`,
        suggestion: 'Dùng description thay vì ! để thể hiện emotion',
      });
      suggestions.push('Giảm sử dụng dấu chấm than, thay bằng miêu tả cảm xúc');
    }
    
    // Analyze voice
    const voiceAnalysis = this.analyzeVoice(dialogues);
    
    // Detect young master patterns
    const youngMasterCount = this.detectYoungMasterPatterns(content);
    if (youngMasterCount > 2) {
      issues.push({
        type: 'young_master',
        severity: youngMasterCount > 4 ? 'major' : 'moderate',
        description: `Phát hiện ${youngMasterCount} young master archetype patterns`,
        suggestion: 'Đa dạng hóa antagonist, thêm motivation và depth',
      });
      suggestions.push('Tạo villain với motivation riêng, không chỉ "arrogant young master"');
    }
    
    return {
      totalDialogues: dialogues.length,
      clicheUsage: {
        extreme: clicheAnalysis.extreme,
        overused: clicheAnalysis.overused,
        totalClicheScore: clicheAnalysis.score,
      },
      expositionScore,
      exclamationRatio,
      questionRatio: this.calculateQuestionRatio(dialogues),
      voiceAnalysis,
      youngMasterCount,
      issues,
      suggestions,
    };
  }
  
  /**
   * Extract all dialogues from content
   */
  extractDialogues(content: string): string[] {
    const patterns = [
      /"([^"]+)"/g,           // "dialogue"
      /「([^」]+)」/g,         // 「dialogue」
      /『([^』]+)』/g,         // 『dialogue』
      /"([^"]+)"/g,           // "dialogue" (curly quotes)
      /[-–—]\s*([^\n]+)/gm,   // — dialogue (dash style)
    ];
    
    const dialogues: string[] = [];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1] && match[1].trim().length > 5) {
          dialogues.push(match[1].trim());
        }
      }
    }
    
    return dialogues;
  }
  
  /**
   * Analyze cliche usage
   */
  private analyzeCliches(content: string, dialogues: string[]): {
    extreme: Array<{ phrase: string; count: number; locations: number[] }>;
    overused: Array<{ phrase: string; count: number }>;
    issues: DialogueIssue[];
    score: number;
  } {
    const lowerContent = content.toLowerCase();
    const issues: DialogueIssue[] = [];
    let score = 0;
    
    // Check extreme cliches
    const extreme: Array<{ phrase: string; count: number; locations: number[] }> = [];
    for (const phrase of CLICHE_PHRASES.extreme) {
      const regex = new RegExp(phrase, 'gi');
      const matches = [...lowerContent.matchAll(regex)];
      if (matches.length > 0) {
        const locations = matches.map(m => m.index || 0);
        extreme.push({ phrase, count: matches.length, locations });
        score += matches.length * 15; // Heavy penalty
        
        if (matches.length >= 2) {
          issues.push({
            type: 'cliche',
            severity: 'major',
            description: `Cliche nghiêm trọng "${phrase}" xuất hiện ${matches.length} lần`,
            suggestion: `Thay thế "${phrase}" bằng reaction/dialogue cụ thể hơn`,
          });
        }
      }
    }
    
    // Check overused phrases
    const overused: Array<{ phrase: string; count: number }> = [];
    for (const phrase of CLICHE_PHRASES.overused) {
      const regex = new RegExp(phrase, 'gi');
      const matches = lowerContent.match(regex);
      if (matches && matches.length > 2) {
        overused.push({ phrase, count: matches.length });
        score += (matches.length - 2) * 5;
        
        if (matches.length > 4) {
          issues.push({
            type: 'cliche',
            severity: 'moderate',
            description: `"${phrase}" lặp lại ${matches.length} lần`,
            suggestion: `Dùng từ đồng nghĩa hoặc miêu tả cụ thể hơn`,
          });
        }
      }
    }
    
    return {
      extreme,
      overused,
      issues,
      score: Math.min(100, score),
    };
  }
  
  /**
   * Analyze exposition dumps
   */
  private analyzeExposition(dialogues: string[]): number {
    if (dialogues.length === 0) return 0;
    
    let expositionCount = 0;
    
    for (const dialogue of dialogues) {
      const lower = dialogue.toLowerCase();
      
      // Check for exposition patterns
      for (const pattern of EXPOSITION_PATTERNS) {
        if (lower.includes(pattern)) {
          expositionCount++;
          break;
        }
      }
      
      // Long dialogue (>150 chars) without question = likely exposition
      if (dialogue.length > 150 && !dialogue.includes('?')) {
        expositionCount += 0.5;
      }
    }
    
    return Math.round((expositionCount / dialogues.length) * 100);
  }
  
  /**
   * Analyze exclamation usage
   */
  private analyzeExclamations(dialogues: string[]): number {
    if (dialogues.length === 0) return 0;
    
    const exclamationCount = dialogues.filter(d => 
      d.endsWith('!') || d.includes('!!') || d.includes('！')
    ).length;
    
    return Math.round((exclamationCount / dialogues.length) * 100);
  }
  
  /**
   * Calculate question ratio
   */
  private calculateQuestionRatio(dialogues: string[]): number {
    if (dialogues.length === 0) return 0;
    
    const questionCount = dialogues.filter(d =>
      d.includes('?') || d.includes('？')
    ).length;
    
    return Math.round((questionCount / dialogues.length) * 100);
  }
  
  /**
   * Analyze voice characteristics
   */
  private analyzeVoice(dialogues: string[]): {
    avgSentenceLength: number;
    vocabularyDiversity: number;
    formalityScore: number;
  } {
    if (dialogues.length === 0) {
      return { avgSentenceLength: 0, vocabularyDiversity: 0, formalityScore: 50 };
    }
    
    // Average sentence length
    const allText = dialogues.join(' ');
    const words = allText.split(/\s+/).filter(w => w.length > 0);
    const sentences = allText.split(/[.!?。！？]+/).filter(s => s.trim());
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    
    // Vocabulary diversity (unique words / total words)
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const vocabularyDiversity = words.length > 0 
      ? Math.round((uniqueWords.size / words.length) * 100) 
      : 0;
    
    // Formality score
    const formalWords = ['ngài', 'các hạ', 'tiền bối', 'lão', 'đại nhân', 'điện hạ'];
    const casualWords = ['tao', 'mày', 'ông', 'bà', 'thằng', 'con'];
    
    let formalCount = 0;
    let casualCount = 0;
    
    const lowerText = allText.toLowerCase();
    for (const word of formalWords) {
      if (lowerText.includes(word)) formalCount++;
    }
    for (const word of casualWords) {
      if (lowerText.includes(word)) casualCount++;
    }
    
    const formalityScore = 50 + (formalCount - casualCount) * 10;
    
    return {
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      vocabularyDiversity,
      formalityScore: Math.max(0, Math.min(100, formalityScore)),
    };
  }
  
  /**
   * Detect young master archetype patterns
   */
  private detectYoungMasterPatterns(content: string): number {
    const lower = content.toLowerCase();
    let count = 0;
    
    // Check dialogue patterns
    for (const pattern of YOUNG_MASTER_PATTERNS.dialogue) {
      if (lower.includes(pattern)) count++;
    }
    
    // Check action patterns
    for (const pattern of YOUNG_MASTER_PATTERNS.actions) {
      const matches = lower.match(new RegExp(pattern, 'gi'));
      if (matches && matches.length > 1) count++;
    }
    
    return count;
  }
  
  /**
   * Register a character voice profile
   */
  registerCharacterVoice(profile: CharacterVoiceProfile): void {
    this.characterProfiles.set(profile.characterName.toLowerCase(), profile);
  }
  
  /**
   * Check if dialogue matches character's established voice
   */
  checkVoiceConsistency(characterName: string, dialogue: string): {
    consistent: boolean;
    issues: string[];
  } {
    const profile = this.characterProfiles.get(characterName.toLowerCase());
    if (!profile) {
      return { consistent: true, issues: [] };
    }
    
    const issues: string[] = [];
    
    // Check sentence length
    const sentences = dialogue.split(/[.!?。！？]+/).filter(s => s.trim());
    const avgLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / (sentences.length || 1);
    
    if (avgLength < profile.sentenceLengthRange[0]) {
      issues.push(`${characterName} thường nói dài hơn (avg: ${avgLength} words)`);
    }
    if (avgLength > profile.sentenceLengthRange[1]) {
      issues.push(`${characterName} thường nói ngắn gọn hơn (avg: ${avgLength} words)`);
    }
    
    // Check formality
    const lower = dialogue.toLowerCase();
    const hasFormal = ['ngài', 'các hạ', 'tiền bối'].some(w => lower.includes(w));
    const hasCasual = ['tao', 'mày', 'ông'].some(w => lower.includes(w));
    
    if (profile.formalityLevel === 'formal' && hasCasual) {
      issues.push(`${characterName} không nên dùng ngôn ngữ casual`);
    }
    if (profile.formalityLevel === 'casual' && hasFormal) {
      issues.push(`${characterName} không nên dùng ngôn ngữ quá formal`);
    }
    
    // Check unique quirks
    const hasQuirk = profile.uniqueQuirks.some(q => lower.includes(q.toLowerCase()));
    if (profile.uniqueQuirks.length > 0 && !hasQuirk && dialogue.length > 50) {
      issues.push(`Thiếu nét đặc trưng của ${characterName}`);
    }
    
    return {
      consistent: issues.length === 0,
      issues,
    };
  }
  
  /**
   * Build context for writing prompts
   */
  buildDialogueGuidelines(recentAnalysis?: DialogueAnalysisResult): string {
    const lines = ['## Dialogue Guidelines:\n'];
    
    // Cliches to avoid
    lines.push('### TRÁNH các cliche:');
    lines.push('- ' + CLICHE_PHRASES.extreme.slice(0, 5).join(', '));
    
    // Exclamation warning
    lines.push('\n### Hạn chế:');
    lines.push('- Dấu chấm than (!): Chỉ dùng khi thực sự cần thiết');
    lines.push('- Exposition trong dialogue: Show, don\'t tell');
    
    // Recent issues
    if (recentAnalysis && recentAnalysis.issues.length > 0) {
      lines.push('\n### Vấn đề cần khắc phục:');
      for (const issue of recentAnalysis.issues.slice(0, 3)) {
        lines.push(`- ${issue.description}`);
      }
    }
    
    // Character voices
    if (this.characterProfiles.size > 0) {
      lines.push('\n### Character Voice Profiles:');
      for (const [name, profile] of this.characterProfiles) {
        lines.push(`- ${name}: ${profile.formalityLevel}, quirks: ${profile.uniqueQuirks.join(', ') || 'none'}`);
      }
    }
    
    return lines.join('\n');
  }
}

// ============================================================================
// ENHANCED: Voice Similarity Detection
// ============================================================================

/**
 * Compare voice patterns between two characters
 */
export function compareCharacterVoices(
  profile1: CharacterVoiceProfile,
  profile2: CharacterVoiceProfile
): { similarity: number; issues: string[] } {
  let similarityScore = 0;
  const issues: string[] = [];

  // Check formality similarity
  if (profile1.formalityLevel === profile2.formalityLevel) {
    similarityScore += 25;
    issues.push(`Both ${profile1.characterName} and ${profile2.characterName} have same formality level`);
  }

  // Check sentence length overlap
  const overlap = Math.min(profile1.sentenceLengthRange[1], profile2.sentenceLengthRange[1]) -
                  Math.max(profile1.sentenceLengthRange[0], profile2.sentenceLengthRange[0]);
  if (overlap > 5) {
    similarityScore += 20;
  }

  // Check emotional tendency
  if (profile1.emotionalTendency === profile2.emotionalTendency) {
    similarityScore += 25;
  }

  // Check unique quirks overlap
  const sharedQuirks = profile1.uniqueQuirks.filter(q => 
    profile2.uniqueQuirks.some(q2 => q.toLowerCase() === q2.toLowerCase())
  );
  if (sharedQuirks.length > 0) {
    similarityScore += 30;
    issues.push(`Shared quirks: ${sharedQuirks.join(', ')}`);
  }

  // No unique quirks at all
  if (profile1.uniqueQuirks.length === 0 && profile2.uniqueQuirks.length === 0) {
    similarityScore += 20;
    issues.push('Both characters lack unique speech quirks');
  }

  return {
    similarity: Math.min(100, similarityScore),
    issues,
  };
}

// ============================================================================
// ENHANCED: Dialogue Attribution (who said what)
// ============================================================================

export interface AttributedDialogue {
  speaker: string | null;
  dialogue: string;
  context: string;
  position: number;
}

/**
 * Attempt to attribute dialogues to speakers based on context
 */
export function attributeDialogues(content: string, knownCharacters: string[]): AttributedDialogue[] {
  const results: AttributedDialogue[] = [];
  
  // Patterns for dialogue with speaker attribution
  const attributionPatterns = [
    // "dialogue" speaker said
    /"([^"]+)"\s*[-,]?\s*(\w+)\s*(nói|hỏi|trả lời|cười|đáp|gầm|quát|thét)/gi,
    // speaker said "dialogue"
    /(\w+)\s*(nói|hỏi|trả lời|cười|đáp|gầm|quát|thét)[^"]*"([^"]+)"/gi,
    // 「dialogue」speaker
    /「([^」]+)」\s*[-,]?\s*(\w+)/gi,
  ];

  // Extract dialogues with patterns
  const dialogueMatches = [
    ...content.matchAll(/"([^"]+)"/g),
    ...content.matchAll(/「([^」]+)」/g),
  ];

  for (const match of dialogueMatches) {
    const dialogue = match[1];
    const position = match.index || 0;
    const contextStart = Math.max(0, position - 50);
    const contextEnd = Math.min(content.length, position + dialogue.length + 50);
    const context = content.substring(contextStart, contextEnd);

    // Try to find speaker in context
    let speaker: string | null = null;
    for (const char of knownCharacters) {
      if (context.toLowerCase().includes(char.toLowerCase())) {
        speaker = char;
        break;
      }
    }

    results.push({
      speaker,
      dialogue,
      context,
      position,
    });
  }

  return results;
}

// ============================================================================
// ENHANCED: Subtext Detection
// ============================================================================

export interface SubtextAnalysis {
  hasSubtext: boolean;
  subtextIndicators: string[];
  score: number; // 0-10, higher = more subtext
}

const SUBTEXT_INDICATORS = [
  // Implicit meaning patterns
  { pattern: /nói\s*(một\s*)?nửa/gi, weight: 2, description: 'Nói nửa chừng' },
  { pattern: /ngụ\s*ý/gi, weight: 3, description: 'Ngụ ý' },
  { pattern: /ẩn\s*ý/gi, weight: 3, description: 'Ẩn ý' },
  { pattern: /không\s*nói\s*thẳng/gi, weight: 2, description: 'Không nói thẳng' },
  { pattern: /\.\.\.+/g, weight: 1, description: 'Trailing off (...)' },
  { pattern: /im\s*lặng/gi, weight: 2, description: 'Sự im lặng' },
  { pattern: /liếc\s*mắt|nhìn\s*ý\s*nhị/gi, weight: 2, description: 'Eye contact' },
  { pattern: /thay\s*đổi\s*chủ\s*đề/gi, weight: 2, description: 'Đổi chủ đề' },
];

/**
 * Analyze subtext in dialogue
 */
export function analyzeSubtext(content: string): SubtextAnalysis {
  const indicators: string[] = [];
  let totalWeight = 0;

  for (const { pattern, weight, description } of SUBTEXT_INDICATORS) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      indicators.push(`${description} (${matches.length}x)`);
      totalWeight += weight * matches.length;
    }
  }

  // Calculate score (max 10)
  const score = Math.min(10, totalWeight);

  return {
    hasSubtext: score >= 3,
    subtextIndicators: indicators,
    score,
  };
}

// ============================================================================
// ENHANCED: Quick Quality Score
// ============================================================================

/**
 * Get a quick dialogue quality score (0-100)
 */
export function getQuickDialogueScore(content: string): {
  score: number;
  breakdown: {
    clichePenalty: number;
    exclamationPenalty: number;
    expositionPenalty: number;
    diversityBonus: number;
    subtextBonus: number;
  };
} {
  const analyzer = new DialogueAnalyzer();
  const analysis = analyzer.analyzeDialogues(content);
  const subtext = analyzeSubtext(content);

  // Start with 100
  let score = 100;

  // Cliche penalty (up to -30)
  const clichePenalty = Math.min(30, analysis.clicheUsage.totalClicheScore * 0.3);
  score -= clichePenalty;

  // Exclamation penalty (up to -15)
  const exclamationPenalty = analysis.exclamationRatio > 30 
    ? Math.min(15, (analysis.exclamationRatio - 30) * 0.5)
    : 0;
  score -= exclamationPenalty;

  // Exposition penalty (up to -20)
  const expositionPenalty = analysis.expositionScore > 20
    ? Math.min(20, (analysis.expositionScore - 20) * 0.5)
    : 0;
  score -= expositionPenalty;

  // Diversity bonus (up to +10)
  const diversityBonus = Math.min(10, analysis.voiceAnalysis.vocabularyDiversity * 0.2);
  score += diversityBonus;

  // Subtext bonus (up to +5)
  const subtextBonus = subtext.score * 0.5;
  score += subtextBonus;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    breakdown: {
      clichePenalty: Math.round(clichePenalty),
      exclamationPenalty: Math.round(exclamationPenalty),
      expositionPenalty: Math.round(expositionPenalty),
      diversityBonus: Math.round(diversityBonus),
      subtextBonus: Math.round(subtextBonus),
    },
  };
}

// ============================================================================
// DATABASE PERSISTENCE
// ============================================================================

/**
 * Save character voice profile to database
 */
export async function saveCharacterVoice(
  projectId: string,
  profile: CharacterVoiceProfile
): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from('character_voices')
    .upsert({
      project_id: projectId,
      character_name: profile.characterName,
      speech_patterns: profile.speechPatterns,
      favorite_words: profile.favoriteWords,
      sentence_length_range: profile.sentenceLengthRange,
      formality_level: profile.formalityLevel,
      emotional_tendency: profile.emotionalTendency,
      unique_quirks: profile.uniqueQuirks,
    }, {
      onConflict: 'project_id,character_name',
    });
}

/**
 * Load character voice profiles for a project
 */
export async function loadCharacterVoices(projectId: string): Promise<CharacterVoiceProfile[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('character_voices')
    .select('*')
    .eq('project_id', projectId);

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => ({
    characterName: row.character_name as string,
    speechPatterns: (row.speech_patterns as string[]) || [],
    favoriteWords: (row.favorite_words as string[]) || [],
    sentenceLengthRange: (row.sentence_length_range as [number, number]) || [5, 15],
    formalityLevel: (row.formality_level as CharacterVoiceProfile['formalityLevel']) || 'neutral',
    emotionalTendency: (row.emotional_tendency as CharacterVoiceProfile['emotionalTendency']) || 'stoic',
    uniqueQuirks: (row.unique_quirks as string[]) || [],
  }));
}

// Lazy Supabase initialization
import { createClient, SupabaseClient } from '@supabase/supabase-js';
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// Export singleton
export const dialogueAnalyzer = new DialogueAnalyzer();

// Export factory function
export function createDialogueAnalyzer(): DialogueAnalyzer {
  return new DialogueAnalyzer();
}
