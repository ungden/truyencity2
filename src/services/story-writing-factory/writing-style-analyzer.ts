/**
 * Writing Style Analyzer
 *
 * Solves:
 * 1. Purple prose detection
 * 2. Show don't tell scoring
 * 3. Weak verb detection
 * 4. Adverb overload
 * 5. Passive voice abuse
 * 6. Sentence structure variety
 * 7. Exposition dump detection
 */

// ============================================================================
// PATTERNS & DICTIONARIES
// ============================================================================

// Weak verbs that should be replaced with stronger alternatives
const WEAK_VERBS = {
  vietnamese: [
    'là', 'có', 'được', 'bị', 'làm', 'đi', 'đến', 'nói', 'nhìn',
    'thấy', 'biết', 'muốn', 'cần', 'phải', 'nên', 'sẽ',
  ],
  english: [
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did',
    'go', 'went', 'come', 'came', 'get', 'got',
    'make', 'made', 'say', 'said', 'look', 'see', 'saw',
  ],
};

// Strong verbs to suggest
const STRONG_VERB_ALTERNATIVES: Record<string, string[]> = {
  'nhìn': ['ngắm', 'quan sát', 'dõi theo', 'lướt mắt', 'chằm chằm', 'liếc', 'trừng'],
  'nói': ['thốt', 'gầm', 'thì thầm', 'quát', 'gào', 'tuyên bố', 'khẳng định', 'phản bác'],
  'đi': ['bước', 'lao', 'phi', 'xông', 'sải', 'rảo', 'lững thững', 'vội vã'],
  'chạy': ['phi', 'lao', 'xông', 'vụt', 'thoắt', 'phóng'],
  'làm': ['thực hiện', 'hoàn thành', 'tiến hành', 'ra tay', 'hành động'],
};

// Common adverbs that are often overused
const OVERUSED_ADVERBS = [
  'rất', 'quá', 'cực kỳ', 'vô cùng', 'thật sự', 'thực sự',
  'nhanh chóng', 'từ từ', 'đột nhiên', 'bỗng nhiên', 'lập tức',
  'hoàn toàn', 'tuyệt đối', 'chắc chắn', 'rõ ràng',
  'suddenly', 'quickly', 'slowly', 'really', 'very', 'extremely',
  'totally', 'completely', 'absolutely', 'literally', 'actually',
];

// Tell words (indicating telling not showing)
const TELL_INDICATORS = [
  // Emotion telling
  'cảm thấy', 'tức giận', 'vui mừng', 'buồn bã', 'sợ hãi', 'lo lắng',
  'hạnh phúc', 'đau khổ', 'thất vọng', 'phẫn nộ', 'kinh ngạc',
  // State telling
  'biết rằng', 'nhận ra rằng', 'hiểu rằng', 'nghĩ rằng',
  'trở nên', 'dường như', 'có vẻ như', 'hình như',
  // English
  'felt', 'feeling', 'realized', 'understood', 'knew', 'thought',
  'seemed', 'appeared', 'looked like',
];

// Purple prose indicators
const PURPLE_PROSE_PATTERNS = [
  // Excessive adjectives
  /(\w+\s+){4,}\w+\s+(của|with|in)\s/gi,
  // Overly dramatic descriptions
  /hủy thiên diệt địa|thiên địa biến sắc|sơn hà rung chuyển/gi,
  // Redundant emphasis
  /vô cùng.*vô cùng|cực kỳ.*cực kỳ|rất.*rất/gi,
  // Excessive metaphors (multiple in one sentence)
  /như\s+\w+.*như\s+\w+.*như\s+\w+/gi,
];

// Passive voice indicators (Vietnamese)
// Removed 'là...bởi' and 'được...bởi' - literal '...' never matches real text
const PASSIVE_INDICATORS = [
  'được', 'bị',
  'bởi', 'do',
];

// ============================================================================
// TYPES
// ============================================================================

export interface StyleAnalysisResult {
  overallScore: number; // 0-100
  
  weakVerbScore: number;
  weakVerbs: Array<{ verb: string; count: number; alternatives: string[] }>;
  
  adverbScore: number;
  adverbOveruse: Array<{ adverb: string; count: number }>;
  
  showDontTellScore: number;
  tellInstances: Array<{ text: string; suggestion: string }>;
  
  purpleProse: {
    score: number;
    instances: string[];
  };
  
  passiveVoice: {
    score: number;
    ratio: number; // % of passive sentences
    instances: string[];
  };
  
  sentenceVariety: {
    score: number;
    avgLength: number;
    lengthVariance: number;
    shortRatio: number;
    longRatio: number;
  };
  
