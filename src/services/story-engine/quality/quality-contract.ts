export type StoryQualityVerdict = 'pass' | 'revise' | 'block';

export type StoryQualityGoal =
  | 'coherence'
  | 'character_consistency'
  | 'directional_plot'
  | 'ending_readiness'
  | 'uniform_quality';

export interface ChapterQualityIssue {
  code: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  message: string;
  goal?: StoryQualityGoal;
}

export interface ChapterQualityMetrics {
  wordCount: number;
  wordRatio: number;
  protagonistMentions: number;
  dialogueLines: number;
  sensoryHits: number;
  innerHits: number;
  agencyHits: number;
  payoffHits: number;
  endingHook: boolean;
  genericEnding: boolean;
  aiPhraseHits: number;
  severeRepetitionGroups: Array<{ phrase: string; count: number }>;
}

export interface ChapterQualityReport {
  verdict: StoryQualityVerdict;
  score: number;
  issues: ChapterQualityIssue[];
  metrics: ChapterQualityMetrics;
  suggestedFixes: string[];
}

export interface ChapterQualityContext {
  title?: string | null;
  protagonistName?: string | null;
  targetWords?: number | null;
  minWords?: number | null;
  genre?: string | null;
  worldDescription?: string | null;
}

export interface WindowChapterQuality {
  chapterNumber: number;
  title?: string | null;
  report: ChapterQualityReport;
}

export interface WindowQualityReport {
  projectId: string;
  chapters: WindowChapterQuality[];
  supremeGoals: Record<StoryQualityGoal, 'green' | 'yellow' | 'red'>;
  trend: {
    averageScore: number;
    passRate: number;
    reviseCount: number;
    blockCount: number;
  };
  nextActions: string[];
}

const INNER_SIGNALS = [
  'thầm nghĩ', 'trong lòng', 'tâm trí', 'ký ức', 'nỗi sợ',
  'tự nhủ', 'nhận ra', 'không dám thừa nhận', 'hắn hiểu', 'cô hiểu',
];

const SENSORY_SIGNALS = [
  'mùi', 'tiếng', 'âm thanh', 'lạnh', 'nóng', 'đau', 'vị',
  'ánh sáng', 'bóng tối', 'gió', 'mưa', 'máu', 'khói', 'hơi', 'nhiệt',
];

const AGENCY_SIGNALS = [
  'quyết định', 'chọn', 'ra lệnh', 'bước tới', 'đưa tay', 'mở', 'đặt',
  'ký', 'tính toán', 'sắp xếp', 'thử', 'đổi', 'nhận lấy', 'chặn',
];

const PAYOFF_SIGNALS = [
  'kết quả', 'thu hoạch', 'đạt được', 'ký xong', 'hoàn thành', 'tăng',
  'nhận ra', 'công nhận', 'thành công', 'mở khóa', 'đột phá', 'lời hứa',
  'đơn hàng', 'doanh thu', 'tài nguyên', 'uy tín',
];

const ENDING_HOOK_SIGNALS = [
  '?!', '!!!', 'liệu', 'không ngờ', 'bất ngờ', 'rốt cuộc', 'sẽ ra sao',
  'vang lên', 'cánh cửa', 'tin nhắn', 'ngày mai', 'chờ đợi', 'bí mật',
  'dừng lại', 'mở ra', 'nhìn thấy', 'câu hỏi',
];

const GENERIC_ENDING_SIGNALS = [
  'cuộc chiến thật sự chỉ vừa mới bắt đầu',
  'cuộc chiến vừa bắt đầu',
  'trò chơi thực sự mới bắt đầu',
  'đêm dài còn ở phía trước',
];

const AI_PHRASES = [
  'khẽ nhếch mép', 'khóe miệng nhếch', 'không khỏi', 'chỉ thấy',
  'không nói nên lời', 'ánh mắt phức tạp', 'trong lòng thầm nghĩ',
  'không thể tin nổi', 'khẽ thở dài', 'hít một ngụm khí lạnh',
];

