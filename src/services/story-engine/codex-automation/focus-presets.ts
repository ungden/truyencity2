import type { ContinuityExtractionPayload } from './contract';
import type { GenreType } from '../types';

export type FocusKey = 'song-xuyen-trade' | 'sang-the-than-minh';
export type FocusPresetVerdict = 'pass' | 'revise' | 'block';

export interface FocusPreset {
  key: FocusKey;
  label: string;
  primaryGenre: GenreType;
  subGenres: string[];
  mcArchetype: string;
  antiTropes: string[];
  promptContext: string;
  coverPromptHints: string[];
  requiredSetupKeywords: Array<{ code: string; label: string; keywords: string[] }>;
}

export interface FocusPresetIssue {
  code: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  message: string;
}

export interface FocusPresetValidationReport {
  verdict: FocusPresetVerdict;
  focusKey: FocusKey;
  issues: FocusPresetIssue[];
}

interface StorySetupForFocusPreset {
  genres: string[];
  subGenres?: string[];
  worldDescription: string;
  setupKernel: unknown;
  masterOutline: unknown;
  storyOutline: unknown;
  arcPlan: unknown[];
}

export const FOCUS_PRESETS: Record<FocusKey, FocusPreset> = {
  'sang-the-than-minh': {
    key: 'sang-the-than-minh',
    label: 'Sang The Than Minh World-Creation Progression',
    primaryGenre: 'di-gioi',
    subGenres: ['toan-dan-sang-the', 'sang-the', 'thien-dao-luu'],
    mcArchetype: 'world creator with accelerated divine-domain cheat',
    antiTropes: ['no_miserable_start', 'no_random_power_jump', 'no_forgotten_species', 'no_empty_world_stats'],
    promptContext: [
      '[FOCUS PRESET: sang-the-than-minh]',
      'Premise lock:',
      '- MC xuyên qua thế giới nơi mỗi người gần như là thần minh dự bị, sở hữu một Thần Vực/tiểu thế giới riêng.',
      '- Sức mạnh bản thể = chất lượng thế giới tự sáng tạo: diện tích, pháp tắc, sinh thái, chủng tộc quyến thuộc, tín ngưỡng, chiến lực văn minh và độ ổn định Thiên Đạo.',
      '- MC có trí nhớ kiếp trước như kho văn học/ảo tưởng/phim ảnh/thần thoại/tiểu thuyết, dùng để tái hiện các "world template" mà dân bản địa chưa từng nghĩ tới.',
      '- Core fantasy là sáng thế + nuôi sinh vật + phát triển văn minh + tấn cấp thế giới, MC mạnh dần theo thế giới phản hồi, đọc sảng chứ không bị hành xác kéo dài.',
      '- Sảng văn cadence: khó khăn chỉ là bài toán ngắn để MC khoe trí nhớ kiếp trước + bàn tay vàng; mỗi chương phải có tiến triển hữu hình như tăng hạng, tiến hóa loài, mở template, tăng tín ngưỡng/thần lực hoặc thắng kiểm tra.',
      '',
      'Setup bắt buộc:',
      '- Có học viện/cơ cấu khảo hạch thần minh dự bị, cấp bậc Thần Vực và ladder tấn cấp rõ.',
      '- Có golden finger cụ thể giúp MC biến ký ức kiếp trước thành bản thiết kế thế giới khả thi nhưng có luật: gia tốc thời gian, phân tích pháp tắc, dung hợp giống loài, chỉnh môi trường, điểm nguồn gốc hoặc template pháp tắc.',
      '- Có world-state ledger: diện tích, nguồn năng lượng, pháp tắc, sinh thái, chủng tộc/quyến thuộc, tín ngưỡng, tài nguyên, rủi ro sụp đổ.',
      '- Có ít nhất 3 chủng tộc/sinh vật chủ lực phát triển dài hạn, mỗi loài có tính cách, kỹ năng, cây tiến hóa và vai trò văn minh riêng.',
      '- Có battle/test loop: khảo hạch thế giới, chiến tranh thần vực, trao đổi tài nguyên, xếp hạng học viện, phó bản hư không.',
      '',
      'Chapter continuity bắt buộc:',
      '- Khi thế giới/loài/pháp tắc/tín ngưỡng thay đổi, continuity.json phải ghi worldStateDeltas, factions, plotThreads và itemEvents/economicLedger nếu có tài nguyên.',
      '- Không nâng cấp thế giới bằng may mắn trống; mọi tấn cấp phải có nguyên nhân, chi phí, payoff và rủi ro đã được ghi.',
      '- Không để quyến thuộc/sinh vật cũ biến mất khỏi truyện sau khi được gieo.',
      '- Không kéo main khổ lâu, không để bài toán treo quá nhiều chương; ưu tiên payoff sảng ngay trong chương.',
      '[/FOCUS PRESET]',
    ].join('\n'),
    coverPromptHints: [
      'epic premium Chinese webnovel cover, young male world creator holding a glowing miniature divine realm',
      'inside the orb: oceans, mountains, primordial creatures and golden world tree roots, cosmic academy silhouettes behind',
      'clean cool-neutral cinematic light, sharp mobile thumbnail, 3:4 Vietnamese webnovel cover, no muddy orange cast',
    ],
    requiredSetupKeywords: [
      { code: 'divine_domain', label: 'Thần Vực/tiểu thế giới', keywords: ['thần vực', 'tiểu thế giới', 'thế giới riêng', 'sáng thế', 'lãnh địa thế giới'] },
      { code: 'creator_progression', label: 'tấn cấp thế giới', keywords: ['tấn cấp', 'cấp bậc', 'cảnh giới', 'thần minh dự bị', 'thần hỏa'] },
      { code: 'species', label: 'quyến thuộc/chủng tộc', keywords: ['quyến thuộc', 'chủng tộc', 'sinh vật', 'bộ tộc', 'văn minh'] },
      { code: 'faith_law', label: 'tín ngưỡng/pháp tắc', keywords: ['tín ngưỡng', 'pháp tắc', 'thiên đạo', 'thần tính', 'nguồn gốc'] },
      { code: 'previous_life_templates', label: 'trí nhớ kiếp trước/world template', keywords: ['trí nhớ kiếp trước', 'kiếp trước', 'văn học', 'phim ảnh', 'ảo tưởng', 'template'] },
      { code: 'world_ledger', label: 'world-state ledger', keywords: ['world-state', 'trạng thái thế giới', 'diện tích', 'sinh thái', 'tài nguyên'] },
      { code: 'assessment_loop', label: 'khảo hạch/chiến tranh thần vực', keywords: ['khảo hạch', 'học viện', 'xếp hạng', 'chiến tranh thần vực', 'phó bản hư không'] },
    ],
  },
  'song-xuyen-trade': {
    key: 'song-xuyen-trade',
    label: 'Song Xuyen Trade Progression',
    primaryGenre: 'di-gioi',
    subGenres: ['isekai-trade', 'kinh-doanh', 'cultural-carry'],
    mcArchetype: 'cross-world trade operator',
    antiTropes: ['no_unlimited_inventory', 'no_free_arbitrage', 'no_new_world_without_payoff', 'no_source-less_resources', 'no_pure_suffering_loop'],
    promptContext: [
      '[FOCUS PRESET: song-xuyen-trade]',
      'Premise lock:',
      '- MC qua lại giữa chủ thế giới và dị giới/các thế giới khác bằng một cơ chế có giới hạn rõ.',
      '- Core fantasy là bù trừ giá trị giữa các thế giới: hàng hóa, thông tin, kỹ thuật nhỏ, văn hóa, thuốc, nguyên liệu, logistics.',
      '- MC mạnh dần bằng thương mại, quan hệ, dữ liệu giá, hậu cần, inventory discipline và faction trust, không phải cheat tiền/vật phẩm vô hạn.',
      '- Đây là sảng văn trade/progression: mỗi chương phải trả "trade dividend" rõ cho MC. Dù có nguy cơ, cuối chương MC cần lãi ít nhất một thứ cụ thể: tiền, hàng, nguồn cung, khách hàng, quyền route, dữ liệu giá, uy tín faction, giấy phép, hợp đồng, hoặc đòn bẩy xã hội.',
      '- Không kéo MC khổ liên tục. Rủi ro chỉ đáng giữ nếu nó đổi được lợi thế mới hoặc mở cửa kiếm lợi lớn hơn ngay trong chapter/window.',
      '',
      'Setup bắt buộc:',
      '- Ít nhất 2 thế giới có tên, luật, nhu cầu, nguồn cung, rủi ro và giá trị tương đối khác nhau.',
      '- Có trade ledger / inventory ledger / world-state ledger trong storyOutline.',
      '- Có exchange-rate drift: giao dịch nhiều lần sẽ làm giá, phe phái, luật hoặc nguồn cung thay đổi.',
      '- Có logistics constraint: khối lượng, thời gian, kiểm soát hải quan/cổng dịch chuyển, niềm tin, bảo quản, rủi ro bị phát hiện.',
      '- Có social cost: mỗi khoản lợi phải tạo phản ứng của gia đình, khách hàng, thương hội, chính quyền hoặc phe dị giới.',
      '',
      'Chapter continuity bắt buộc:',
      '- Khi có mua/bán/trao đổi/vận chuyển, continuity.json phải ghi itemEvents, economicLedger, tradeLedger và worldStateDeltas.',
      '- Mỗi chương Song Xuyên phải ghi rõ trong economicLedger/tradeLedger: MC đã lãi gì sau chương này. Nếu chỉ thêm áp lực/rủi ro mà không có profit/progression dividend, phải revise.',
      '- Không để hàng hóa/vốn/tài nguyên xuất hiện không nguồn.',
      '- Không mở thế giới mới nếu ledger hai thế giới cũ chưa đủ payoff hoặc chưa có lý do.',
      '[/FOCUS PRESET]',
    ].join('\n'),
    coverPromptHints: [
      'clear premium realistic fantasy trade portal between modern city market and otherworld caravan market',
      'MC holding a ledger and a small traded artifact, clean cool-neutral cinematic light',
      'no yellow cast, no muddy orange glow, crisp mobile thumbnail, 3:4 Vietnamese webnovel cover',
    ],
    requiredSetupKeywords: [
      { code: 'two_worlds', label: 'hai hoặc nhiều thế giới', keywords: ['chủ thế giới', 'dị giới', 'thế giới khác', 'hai thế giới', 'cổng', 'song xuyên'] },
      { code: 'trade_loop', label: 'trade loop', keywords: ['buôn bán', 'trao đổi', 'giao dịch', 'chênh lệch giá', 'arbitrage', 'thương mại'] },
      { code: 'logistics', label: 'logistics constraint', keywords: ['hậu cần', 'vận chuyển', 'khối lượng', 'bảo quản', 'thời gian', 'kiểm soát'] },
      { code: 'inventory', label: 'inventory/resource ledger', keywords: ['inventory', 'tồn kho', 'vật tư', 'hàng hóa', 'nguồn hàng', 'tài nguyên'] },
      { code: 'world_state', label: 'world-state drift', keywords: ['world-state', 'trạng thái thế giới', 'giá biến động', 'nguồn cung', 'phe phái', 'thương hội'] },
    ],
  },
};