  expositionDumps: Array<{ location: number; length: number }>;
  
  issues: StyleIssue[];
  suggestions: string[];
}

export interface StyleIssue {
  type: 'weak_verb' | 'adverb' | 'tell_not_show' | 'purple_prose' | 'passive_voice' | 'sentence_variety' | 'exposition';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  location?: number;
  suggestion: string;
}

// ============================================================================
// WRITING STYLE ANALYZER CLASS
// ============================================================================

export class WritingStyleAnalyzer {
  /**
   * Full style analysis
   */
  analyzeStyle(content: string): StyleAnalysisResult {
    const issues: StyleIssue[] = [];
    const suggestions: string[] = [];
    
    // Analyze weak verbs
    const weakVerbAnalysis = this.analyzeWeakVerbs(content);
    if (weakVerbAnalysis.score < 70) {
      issues.push({
        type: 'weak_verb',
        severity: weakVerbAnalysis.score < 50 ? 'major' : 'moderate',
        description: `Sử dụng nhiều động từ yếu (${weakVerbAnalysis.weakVerbs.length} loại)`,
        suggestion: 'Thay thế động từ yếu bằng động từ mạnh, cụ thể hơn',
      });
      suggestions.push('Thay "nhìn" bằng "ngắm/quan sát/dõi theo", "nói" bằng "thốt/gầm/thì thầm"');
    }
    
    // Analyze adverbs
    const adverbAnalysis = this.analyzeAdverbs(content);
    if (adverbAnalysis.score < 70) {
      issues.push({
        type: 'adverb',
        severity: adverbAnalysis.score < 50 ? 'major' : 'moderate',
        description: `Lạm dụng trạng từ (${adverbAnalysis.total} lần)`,
        suggestion: 'Giảm trạng từ, dùng động từ mạnh thay thế',
      });
      suggestions.push('Thay "đi nhanh chóng" bằng "lao/vụt/phi"');
    }
    
    // Analyze show don't tell
    const showDontTell = this.analyzeShowDontTell(content);
    if (showDontTell.score < 70) {
      issues.push({
        type: 'tell_not_show',
        severity: showDontTell.score < 50 ? 'major' : 'moderate',
        description: `Quá nhiều "tell" không "show" (${showDontTell.instances.length} instances)`,
        suggestion: 'Miêu tả hành động/biểu hiện thay vì nói trực tiếp cảm xúc',
      });
      suggestions.push('Thay "hắn tức giận" bằng "hắn nghiến răng, nắm chặt tay"');
    }
    
    // Analyze purple prose
    const purpleProseAnalysis = this.analyzePurpleProse(content);
    if (purpleProseAnalysis.score < 70) {
      issues.push({
        type: 'purple_prose',
        severity: 'moderate',
        description: `Văn phong quá hoa mỹ/lặp lại (${purpleProseAnalysis.instances.length} instances)`,
        suggestion: 'Giảm tính từ, tránh lặp emphasis',
      });
      suggestions.push('Giảm số lượng tính từ trong một câu, tránh "vô cùng...cực kỳ..."');
    }
    
    // Analyze passive voice
    const passiveAnalysis = this.analyzePassiveVoice(content);
    if (passiveAnalysis.score < 70) {
      issues.push({
        type: 'passive_voice',
        severity: passiveAnalysis.ratio > 40 ? 'major' : 'moderate',
        description: `Quá nhiều câu bị động (${Math.round(passiveAnalysis.ratio)}%)`,
        suggestion: 'Dùng câu chủ động để văn mạnh mẽ hơn',
      });
      suggestions.push('Thay "hắn bị đánh" bằng "kẻ địch đánh hắn"');
    }
    
    // Analyze sentence variety
    const sentenceVariety = this.analyzeSentenceVariety(content);
    if (sentenceVariety.score < 70) {
      issues.push({
        type: 'sentence_variety',
        severity: 'moderate',
        description: `Câu văn thiếu đa dạng (variance: ${Math.round(sentenceVariety.lengthVariance)})`,
        suggestion: 'Xen kẽ câu ngắn và câu dài để tạo nhịp điệu',
      });
      suggestions.push('Dùng câu ngắn cho action/tension, câu dài cho description');
    }
    
    // Analyze exposition dumps
    const expositionDumps = this.detectExpositionDumps(content);
    if (expositionDumps.length > 0) {
      issues.push({
        type: 'exposition',
        severity: expositionDumps.some(d => d.length > 500) ? 'major' : 'moderate',
        description: `Phát hiện ${expositionDumps.length} đoạn info-dump`,
        suggestion: 'Chia nhỏ thông tin, reveal qua action thay vì narration',
      });
      suggestions.push('Break up exposition với dialogue hoặc action scene');
    }
    
    // Calculate overall score
    const scores = [
      weakVerbAnalysis.score,
      adverbAnalysis.score,
      showDontTell.score,
      purpleProseAnalysis.score,
      passiveAnalysis.score,
      sentenceVariety.score,
    ];
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    return {
      overallScore,
      weakVerbScore: weakVerbAnalysis.score,
      weakVerbs: weakVerbAnalysis.weakVerbs,
      adverbScore: adverbAnalysis.score,
      adverbOveruse: adverbAnalysis.overused,
      showDontTellScore: showDontTell.score,
      tellInstances: showDontTell.instances,
      purpleProse: purpleProseAnalysis,
      passiveVoice: passiveAnalysis,
      sentenceVariety,
      expositionDumps,
      issues,
      suggestions,
    };
  }
  
