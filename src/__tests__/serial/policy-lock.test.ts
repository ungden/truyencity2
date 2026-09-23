import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertSerialLaunchable, HARD_CONTINUITY_KINDS, OpeningAuditProviderSchema, premiseLint, processDensity,
  processProseFindings, PROCESS_DENSITY_LIMIT, SOFT_CONTINUITY_KINDS,
} from '@/services/serial/contracts';
import {
  CYCLE_PLANNER_SYSTEM_PROMPT, EXTRACTOR_SYSTEM_PROMPT, JUDGE_SYSTEM_PROMPT, OPENING_AUDITOR_SYSTEM_PROMPT,
  PREMISE_SYSTEM_PROMPT, WRITER_SYSTEM_PANEL_RULE, WRITER_SYSTEM_PROMPT,
} from '@/services/serial/prompts';
import { activeRules, antiPayoffViolations, playbook, PlaybookSchema } from '@/services/serial/playbook';
import { SERIAL_PREMISE_CATALOG } from '@/services/serial/catalog';

/**
 * The failure this engine was built to escape has come back four times — story-engine,
 * factory v1, the factory "Faloo correction", Serial v3 — and every time through a fix
 * that sounded reasonable: forbid an event, gate on arithmetic, add one more rule. These
 * tests lock the structure so the next such fix fails CI instead of shipping.
 * docs/WRITING_SYSTEM_AUDIT_2026-09-23.md explains each lock.
 */

const PROMPTS = {
  WRITER_SYSTEM_PROMPT, WRITER_SYSTEM_PANEL_RULE, JUDGE_SYSTEM_PROMPT, EXTRACTOR_SYSTEM_PROMPT,
  OPENING_AUDITOR_SYSTEM_PROMPT, CYCLE_PLANNER_SYSTEM_PROMPT, PREMISE_SYSTEM_PROMPT,
};

describe('policy lock: payoffs are never forbidden', () => {
  test('no prompt tells a model to avoid or excuse the genre payoffs', () => {
    for (const [name, text] of Object.entries(PROMPTS)) {
      expect({ name, violations: antiPayoffViolations(text) }).toEqual({ name, violations: [] });
    }
  });

  test('the retired lived-causality sentences are recognised, so they cannot return', () => {
    expect(antiPayoffViolations('Không tự thêm khách hàng, đám đông, cấp bậc hay giao dịch để tạo vẻ tiến triển.')).not.toEqual([]);
    expect(antiPayoffViolations('Không phạt cảnh vì thiếu giao dịch, tăng cấp, tên mới hay payoff vật chất.')).not.toEqual([]);
    expect(antiPayoffViolations('Không đòi chương 1 phải kiếm tiền hay có cấp bậc.')).not.toEqual([]);
    expect(antiPayoffViolations('Đây là chương phát hiện lợi thế, chưa phải lúc ép payoff thương mại.')).not.toEqual([]);
  });

  test('a playbook carrying such a rule is rejected at load', () => {
    const poisoned = structuredClone(playbook());
    poisoned.rules[0] = { ...poisoned.rules[0], text: `${poisoned.rules[0].text}\nKhông tự thêm giao dịch để tạo vẻ tiến triển.` };
    expect(PlaybookSchema.safeParse(poisoned).success).toBe(false);
  });

  test('the measured Faloo rules stay active', () => {
    const active = new Set([...activeRules('writer'), ...activeRules('planner'), ...activeRules('premise')].map(rule => rule.id));
    for (const id of [
      'open_on_desire', 'end_on_expectation', 'one_named_thing', 'chapter_title_is_a_line',
      'activate_in_chapter_one', 'title_promise_pays_early', 'cycle_fulfills_desire',
    ]) expect(active.has(id)).toBe(true);
  });
});