export function isFocusKey(value: string | undefined): value is FocusKey {
  return value === 'song-xuyen-trade' || value === 'sang-the-than-minh';
}

export function getFocusPreset(focusKey: string | undefined): FocusPreset | null {
  return isFocusKey(focusKey) ? FOCUS_PRESETS[focusKey] : null;
}

export function buildFocusPresetContext(focusKey: string | undefined): string {
  const preset = getFocusPreset(focusKey);
  return preset?.promptContext || '';
}

export function applyFocusPresetTemplate<T extends Record<string, unknown>>(template: T, focusKey: string | undefined): T & Record<string, unknown> {
  const preset = getFocusPreset(focusKey);
  if (!preset) return template;
  return {
    ...template,
    focusKey: preset.key,
    genres: [preset.primaryGenre],
    subGenres: preset.subGenres,
    mcArchetype: preset.mcArchetype,
    antiTropes: preset.antiTropes,
    coverPrompt: preset.coverPromptHints.join(', '),
  };
}

function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFC');
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function countMatches(text: string, keywords: string[]): number {
  return keywords.reduce((sum, keyword) => sum + (text.includes(keyword.toLowerCase()) ? 1 : 0), 0);
}

export function validateFocusPresetStorySetup(
  payload: StorySetupForFocusPreset,
  focusKey: string | undefined,
): FocusPresetValidationReport {
  const preset = getFocusPreset(focusKey);
  if (!preset) {
    return { verdict: 'pass', focusKey: 'song-xuyen-trade', issues: [] };
  }
  const issues: FocusPresetIssue[] = [];
  if (payload.genres[0] !== preset.primaryGenre) {
    issues.push({
      code: 'focus_primary_genre_mismatch',
      severity: 'major',
      message: `Focus ${preset.key} requires primary genre ${preset.primaryGenre}.`,
    });
  }
  const subGenres = payload.subGenres || payload.genres.slice(1);
  for (const required of preset.subGenres) {
    if (!subGenres.includes(required)) {
      issues.push({
        code: 'focus_subgenre_missing',
        severity: 'major',
        message: `Focus ${preset.key} requires subgenre ${required}.`,
      });
    }
  }
  const text = normalize([
    payload.worldDescription,
    asText(payload.setupKernel),
    asText(payload.masterOutline),
    asText(payload.storyOutline),
    asText(payload.arcPlan),
  ].join('\n'));
  for (const group of preset.requiredSetupKeywords) {
    if (!hasAny(text, group.keywords)) {
      issues.push({
        code: `focus_missing_${group.code}`,
        severity: 'major',
        message: `Song Xuyen setup must define ${group.label}: ${group.keywords.join(', ')}.`,
      });
    }
  }
  const critical = issues.some((issue) => issue.severity === 'critical');
  const major = issues.some((issue) => issue.severity === 'major');
  return {
    verdict: critical ? 'block' : major ? 'revise' : 'pass',
    focusKey: preset.key,
    issues,
  };
}