  /**
   * Analyze weak verb usage
   */
  private analyzeWeakVerbs(content: string): {
    score: number;
    weakVerbs: Array<{ verb: string; count: number; alternatives: string[] }>;
  } {
    const lowerContent = content.toLowerCase();
    const weakVerbs: Array<{ verb: string; count: number; alternatives: string[] }> = [];
    let totalWeak = 0;
    
    const allWeakVerbs = [...WEAK_VERBS.vietnamese, ...WEAK_VERBS.english];
    
    for (const verb of allWeakVerbs) {
      // Dùng (?<!\p{L}) và (?!\p{L}) thay vì \b cho tiếng Việt (Unicode-aware word boundary)
      const regex = new RegExp(`(?<!\\p{L})${verb}(?!\\p{L})`, 'giu');
      const matches = lowerContent.match(regex);
      if (matches && matches.length > 3) {
        totalWeak += matches.length;
        weakVerbs.push({
          verb,
          count: matches.length,
          alternatives: STRONG_VERB_ALTERNATIVES[verb] || [],
        });
      }
    }
    
    // Sort by count
    weakVerbs.sort((a, b) => b.count - a.count);
    
    // Score: penalize based on weak verb density
    const totalWords = content.split(/\s+/).length;
    const weakRatio = totalWeak / totalWords;
    const score = Math.max(0, Math.min(100, 100 - weakRatio * 500));
    
    return { score: Math.round(score), weakVerbs: weakVerbs.slice(0, 10) };
  }
  
  /**
   * Analyze adverb usage
   */
  private analyzeAdverbs(content: string): {
    score: number;
    total: number;
    overused: Array<{ adverb: string; count: number }>;
  } {
    const lowerContent = content.toLowerCase();
    const overused: Array<{ adverb: string; count: number }> = [];
    let total = 0;
    
    for (const adverb of OVERUSED_ADVERBS) {
      // Unicode-aware matching cho tiếng Việt multi-word adverbs
      const regex = new RegExp(`(?<!\\p{L})${adverb}(?!\\p{L})`, 'giu');
      const matches = lowerContent.match(regex);
      if (matches) {
        total += matches.length;
        if (matches.length > 2) {
          overused.push({ adverb, count: matches.length });
        }
      }
    }
    
    overused.sort((a, b) => b.count - a.count);
    
    // Score: penalize based on adverb density
    const totalWords = content.split(/\s+/).length;
    const adverbRatio = total / totalWords;
    const score = Math.max(0, Math.min(100, 100 - adverbRatio * 300));
    
    return { score: Math.round(score), total, overused };
  }
  
  /**
   * Analyze show don't tell
   */
  private analyzeShowDontTell(content: string): {
    score: number;
    instances: Array<{ text: string; suggestion: string }>;
  } {
    const instances: Array<{ text: string; suggestion: string }> = [];
    const sentences = content.split(/[.!?。！？]+/).filter(s => s.trim());
    
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      
      for (const indicator of TELL_INDICATORS) {
        if (lower.includes(indicator)) {
          instances.push({
            text: sentence.trim().substring(0, 100) + (sentence.length > 100 ? '...' : ''),
            suggestion: this.getSuggestionForTell(indicator),
          });
          break; // One issue per sentence
        }
      }
    }
    
    // Score: based on ratio of tell sentences
    const tellRatio = instances.length / sentences.length;
    const score = Math.max(0, Math.min(100, 100 - tellRatio * 200));
    
