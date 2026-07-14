import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { callGemini } from '../src/services/story-engine/utils/gemini';
import { ConceptTournamentArtifactV2Schema } from '../src/services/story-engine/flagship/setup-contracts';
import { FlagshipModelRoutesV2Schema } from '../src/services/story-engine/flagship/model-routes';
import { BlindSlotReviewV1Schema, rankBlindSlotReview, type BlindSlotReviewV1 } from '../src/services/story-engine/flagship/portfolio-opening-review';
import { toGeminiResponseJsonSchema } from '../src/services/story-engine/flagship/setup-response-schemas';

const root = process.cwd();
const outputRoot = path.join(root, 'blueprints/flagship-portfolio-v1/tournaments');
const routes = FlagshipModelRoutesV2Schema.parse(JSON.parse(readFileSync(path.join(root, 'blueprints/flagship-portfolio-v1/model-routes-v2.json'), 'utf8')));
const responseJsonSchema = toGeminiResponseJsonSchema(BlindSlotReviewV1Schema);
const requested = process.argv.find(value => value.startsWith('--slot='))?.slice('--slot='.length) || 'all';
const allSlotIds = ['DT-03', 'DT-05', 'DT-11', 'DT-13', 'HX-01', 'HX-04', 'HX-05', 'TH-01', 'TH-03'];
const slotIds = requested === 'all' ? allSlotIds : requested.split(',').map(value => value.trim()).filter(Boolean);

const systemPrompt = `Bạn là biên tập viên độc lập chấm opening truyện dài bằng tiếng Việt.
Bạn không biết model, điểm Concept Judge, tên concept hoặc thứ hạng trước đó. Chỉ chấm những gì thực sự có trong ba chương.
Điểm 5 cần evidence rõ; không thưởng cho lời tự tuyên bố, từ khóa hook, người xung quanh kinh ngạc hoặc văn hoa sáo.
Critical fail chỉ đánh khi có bằng chứng thật, không dùng để phạt sở thích thể loại.
span phải sao chép nguyên văn một đoạn ngắn từ prose và reason giải thích quan hệ với axis.
Chỉ trả JSON theo structured schema.`;

function blindCode(slotId: string, index: number): string {
  return `${slotId.replace('-', '')}-${String.fromCharCode(65 + index)}`;
}