const REPETITION_GROUPS: Record<string, string[]> = {
  'dường như/như thể': ['dường như', 'như thể'],
  'bắt đầu': ['bắt đầu'],
  'mang theo': ['mang theo'],
  'tỏa ra': ['tỏa ra'],
  'rực rỡ': ['rực rỡ'],
  'kinh hoàng': ['kinh hoàng', 'kinh hãi', 'kinh ngạc'],
  'run rẩy': ['run rẩy', 'run lên', 'run bần bật'],
  'đôi mắt': ['đôi mắt'],
  'tím/vàng/đỏ': ['tím sẫm', 'tím đen', 'vàng kim', 'đỏ rực', 'đỏ thẫm'],
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countHits(text: string, signals: string[]): number {
  const lower = text.toLowerCase();
  return signals.reduce((sum, signal) => sum + lower.split(signal).length - 1, 0);
}

function countRegex(text: string, re: RegExp): number {
  return text.match(re)?.length ?? 0;
}

function countDialogueLines(text: string): number {
  return text.split('\n').filter((line) => /^\s*[—–-]/.test(line)).length;
}

function hasEndingHook(text: string): boolean {
  const tail = text.slice(-800).toLowerCase();
  return ENDING_HOOK_SIGNALS.some((signal) => tail.includes(signal));
}

function hasGenericEnding(text: string): boolean {
  const tail = text.slice(-800).toLowerCase();
  return GENERIC_ENDING_SIGNALS.some((signal) => tail.includes(signal));
}

function protagonistMentionCount(content: string, protagonistName?: string | null): number {
  const name = protagonistName?.trim();
  if (!name || name.length < 2) return 0;
  const variants = new Set([name]);
  for (const token of name.split(/\s+/).filter((part) => part.length >= 2)) {
    variants.add(token);
  }
  let count = 0;
  for (const variant of variants) {
    count += countRegex(content, new RegExp(escapeRegex(variant), 'gi'));
  }
  return count;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function severeRepetitionGroups(content: string): Array<{ phrase: string; count: number }> {
  const lower = content.toLowerCase();
  const groups: Array<{ phrase: string; count: number }> = [];
  for (const [phrase, variants] of Object.entries(REPETITION_GROUPS)) {
    const count = variants.reduce((sum, variant) => sum + lower.split(variant).length - 1, 0);
    if (count >= 6) groups.push({ phrase, count });
  }
  return groups.sort((a, b) => b.count - a.count);
}

function usesVnCurrencyGuard(genre?: string | null, worldDescription?: string | null): boolean {
  return ['do-thi', 'quan-truong'].includes(genre || '') ||
    /Đại Nam|Phượng Đô|Hải Long Đô|Sài Gòn|Hà Nội|Việt Nam|Dân Quốc|Đại Việt/i.test(worldDescription || '');
}

function buildMetrics(content: string, context: ChapterQualityContext): ChapterQualityMetrics {
  const wordCount = countWords(content);
  const target = Math.max(1, context.targetWords || context.minWords || 2200);
  return {
    wordCount,
    wordRatio: Number((wordCount / target).toFixed(2)),
    protagonistMentions: protagonistMentionCount(content, context.protagonistName),
    dialogueLines: countDialogueLines(content),
    sensoryHits: countHits(content, SENSORY_SIGNALS),
    innerHits: countHits(content, INNER_SIGNALS),
    agencyHits: countHits(content, AGENCY_SIGNALS),
    payoffHits: countHits(content, PAYOFF_SIGNALS),
    endingHook: hasEndingHook(content),
    genericEnding: hasGenericEnding(content),
    aiPhraseHits: countHits(content, AI_PHRASES),
    severeRepetitionGroups: severeRepetitionGroups(content),
  };
}

export function evaluateChapterQuality(
  content: string,
  context: ChapterQualityContext = {},
): ChapterQualityReport {
  const title = context.title || '';
  const metrics = buildMetrics(content, context);
  const issues: ChapterQualityIssue[] = [];
  const minWords = context.minWords || Math.min(2000, Math.floor((context.targetWords || 2400) * 0.82));

  const add = (issue: ChapterQualityIssue) => issues.push(issue);

  if (!content.trim()) {
    add({ code: 'empty_content', severity: 'critical', message: 'Chương trống.', goal: 'uniform_quality' });
  }
  if (metrics.wordCount < minWords) {
    add({
      code: 'word_count_low',
      severity: metrics.wordCount < minWords * 0.7 ? 'major' : 'moderate',
      message: `Chương ${metrics.wordCount} từ, thấp hơn mức tối thiểu ${minWords}.`,
      goal: 'uniform_quality',
    });
  }
  if (/\(ti[eế]p\)|\bti[eế]p\b/i.test(title)) {
    add({ code: 'split_title', severity: 'major', message: 'Tiêu đề giống chương bị chia phần/continuation.', goal: 'uniform_quality' });
  }
  if (/deepseek|gemini|api key|prompt|system prompt/i.test(content)) {
    add({ code: 'model_or_prompt_leak', severity: 'critical', message: 'Nội dung có dấu hiệu leak model/prompt/API.', goal: 'coherence' });
  }
  if (/\[(WORLD DESCRIPTION|CONTEXT|STORY KERNEL|VOLUME CONTEXT)/i.test(content)) {
    add({ code: 'context_leak', severity: 'critical', message: 'Nội dung có dấu hiệu leak context pipeline.', goal: 'coherence' });
  }
  if (/<(MC|LOVE|CITY|COMPANY|NUMBER|TITLE|SKILL)>/.test(content)) {
    add({ code: 'placeholder_leak', severity: 'critical', message: 'Còn placeholder literal trong chương.', goal: 'coherence' });
  }
  if (context.protagonistName?.trim() && metrics.protagonistMentions === 0) {
    add({
      code: 'protagonist_absent',
      severity: 'critical',
      message: `Không thấy tên/token nhân vật chính "${context.protagonistName}" trong chương.`,
      goal: 'character_consistency',
    });
  }
  if (usesVnCurrencyGuard(context.genre, context.worldDescription)) {
    const xuLeak = content.match(/\d[\d.,]*\s*xu\b|(?:triệu|nghìn|trăm|tỷ|ngàn)\s+xu\b/i);
    const nguyenLeak = content.match(/\d[\d.,]*\s*nguyên(?!\s*(?:tử|thủy|tắc|liệu|chất|bản|nhân|thái|thủ|hình|sơ|tháng|năm|đán|tiêu))/i);
    if (xuLeak || nguyenLeak) {
      add({ code: 'vnd_currency_leak', severity: 'critical', message: `Leak đơn vị tiền không hợp bối cảnh: "${(xuLeak || nguyenLeak)?.[0]}".`, goal: 'coherence' });
    }
  }
  if (!metrics.endingHook) {
    add({ code: 'weak_ending_hook', severity: 'moderate', message: 'Kết chương thiếu lực kéo đọc tiếp rõ.', goal: 'ending_readiness' });
  }
  if (metrics.genericEnding) {
    add({ code: 'generic_ending', severity: 'moderate', message: 'Kết chương dùng câu sáo rỗng kiểu “cuộc chiến mới bắt đầu”.', goal: 'ending_readiness' });
  }
  if (metrics.dialogueLines < 3) {
    add({ code: 'low_dialogue', severity: 'moderate', message: `Đối thoại mỏng (${metrics.dialogueLines} dòng).`, goal: 'uniform_quality' });
  }
  if (metrics.sensoryHits < 5) {
    add({ code: 'low_sensory', severity: 'minor', message: `Chi tiết giác quan mỏng (${metrics.sensoryHits} tín hiệu).`, goal: 'uniform_quality' });
  }
  if (metrics.innerHits < 2) {
    add({ code: 'low_inner_monologue', severity: 'minor', message: `Nội tâm/nhận thức mỏng (${metrics.innerHits} tín hiệu).`, goal: 'character_consistency' });
  }
  if (metrics.agencyHits < 2) {
    add({ code: 'low_mc_agency', severity: 'major', message: 'MC thiếu hành động/lựa chọn chủ động thấy rõ.', goal: 'directional_plot' });
  }
  if (metrics.payoffHits < 2) {
    add({ code: 'low_payoff', severity: 'major', message: 'Chương thiếu payoff/lợi ích/hậu quả cụ thể.', goal: 'directional_plot' });
  }
  if (metrics.aiPhraseHits > 0) {
    add({ code: 'ai_phrase_hits', severity: metrics.aiPhraseHits >= 3 ? 'moderate' : 'minor', message: `Có ${metrics.aiPhraseHits} cụm văn mẫu AI/cliche.`, goal: 'uniform_quality' });
  }
  for (const group of metrics.severeRepetitionGroups) {
    add({
      code: 'severe_repetition',
      severity: group.count >= 9 ? 'major' : 'moderate',
      message: `Lặp cụm "${group.phrase}" ${group.count} lần.`,
      goal: 'uniform_quality',
    });
  }

  const score = Math.max(0, Math.min(100, 100 - issues.reduce((sum, issue) => {
    if (issue.severity === 'critical') return sum + 30;
    if (issue.severity === 'major') return sum + 18;
    if (issue.severity === 'moderate') return sum + 9;
    return sum + 4;
  }, 0)));

  const hasCritical = issues.some((issue) => issue.severity === 'critical');
  const hasMajor = issues.some((issue) => issue.severity === 'major');
  const verdict: StoryQualityVerdict = hasCritical ? 'block' : hasMajor || score < 75 ? 'revise' : 'pass';

  return {
    verdict,
    score,
    issues,
    metrics,
    suggestedFixes: buildSuggestedFixes(issues),
  };
}

function buildSuggestedFixes(issues: ChapterQualityIssue[]): string[] {
  const fixes = new Set<string>();
  for (const issue of issues) {
    if (issue.code === 'word_count_low') fixes.add('Mở rộng từng scene bằng hành động cụ thể, phản ứng người xung quanh, sensory detail và nội tâm tại pivot.');
    if (issue.code === 'weak_ending_hook' || issue.code === 'generic_ending') fixes.add('Viết lại 300-500 từ cuối để có hook cụ thể: pending result, reveal nhỏ, emotional choice hoặc comfort-resolution có dư âm.');
    if (issue.code === 'low_mc_agency') fixes.add('Thêm ít nhất một quyết định chủ động của MC dẫn tới thay đổi thật trong scene.');
    if (issue.code === 'low_payoff') fixes.add('Gieo một setup ở đầu chương và trả payoff rõ trong chính chương.');
    if (issue.code === 'low_dialogue') fixes.add('Thêm đối thoại có subtext, mỗi 2-3 dòng kèm action/reaction beat.');
    if (issue.code === 'severe_repetition' || issue.code === 'ai_phrase_hits') fixes.add('Thay cụm lặp/cliche bằng hành động vật lý, vật thể cụ thể hoặc miêu tả gián tiếp.');
    if (issue.severity === 'critical') fixes.add('Không publish bản này; sửa lỗi block trước khi apply DB.');
  }
  return [...fixes];
}

export function evaluateWindowQuality(
  projectId: string,
  chapters: Array<{ chapterNumber: number; title?: string | null; content: string }>,
  context: ChapterQualityContext = {},
): WindowQualityReport {
  const evaluated = chapters.map((chapter) => ({
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    report: evaluateChapterQuality(chapter.content, { ...context, title: chapter.title }),
  }));
  const count = Math.max(1, evaluated.length);
  const averageScore = Math.round(evaluated.reduce((sum, item) => sum + item.report.score, 0) / count);
  const passCount = evaluated.filter((item) => item.report.verdict === 'pass').length;
  const reviseCount = evaluated.filter((item) => item.report.verdict === 'revise').length;
  const blockCount = evaluated.filter((item) => item.report.verdict === 'block').length;

  const issueCount = (goal: StoryQualityGoal, severities: ChapterQualityIssue['severity'][] = ['major', 'critical']) =>
    evaluated.reduce((sum, item) => sum + item.report.issues.filter((issue) => issue.goal === goal && severities.includes(issue.severity)).length, 0);

  const supremeGoals: WindowQualityReport['supremeGoals'] = {
    coherence: gradeGoal(issueCount('coherence'), count),
    character_consistency: gradeGoal(issueCount('character_consistency'), count),
    directional_plot: gradeGoal(issueCount('directional_plot'), count),
    ending_readiness: gradeGoal(issueCount('ending_readiness', ['moderate', 'major', 'critical']), count),
    uniform_quality: averageScore >= 82 && blockCount === 0 ? 'green' : averageScore >= 70 && blockCount === 0 ? 'yellow' : 'red',
  };

  const nextActions: string[] = [];
  if (blockCount > 0) nextActions.push('Chặn publish/rewrite các chương có verdict block trước.');
  if (reviseCount > 0) nextActions.push('Sửa các chương revise trước khi mở lại nhịp sản xuất.');
  if (supremeGoals.ending_readiness !== 'green') nextActions.push('Ưu tiên viết lại ending hook trong window gần nhất.');
  if (supremeGoals.directional_plot !== 'green') nextActions.push('Bổ sung MC agency + payoff cụ thể ở chương kế tiếp.');
  if (nextActions.length === 0) nextActions.push('Window đạt chuẩn spine; có thể tiếp tục chương kế tiếp.');

  return {
    projectId,
    chapters: evaluated,
    supremeGoals,
    trend: {
      averageScore,
      passRate: Number((passCount / count).toFixed(2)),
      reviseCount,
      blockCount,
    },
    nextActions,
  };
}

function gradeGoal(issueCount: number, chapterCount: number): 'green' | 'yellow' | 'red' {
  if (issueCount === 0) return 'green';
  if (issueCount <= Math.max(1, Math.floor(chapterCount / 3))) return 'yellow';
  return 'red';
}