    return { score: Math.round(score), instances: instances.slice(0, 10) };
  }
  
  /**
   * Get suggestion for a tell indicator
   */
  private getSuggestionForTell(indicator: string): string {
    const suggestions: Record<string, string> = {
      'cảm thấy': 'Miêu tả biểu hiện cơ thể thay vì nói "cảm thấy"',
      'tức giận': 'Miêu tả: nghiến răng, nắm chặt tay, mặt đỏ bừng',
      'vui mừng': 'Miêu tả: nụ cười, ánh mắt sáng, bước đi nhẹ nhàng',
      'buồn bã': 'Miêu tả: cúi đầu, vai xuôi, mắt đỏ hoe',
      'sợ hãi': 'Miêu tả: run rẩy, toát mồ hôi, chân không vững',
      'biết rằng': 'Thay bằng: nhận ra qua manh mối, suy luận',
      'nghĩ rằng': 'Dùng inner monologue hoặc hành động cho thấy suy nghĩ',
    };
    
    return suggestions[indicator] || 'Show qua hành động/biểu hiện thay vì tell trực tiếp';
  }
  
  /**
   * Analyze purple prose
   */
  private analyzePurpleProse(content: string): {
    score: number;
    instances: string[];
  } {
    const instances: string[] = [];
    
    for (const pattern of PURPLE_PROSE_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        instances.push(...matches.slice(0, 3));
      }
    }
    
    // Check for excessive adjectives in sentences
    const sentences = content.split(/[.!?。！？]+/).filter(s => s.trim());
    for (const sentence of sentences) {
      // Count adjectives (rough estimate by checking for common patterns)
      const adjPatterns = /(\w+\s+(và|,)\s+\w+\s+(và|,)\s+\w+\s+(và|,)\s+\w+)/g;
      if (adjPatterns.test(sentence)) {
        instances.push(sentence.substring(0, 80) + '...');
      }
    }
    
    const score = Math.max(0, 100 - instances.length * 10);
    
    return { score, instances: [...new Set(instances)].slice(0, 5) };
  }
  
  /**
   * Analyze passive voice
   */
  private analyzePassiveVoice(content: string): {
    score: number;
    ratio: number;
    instances: string[];
  } {
    const sentences = content.split(/[.!?。！？]+/).filter(s => s.trim());
    const passiveSentences: string[] = [];
    
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      
      // Check for passive indicators
      let isPassive = false;
      for (const indicator of PASSIVE_INDICATORS) {
        if (lower.includes(indicator)) {
          // More specific check for actual passive
          if (indicator === 'được' || indicator === 'bị') {
            // Check if followed by verb (not noun)
            const regex = new RegExp(`${indicator}\\s+\\w+`, 'i');
            if (regex.test(lower)) {
              isPassive = true;
              break;
            }
          }
        }
      }
      
      if (isPassive) {
        passiveSentences.push(sentence.trim().substring(0, 80) + (sentence.length > 80 ? '...' : ''));
      }
    }
    
    const ratio = (passiveSentences.length / sentences.length) * 100;
    const score = Math.max(0, 100 - ratio);
    
    return {
      score: Math.round(score),
      ratio,
      instances: passiveSentences.slice(0, 5),
    };
  }
  
  /**
   * Analyze sentence variety
   */
  private analyzeSentenceVariety(content: string): {
    score: number;
    avgLength: number;
    lengthVariance: number;
    shortRatio: number;
    longRatio: number;
  } {
    const sentences = content.split(/[.!?。！？]+/).filter(s => s.trim());
    if (sentences.length === 0) {
      return { score: 50, avgLength: 0, lengthVariance: 0, shortRatio: 0, longRatio: 0 };
    }
    
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    
    // Calculate variance
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    const lengthVariance = Math.sqrt(variance);
    
    // Calculate ratios
    const shortCount = lengths.filter(l => l < 8).length;
    const longCount = lengths.filter(l => l > 25).length;
    const shortRatio = (shortCount / lengths.length) * 100;
    const longRatio = (longCount / lengths.length) * 100;
    
    // Score based on variety
    // Good variety: variance between 5-15, mix of short and long
    let score = 70;
    
    if (lengthVariance < 3) {
      score -= 20; // Too uniform
    } else if (lengthVariance > 20) {
      score -= 10; // Too chaotic
    } else if (lengthVariance >= 5 && lengthVariance <= 15) {
      score += 15; // Good variety
    }
    
    if (shortRatio < 10 || shortRatio > 50) {
      score -= 10;
    }
    if (longRatio > 30) {
      score -= 10;
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      avgLength: Math.round(avgLength * 10) / 10,
      lengthVariance: Math.round(lengthVariance * 10) / 10,
      shortRatio: Math.round(shortRatio),
      longRatio: Math.round(longRatio),
    };
  }
  
  /**
   * Detect exposition dumps
   */
  private detectExpositionDumps(content: string): Array<{ location: number; length: number }> {
    const dumps: Array<{ location: number; length: number }> = [];
    
    // Split into paragraphs
    const paragraphs = content.split(/\n\n+/);
    let currentPosition = 0;
    
    for (const paragraph of paragraphs) {
      // Check for exposition indicators
      const lower = paragraph.toLowerCase();
      const hasDialogue = /"[^"]+"|「[^」]+」|『[^』]+』|"[^"]+"|—[^—\n]+/.test(paragraph);
      const hasAction = /đánh|chém|phi|xông|lao|chiến đấu|công kích/.test(lower);
      
      // Long paragraph with no dialogue or action = potential dump
      if (paragraph.length > 300 && !hasDialogue && !hasAction) {
        // Check for info-dump indicators
        const infoIndicators = [
          'theo truyền thuyết', 'người ta nói', 'lịch sử ghi chép',
          'quy tắc', 'hệ thống', 'cảnh giới', 'chia làm', 'gồm có',
          'bao gồm', 'về cơ bản', 'nói chung',
        ];
        
        if (infoIndicators.some(ind => lower.includes(ind))) {
          dumps.push({
            location: currentPosition,
            length: paragraph.length,
          });
        }
      }
      
      currentPosition += paragraph.length + 2; // +2 for \n\n
    }
    
    return dumps;
  }
  
  /**
   * Build context for writing prompts
   */
  buildStyleGuidelines(recentAnalysis?: StyleAnalysisResult): string {
    const lines = ['## Writing Style Guidelines:\n'];
    
    lines.push('### General Rules:');
    lines.push('- Use strong, specific verbs instead of weak verbs + adverbs');
    lines.push('- Show emotions through actions/body language, don\'t tell');
    lines.push('- Vary sentence length for rhythm (mix short and long)');
    lines.push('- Minimize passive voice');
    lines.push('- Break up exposition with dialogue and action');
    
    if (recentAnalysis) {
      if (recentAnalysis.weakVerbs.length > 0) {
        lines.push('\n### Avoid these weak verbs:');
        for (const v of recentAnalysis.weakVerbs.slice(0, 5)) {
          const alts = v.alternatives.length > 0 ? ` → ${v.alternatives.join('/')}` : '';
          lines.push(`- "${v.verb}" (${v.count}x)${alts}`);
        }
      }
      
      if (recentAnalysis.adverbOveruse.length > 0) {
        lines.push('\n### Reduce these adverbs:');
        lines.push(recentAnalysis.adverbOveruse.slice(0, 5).map(a => `"${a.adverb}"`).join(', '));
      }
      
      if (recentAnalysis.tellInstances.length > 0) {
        lines.push('\n### Show don\'t tell examples:');
        for (const t of recentAnalysis.tellInstances.slice(0, 3)) {
          lines.push(`- ${t.suggestion}`);
        }
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Quick quality check - lightweight, chỉ check các metric quan trọng nhất
   */
  quickCheck(content: string): { pass: boolean; mainIssue?: string } {
    // Lightweight checks thay vì chạy full analysis
    const totalWords = content.split(/\s+/).length;
    
    // Quick weak verb ratio check
    const weakMatches = content.toLowerCase().match(/(?<!\p{L})(là|có|được|bị|làm|đi|đến|nói|nhìn|thấy)(?!\p{L})/giu);
    const weakRatio = (weakMatches?.length || 0) / totalWords;
    if (weakRatio > 0.15) {
      return { pass: false, mainIssue: 'Quá nhiều động từ yếu' };
    }
    
    // Quick adverb check
    const adverbMatches = content.toLowerCase().match(/(?<!\p{L})(rất|quá|cực kỳ|vô cùng|thật sự|đột nhiên)(?!\p{L})/giu);
    const adverbRatio = (adverbMatches?.length || 0) / totalWords;
    if (adverbRatio > 0.08) {
      return { pass: false, mainIssue: 'Lạm dụng trạng từ' };
    }
    
    // Quick tell-not-show check
    const tellMatches = content.toLowerCase().match(/cảm thấy|biết rằng|nhận ra rằng|nghĩ rằng/gi);
    const tellRatio = (tellMatches?.length || 0) / Math.max(1, content.split(/[.!?。！？]+/).length);
    if (tellRatio > 0.3) {
      return { pass: false, mainIssue: 'Quá nhiều "tell" không "show"' };
    }
    
    return { pass: true };
  }
}

// Export singleton
export const writingStyleAnalyzer = new WritingStyleAnalyzer();