function jsonFile(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function reviewPrompt(slotId: string, artifact: ReturnType<typeof ConceptTournamentArtifactV2Schema.parse>): { prompt: string; openingByCode: Map<string, typeof artifact.openings[number]> } {
  const openingByCode = new Map<string, typeof artifact.openings[number]>();
  const reviewSet = artifact.openings.map((opening, index) => {
    const code = blindCode(slotId, index);
    openingByCode.set(code, opening);
    return {
      blindCode: code,
      chapters: [...opening.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber).map(chapter => ({
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        paragraphs: chapter.prose.split(/\n\n+/).map((text, paragraphIndex) => ({
          paragraphId: `${code}-C${chapter.chapterNumber}-P${paragraphIndex + 1}`,
          text,
        })),
      })),
    };
  });
  return {
    prompt: `REVIEW_SET=${JSON.stringify(reviewSet)}\n\nChấm đủ ba blindCode đúng một lần. Mỗi ballot cần evidence cho ít nhất hai axis; muốn cho 4-5 điểm phải chỉ ra state change, lựa chọn hoặc giọng nhân vật cụ thể. Mỗi evidence.span phải copy/paste một substring Unicode liên tục từ text của đúng paragraph, không sửa chữ, không chuẩn hóa dấu, không thêm dấu ba chấm và không paraphrase.`,
    openingByCode,
  };
}

function validateEvidence(review: BlindSlotReviewV1, openingByCode: Map<string, ReturnType<typeof ConceptTournamentArtifactV2Schema.parse>['openings'][number]>): void {
  const expected = [...openingByCode.keys()].sort();
  const actual = review.ballots.map(ballot => ballot.blindCode).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error(`Review ballot coverage mismatch: expected ${expected.join(', ')}, got ${actual.join(', ')}.`);
  for (const ballot of review.ballots) {
    const opening = openingByCode.get(ballot.blindCode)!;
    for (const evidence of ballot.evidence) {
      const chapter = opening.chapters.find(item => item.chapterNumber === evidence.chapterNumber);
      if (!chapter?.prose.includes(evidence.span)) throw new Error(`${ballot.blindCode} evidence span is not present verbatim in chapter ${evidence.chapterNumber}.`);
    }
  }
}

async function reviewSlot(slotId: string): Promise<BlindSlotReviewV1> {
  const slotRoot = path.join(outputRoot, slotId.toLowerCase());
  const reviewPath = path.join(slotRoot, 'editorial-review.json');
  if (existsSync(reviewPath)) return BlindSlotReviewV1Schema.parse(JSON.parse(readFileSync(reviewPath, 'utf8')));
  const artifact = ConceptTournamentArtifactV2Schema.parse(JSON.parse(readFileSync(path.join(slotRoot, 'tournament.json'), 'utf8')));
  const { prompt, openingByCode } = reviewPrompt(slotId, artifact);
  const promptHash = createHash('sha256').update(JSON.stringify({ model: routes.setupJudge, systemPrompt, prompt, responseJsonSchema })).digest('hex');
  const checkpointPath = path.join(slotRoot, 'checkpoints', 'editorial_review.json');
  let content: string;
  if (existsSync(checkpointPath)) {
    const cached = JSON.parse(readFileSync(checkpointPath, 'utf8')) as { promptHash?: string; content?: string };
    if (cached.promptHash === promptHash && cached.content) content = cached.content;
    else content = '';
  } else content = '';
  if (!content) {
    console.log(`[${slotId}] blind editorial review via ${routes.setupJudge}`);
    const response = await callGemini(prompt, {
      model: routes.setupJudge,
      temperature: 0.35,
      maxTokens: 16384,
      thinkingLevel: 'high',
      responseJsonSchema,
      systemPrompt,
    }, { jsonMode: true, disableRouting: true });
    if (response.finishReason === 'MAX_TOKENS') throw new Error(`${slotId} editorial review infra_blocked: MAX_TOKENS.`);
    content = response.content;
    jsonFile(checkpointPath, { schemaVersion: 1, slotId, model: routes.setupJudge, promptHash, content });
  }
  const review = BlindSlotReviewV1Schema.parse(JSON.parse(content));
  validateEvidence(review, openingByCode);
  jsonFile(reviewPath, review);
  return review;
}

async function main(): Promise<void> {
  for (const slotId of slotIds) await reviewSlot(slotId);
  const available = allSlotIds.filter(slotId => existsSync(path.join(outputRoot, slotId.toLowerCase(), 'editorial-review.json')));
  const rankedSlots = available.map(slotId => {
    const review = BlindSlotReviewV1Schema.parse(JSON.parse(readFileSync(path.join(outputRoot, slotId.toLowerCase(), 'editorial-review.json'), 'utf8')));
    const winner = rankBlindSlotReview(review)[0];
    return { slotId, winnerBlindCode: winner.blindCode, score: winner.score, criticalFails: winner.criticalFails, confidence: winner.confidence, summary: winner.summary };
  });
  const choose = (prefix: string) => rankedSlots.filter(item => item.slotId.startsWith(prefix) && item.criticalFails.length === 0).sort((a, b) => b.score - a.score || b.confidence - a.confidence)[0] || null;
  const recommendation = {
    schemaVersion: 1,
    status: available.length === 9 ? 'awaiting_human_portfolio_selection' : 'review_incomplete',
    reviewedSlots: available.length,
    recommendedFinalists: [choose('HX-'), choose('TH-'), choose('DT-')],
    rankedSlots: rankedSlots.sort((a, b) => b.score - a.score),
    humanGateRequired: true,
    storySpecsMaterialized: 0,
    productionWrites: 0,
  };
  jsonFile(path.join(root, 'blueprints/flagship-portfolio-v1/portfolio-recommendation.json'), recommendation);
  const lines = ['# Khuyến nghị blind review 9 → 3', '', `Trạng thái: **${recommendation.status}**`, '', '| Nhánh | Slot | Opening | Điểm |', '| --- | --- | --- | ---: |'];
  for (const [lane, item] of [['Huyền huyễn', recommendation.recommendedFinalists[0]], ['Tiên hiệp mới', recommendation.recommendedFinalists[1]], ['Commercial', recommendation.recommendedFinalists[2]]] as const) lines.push(`| ${lane} | ${item?.slotId || 'blocked'} | ${item?.winnerBlindCode || 'blocked'} | ${item?.score ?? '-'} |`);
  lines.push('', 'Đây là khuyến nghị AI có evidence, không thay thế human gate. Chưa có StorySpec hoặc chapter production nào được materialize.', '');
  writeFileSync(path.join(root, 'blueprints/flagship-portfolio-v1/portfolio-recommendation.md'), `${lines.join('\n').trimEnd()}\n`, 'utf8');
  console.log(JSON.stringify(recommendation, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
