# Blind literary A/B — 2026-08-25

## Decision

The current literary change is **not proven better**. On this live four-chapter sample,
the new window lost the blinded comparison by one vote and scored slightly below the old
window on every reading dimension. Keep the operational retry/cost fixes, but do not claim
that prose quality has moved above the previous 6.5–7/10 band yet.

Production benchmark run: `ee47237e-c477-42c3-805c-745a7ad23d02`  
Protocol: `story-factory-live-literary-ab-v1`

## Frozen sample

- Novel: `Làng Biển 1988: Từ Bốn Con Mồi Giả Đến Vua Câu Mực`
- Baseline: chapters 29–32; revisions `rev_7c72d3fd574cd31d` and
  `rev_414ab24d3962952f`.
- Candidate: chapters 34–37; exact revision `rev_cba042d52d8901d9`.
- Comparisons: four position-matched chapter reads plus one sequential four-chapter-window
  read.
- Judges: `gemini-2.5-pro`, `gemini-3.5-flash`, `gpt-5.6-luna`.
- Each judge saw only the public premise, prose and each version's own preceding tail.
  Plan, state, Editor findings, revision and cost were hidden. A/B assignment was swapped
  deterministically per comparison and model.
- Total: 15 independent verdicts; no failed or retried judge calls; cost `$0.274069`.

## Results

| Metric | Candidate | Baseline | Delta |
|---|---:|---:|---:|
| Preference votes | 7 | 8 | -1 |
| Wants to read next | 60.0% | 66.7% | -6.7 pp |
| Pull | 7.600 | 8.000 | -0.400 |
| Character voice | 7.667 | 8.000 | -0.333 |
| Specificity | 8.400 | 8.467 | -0.067 |
| Rhythm | 7.267 | 7.733 | -0.466 |
| Low repetition | 7.333 | 7.533 | -0.200 |
| Overall | 7.667 | 7.933 | -0.266 |

Vote split by judge:

| Judge | Candidate | Baseline | Window vote |
|---|---:|---:|---|
| Gemini 2.5 Pro | 2 | 3 | Baseline |
| Gemini 3.5 Flash | 3 | 2 | Candidate |
| GPT-5.6 Luna | 2 | 3 | Baseline |

## What readers consistently noticed

1. **The candidate moved from immediate human conflict into abstract business structure
   too quickly.** Baseline chapters kept Ba Cẩn physically present and made debt, fuel,
   access and allegiance change through visible confrontations. Candidate chapters spent
   more time discussing cold storage, standards, contracts and the next distribution tier.
2. **The same concepts became dialogue and narration slogans.** Judges repeatedly called
   out `giữ luồng`, `giữ chuẩn`, `bảy con mồi`, and the idea of intact/standardized goods.
   Explanations often repeated a point already established in the previous chapter.
3. **The candidate's dramatic engine was less varied.** Negotiation, standard-setting and
   process explanation displaced costly choices or direct opposition in several scenes.
4. **Titles repeated their frame.** Three of four candidate titles reused `giá`; two began
   `Cái Giá`. The baseline four titles had four distinct dramatic images.

Simple text telemetry supports the blind comments without acting as a quality gate:

- Candidate: 7,445 tokenized words versus baseline 9,561 (22.1% shorter). This does not
  justify a length minimum; it only explains part of the reduced scene development.
- `kho lạnh`: candidate 9 occurrences, baseline 2.
- `giữ luồng`: candidate 4, baseline 0.
- `bảy con`: candidate 8, baseline 1.
- `Ba Cẩn`: candidate 17, baseline 51, consistent with the shift away from direct local
  opposition.
- Candidate repeated the attribution pattern `Hải Đông Lạnh đáp` four times in the shorter
  window.

## Limits

This is a directional test, not a promotion gate. It uses four candidate chapters rather
than the intended ten, compares adjacent story phases rather than identical frozen plans,
and uses model readers instead of humans. The baseline also spans two old revisions. The
7–8 vote split is too close for a broad statistical claim, but it is enough to reject the
claim that the candidate is already clearly better.

The next valid acceptance test is a fresh 10-chapter candidate window after correcting the
planning tendency toward abstract scale and repeated concepts, using the same blind protocol
plus human editorial votes. Existing published chapters should not be regenerated merely to
make the benchmark pass.