export function validateFocusPresetContinuity(
  payload: ContinuityExtractionPayload,
  focusKey: string | undefined,
): FocusPresetValidationReport {
  const preset = getFocusPreset(focusKey);
  if (!preset) return { verdict: 'pass', focusKey: 'song-xuyen-trade', issues: [] };
  const issues: FocusPresetIssue[] = [];
  if (preset.key === 'sang-the-than-minh') {
    const text = normalize([
      payload.summary,
      payload.mcState,
      payload.cliffhanger,
      ...payload.plotThreads.map((entry) => `${entry.name} ${entry.description} ${entry.payoffDescription || ''}`),
      ...(payload.worldStateDeltas || []).map((entry) => `${entry.worldName} ${entry.deltaType} ${entry.description} ${entry.pressureChange || ''} ${entry.relatedResources.join(' ')}`),
      ...(payload.factions || []).map((entry) => `${entry.factionName} ${entry.description || ''}`),
    ].join('\n'));
    const hasCreationScene = hasAny(text, ['thần vực', 'tiểu thế giới', 'sáng thế', 'quyến thuộc', 'pháp tắc', 'tín ngưỡng', 'world-state', 'template']);
    if (!hasCreationScene) return { verdict: 'pass', focusKey: preset.key, issues };
    if ((payload.worldStateDeltas || []).length === 0) {
      issues.push({
        code: 'focus_world_state_delta_missing',
        severity: 'critical',
        message: 'Sang The chapter has world-creation signals but continuity.json lacks worldStateDeltas.',
      });
    }
    if (!hasAny(text, ['trí nhớ kiếp trước', 'văn học', 'phim ảnh', 'ảo tưởng', 'template', 'vạn tượng'])) {
      issues.push({
        code: 'focus_previous_life_template_missing',
        severity: 'major',
        message: 'Sang The chapter should record how previous-life memory/world templates affect creation progress.',
      });
    }
    if (!hasAny(text, ['quyến thuộc', 'chủng tộc', 'sinh vật', 'kiến đá', 'mộc linh', 'long tích'])) {
      issues.push({
        code: 'focus_species_progress_missing',
        severity: 'major',
        message: 'Sang The chapter should track species/dependent-race progress.',
      });
    }
    const critical = issues.some((issue) => issue.severity === 'critical');
    const major = issues.some((issue) => issue.severity === 'major');
    return {
      verdict: critical ? 'block' : major ? 'revise' : 'pass',
      focusKey: preset.key,
      issues,
    };
  }
  const text = normalize([
    payload.summary,
    payload.mcState,
    payload.cliffhanger,
    ...payload.economicLedger.map((entry) => `${entry.deltaSummary} ${entry.assets.join(' ')}`),
    ...(payload.tradeLedger || []).map((entry) => `${entry.resourceName} ${entry.source} ${entry.cost} ${entry.expectedValue} ${entry.logisticsConstraint} ${entry.worldStateImpact}`),
    ...(payload.worldStateDeltas || []).map((entry) => `${entry.worldName} ${entry.deltaType} ${entry.description} ${entry.pressureChange} ${entry.relatedResources.join(' ')}`),
  ].join('\n'));
  const hasTradeScene = hasAny(text, ['buôn', 'bán', 'mua', 'trao đổi', 'giao dịch', 'hàng', 'vốn', 'lợi nhuận', 'doanh thu', 'chênh lệch', 'thương hội', 'route', 'ledger', 'quyền', 'hợp đồng', 'giấy phép']);
  if (!hasTradeScene) return { verdict: 'pass', focusKey: preset.key, issues };

  if ((payload.tradeLedger || []).length === 0) {
    issues.push({
      code: 'focus_trade_ledger_missing',
      severity: 'critical',
      message: 'Song Xuyen chapter has trade signals but continuity.json lacks tradeLedger.',
    });
  }
  if ((payload.worldStateDeltas || []).length === 0) {
    issues.push({
      code: 'focus_world_state_delta_missing',
      severity: 'major',
      message: 'Song Xuyen trade scene must record worldStateDeltas so exchange/value drift is not invisible.',
    });
  }
  const dividendText = normalize([
    payload.readerPayoff?.tradeDividend || '',
    payload.readerPayoff?.progressionDelta || '',
    payload.readerPayoff?.comfortOrSwaggerBeat || '',
    payload.readerPayoff?.nextProfitHook || '',
    payload.mcState,
    payload.summary,
    ...payload.economicLedger.map((entry) => `${entry.cashEstimate || ''} ${entry.assets.join(' ')} ${entry.deltaSummary} ${entry.notes || ''}`),
    ...(payload.tradeLedger || []).map((entry) => `${entry.expectedValue} ${entry.worldStateImpact}`),
    ...(payload.relationships || []).map((entry) => `${entry.relationshipType} ${entry.notes || ''}`),
  ].join('\n'));
  const hasProgressionDividend = hasAny(dividendText, [
    'lãi',
    'lợi nhuận',
    'doanh thu',
    'vốn tăng',
    'thêm vốn',
    'khách hàng',
    'hợp đồng',
    'giấy phép',
    'quyền route',
    'quyền tuyến',
    'quyền xem',
    'quyền kiểm',
    'slot',
    'suất',
    'nguồn cung',
    'đòn bẩy',
    'uy tín',
    'trust',
    'dữ liệu giá',
    'ledger advantage',
    'route token',
    'priority',
    'ưu tiên',
    'bảo hộ',
    'quyền vận chuyển',
    'tài sản',
  ]);
  if (!hasProgressionDividend) {
    issues.push({
      code: 'focus_trade_dividend_missing',
      severity: 'major',
      message: 'Song Xuyen chapter must give MC a concrete trade/progression dividend, not only more pressure or suffering.',
    });
  }
  if (!payload.readerPayoff?.tradeDividend || !payload.readerPayoff?.progressionDelta) {
    issues.push({
      code: 'focus_reader_payoff_missing',
      severity: 'major',
      message: 'Song Xuyen continuity.json must include readerPayoff.tradeDividend and readerPayoff.progressionDelta so the chapter cannot pass as pure procedural suffering.',
    });
  }
  const riskOnlyText = normalize(`${payload.summary}\n${payload.mcState}\n${payload.cliffhanger}`);
  const riskSignals = countMatches(riskOnlyText, ['nguy cơ', 'rủi ro', 'bị', 'áp lực', 'đe dọa', 'bẩn', 'leak', 'mất', 'chưa sạch', 'khổ', 'trì hoãn']);
  const winSignals = countMatches(dividendText, ['lãi', 'lợi', 'vốn', 'khách', 'quyền', 'hợp đồng', 'uy tín', 'nguồn cung', 'dữ liệu giá', 'đòn bẩy', 'giấy phép', 'slot', 'ưu tiên']);
  if (riskSignals >= 4 && winSignals < 2) {
    issues.push({
      code: 'focus_risk_only_chapter',
      severity: 'major',
      message: 'Song Xuyen chapter reads risk-heavy without enough visible win signals. Revise toward trade/progression payoff.',
    });
  }
  const itemNames = new Set(payload.itemEvents.map((event) => normalize(event.itemName)));
  const economicText = normalize(payload.economicLedger.map((entry) => `${entry.assets.join(' ')} ${entry.deltaSummary}`).join('\n'));
  for (const trade of payload.tradeLedger || []) {
    const resource = normalize(trade.resourceName);
    if (!trade.source || !trade.cost || !trade.logisticsConstraint || !trade.worldStateImpact) {
      issues.push({
        code: 'focus_trade_entry_incomplete',
        severity: 'critical',
        message: `Trade ledger entry "${trade.resourceName}" must include source, cost, logisticsConstraint and worldStateImpact.`,
      });
    }
    if (!itemNames.has(resource) && !economicText.includes(resource)) {
      issues.push({
        code: 'focus_resource_without_source',
        severity: 'critical',
        message: `Trade resource "${trade.resourceName}" has no matching itemEvents/economicLedger source.`,
      });
    }
  }
  const critical = issues.some((issue) => issue.severity === 'critical');
  const major = issues.some((issue) => issue.severity === 'major');
  return {
    verdict: critical ? 'block' : major ? 'revise' : 'pass',
    focusKey: preset.key,
    issues,
  };
}

export function formatFocusPresetReport(report: FocusPresetValidationReport): string {
  const issueText = report.issues.length
    ? report.issues.map((issue) => `- [${issue.severity}] ${issue.code}: ${issue.message}`).join('\n')
    : '- ok';
  return [
    `Focus preset: ${report.focusKey} verdict=${report.verdict}`,
    'Issues:',
    issueText,
  ].join('\n');
}