describe('policy lock: arithmetic never discards a chapter', () => {
  test('number and provenance slips are soft; plot holes are the only hard findings', () => {
    expect(SOFT_CONTINUITY_KINDS).toEqual(expect.arrayContaining(['transaction_contradiction', 'resource_provenance', 'process_prose', 'meta_leak']));
    for (const kind of SOFT_CONTINUITY_KINDS) expect(HARD_CONTINUITY_KINDS as readonly string[]).not.toContain(kind);
    expect(HARD_CONTINUITY_KINDS.length).toBeLessThanOrEqual(8);
  });

  test('the opening auditor cannot return inventory findings', () => {
    const kinds = OpeningAuditProviderSchema.safeParse({
      passed: false, summary: 's',
      findings: [{ kind: 'inventory_arithmetic', chapterNumber: 1, quote: 'abcd', explain: 'x', repair: 'y' }],
    });
    expect(kinds.success).toBe(false);
    expect(OPENING_AUDITOR_SYSTEM_PROMPT).not.toMatch(/Sổ giao dịch chuẩn|cộng trừ khớp/);
  });

  test('the extractor is not asked to count anything', () => {
    expect(EXTRACTOR_SYSTEM_PROMPT).toMatch(/assetEvents luôn để mảng rỗng/);
  });
});

describe('policy lock: the rule count only goes down', () => {
  // 43 on 2026-09-23. Adding a rejection rule means removing one: every engine here
  // died by accumulating them. Lower this number when you delete rules.
  const RULE_BUDGET = 43;

  test(`the serial engine has at most ${RULE_BUDGET} distinct rejection codes`, () => {
    const dir = 'src/services/serial';
    const codes = new Set<string>();
    for (const file of readdirSync(dir).filter(name => name.endsWith('.ts'))) {
      const source = readFileSync(join(dir, file), 'utf8');
      for (const match of source.matchAll(/(?:fail|SerialStateError)\('([a-z_]+)'/g)) codes.add(match[1]);
    }
    expect(codes.size).toBeLessThanOrEqual(RULE_BUDGET);
  });
});

describe('policy lock: the premise cannot smuggle process in', () => {
  test('only schema v2 launches, and every catalog package passes the premise lint', () => {
    for (const { id, premise } of SERIAL_PREMISE_CATALOG) {
      expect({ id, problems: premiseLint(premise) }).toEqual({ id, problems: [] });
      expect(() => assertSerialLaunchable(premise)).not.toThrow();
    }
  });

  test('bookkeeping ledgers and postponed promises are rejected', () => {
    const [{ premise }] = SERIAL_PREMISE_CATALOG;
    const ledger = premise.worldKernel.openingLedger.map((entry, index) => index === 0
      ? { ...entry, consideration: 'Ghi có mười một tín dụng cho đội, không phát sinh phí.' }
      : entry);
    const accounting = { ...premise, worldKernel: { ...premise.worldKernel, openingLedger: ledger } };
    expect(premiseLint(accounting).join(' ')).toMatch(/sổ kế toán/);
    const postponed = { ...premise, hook: 'Trước khi bán công pháp, hắn phải hiểu người bên kia sống bằng gì.' };
    expect(premiseLint(postponed).join(' ')).toMatch(/trì hoãn lời hứa/);
  });
});

describe('policy lock: ledger prose is measured, not debated', () => {
  const pilot = (name: string) => readFileSync(`factory/serial/song-xuyen/private/runs/${name}`, 'utf8');

  test('the inspection-log chapter that started the audit is caught', () => {
    const chapter = pilot('cua-hang-cong-phap-v4-ch01-10/chapter-010.md');
    expect(processDensity(chapter)).toBeGreaterThan(PROCESS_DENSITY_LIMIT);
    expect(processProseFindings(chapter).length).toBeGreaterThan(0);
  });

  test('a Faloo-shaped opening chapter passes', () => {
    const chapter = pilot('cua-hang-cong-phap-v5-faloo-ch01-04/chapter-001.md');
    expect(processDensity(chapter)).toBeLessThan(PROCESS_DENSITY_LIMIT);
    expect(processProseFindings(chapter)).toEqual([]);
  });
});
