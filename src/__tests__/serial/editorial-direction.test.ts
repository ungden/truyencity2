import { zodToJsonSchema } from 'zod-to-json-schema';
import { CyclePlanSchema, PremiseSchema } from '@/services/serial/contracts';
import { buildCyclePlannerBrief, buildJudgeBrief, buildWriterBrief } from '@/services/serial/context';
import { activeRules, CRAFT_ROLES, craftBlock, playbook, setPlaybook, staleRules } from '@/services/serial/playbook';
import { CYCLE_PLANNER_SYSTEM_PROMPT, JUDGE_SYSTEM_PROMPT, PREMISE_SYSTEM_PROMPT, WRITER_SYSTEM_PROMPT } from '@/services/serial/prompts';
import { baseBible, cycle, premise } from './fixtures';

describe('reader-led editorial direction', () => {
  afterEach(() => setPlaybook(null));

  test('one shared direction reaches all four actual system prompts exactly once', () => {
    const direction = playbook().rules.find(rule => rule.id === 'reader_promise')!;
    expect(direction.role).toBe('shared');
    for (const prompt of [PREMISE_SYSTEM_PROMPT, CYCLE_PLANNER_SYSTEM_PROMPT, WRITER_SYSTEM_PROMPT, JUDGE_SYSTEM_PROMPT]) {
      expect(prompt.split(direction.text)).toHaveLength(2);
    }
    for (const role of CRAFT_ROLES) {
      expect(activeRules(role).filter(rule => rule.id === direction.id)).toHaveLength(1);
    }
    const stale = staleRules(0, new Date('2026-09-20'));
    expect(stale.filter(rule => rule.id === direction.id)).toHaveLength(1);
  });

  test('shared rules honor retirement and role-specific rules remain isolated', () => {
    const current = playbook();
    setPlaybook({ ...current, rules: current.rules.map(rule => rule.role === 'shared' ? { ...rule, status: 'retired' } : rule) });
    for (const role of CRAFT_ROLES) expect(craftBlock(role)).not.toContain('LỜI HỨA VỚI ĐỘC GIẢ');
    expect(craftBlock('judge')).not.toContain('MỞ CHƯƠNG');
    expect(craftBlock('writer')).not.toContain('CHU KỲ LÀ MỘT LỜI HỨA');
  });

  test('replaces the old incentives rather than appending an exception to them', () => {
    const prompts = [PREMISE_SYSTEM_PROMPT, CYCLE_PLANNER_SYSTEM_PROMPT, WRITER_SYSTEM_PROMPT, JUDGE_SYSTEM_PROMPT].join('\n');
    for (const oldDirection of [
      'Đẩy nó xấu đi qua ba đến sáu bước',
      'bị giữ lại, bị từ chối hoặc bị đe doạ trước khi được trao',
      'Mỗi quyển phải nhích lên một bậc',
      'TUYỆT ĐỐI KHÔNG thiết kế kim thủ chỉ quay lại cắn chủ nhân',
    ]) expect(prompts).not.toContain(oldDirection);
    expect(CYCLE_PLANNER_SYSTEM_PROMPT).toContain('khám phá → thử thành công');
    expect(JUDGE_SYSTEM_PROMPT).toContain('công dụng mới, phần thưởng, phản ứng, cơ hội');
  });

  test('positive and adversarial hooks both survive the model output contract', () => {
    for (const kind of ['opportunity', 'reward', 'reveal', 'threat', 'question', 'declaration'] as const) {
      const plan = cycle();
      plan.beatSheets[0].endHookKind = kind;
      plan.pressure = 'Khách muốn đặt thêm một nghìn món sau khi thấy mẫu thử.';
      plan.escalation = ['Mẫu thử được công nhận', 'Đối tác giới thiệu khách mới', 'Đơn hàng mở ra thị trường lớn'];
      expect(CyclePlanSchema.parse(plan).beatSheets[0].endHookKind).toBe(kind);
    }
    const modelSchema = JSON.stringify(zodToJsonSchema(CyclePlanSchema));
    expect(modelSchema).toContain('cơ hội, mục tiêu nhân vật muốn đạt');
    expect(modelSchema).toContain('khám phá, thành công, phản ứng');
    expect(modelSchema).toContain('"nghien_ep"');
    expect(modelSchema).not.toContain('"nghiền ép"');
    expect(JSON.stringify(zodToJsonSchema(PremiseSchema))).toContain('Tham vọng và cách sống');
  });

  test('writer, planner and judge receive the approved reader fantasy', () => {
    const bible = baseBible();
    const plan = cycle();
    const writer = buildWriterBrief({ premise, bible, cycle: plan, chapterNumber: 8, previousChapter: null });
    const judge = buildJudgeBrief({ premise, bible, cycle: plan, chapterNumber: 8, title: 'Một đơn hàng lớn', prose: 'Nội dung thử.' });
    const planner = buildCyclePlannerBrief({ premise, bible, previousCycle: plan, cycleNumber: 3, volumeNumber: 1, startChapter: 17, steering: [] });
    expect(writer.truyen.readerFantasy).toBe(premise.readerFantasy);
    expect(judge.readerFantasy).toBe(premise.readerFantasy);
    expect(judge.kimThuChi).toEqual({ ten: premise.goldenFinger.name, luat: premise.goldenFinger.rule, phamVi: premise.goldenFinger.scope });
    expect(judge.kimThuChi).not.toHaveProperty('evolution');
    expect(planner.truyen.readerFantasy).toBe(premise.readerFantasy);
    expect(planner.nguonDoiKhang).toBe(premise.oppositionEngine);
    expect(writer.dongLucChuKy).toBe(plan.pressure);
  });

  test('a rolling planner receives the active cycle promise it must finish', () => {
    const active = cycle();
    const planner = buildCyclePlannerBrief({
      premise, bible: baseBible(), previousCycle: null, activeCycle: active,
      cycleNumber: active.cycleNumber, volumeNumber: active.volumeNumber,
      startChapter: active.startChapter + 2, steering: [],
    });
    expect(planner.chuKyDangViet).toEqual(expect.objectContaining({
      dongLuc: active.pressure,
      vongKhachHang: active.customerLoop,
      chuongKetThuc: active.plannedEndChapter,
    }));
  });
});
