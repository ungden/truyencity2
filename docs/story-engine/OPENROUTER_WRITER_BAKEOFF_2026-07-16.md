# OpenRouter writer bake-off — 2026-07-16

## Scope

This is a preliminary Writer-role screen, not a production route decision. Ten models wrote chapter one from the same typed `StorySpecV2`, `ChapterPlanV2`, `StoryStateV2`, Writer system prompt and strict JSON contract for each of three prepared flagship kernels (`HX-04`, `TH-01`, `DT-11`). Model names were hidden behind deterministic candidate IDs. Gemini 3.1 Pro and GPT-5.6 Luna Pro independently judged all schema-valid candidates on seven reading-quality axes.

Latency was measured but excluded from ranking. The operating target is only 20–30 chapters per story per day, so the useful trade-off is quality, contract reliability and cost per accepted chapter. The run produced 30 writer outputs and six blind ballots. Standardized generation cost was about $1.02; judge cost was about $0.74.

Target length was 1,200 Vietnamese whitespace-delimited words, with an acceptable measurement band of 900–1,500. Length is a compliance signal, not a claim that 1,200 words is intrinsically ideal.

## Standardized three-kernel result

| Model | Blind axes /10 | Mean rank | First-place votes | Avg. writer cost | Est. 30 chapters | Avg. words | Length pass |
|---|---:|---:|---:|---:|---:|---:|---:|
| `openai/gpt-5.6-luna` | 8.59 | 2.00 | 3 | $0.0236 | $0.71 | 1,689 | 0/3 |
| `openai/gpt-5.6-luna-pro` | 8.19 | 2.50 | 1 | $0.0966 | $2.90 | 1,621 | 0/3 |
| `z-ai/glm-5.2` | 7.45 | 3.50 | 1 | $0.0152 | $0.46 | 1,288 | 3/3 |
| `qwen/qwen3.7-max` | 7.15 | 4.50 | 1 | $0.0364 | $1.09 | 1,761 | 1/3 |
| `google/gemini-3.1-pro-preview` | 7.12 | 4.33 | 0 | $0.0748 | $2.24 | 1,589 | 1/3 |
| `google/gemini-3.5-flash` | 6.67 | 5.00 | 0 | $0.0545 | $1.64 | 1,515 | 2/3 |
| `qwen/qwen3.7-plus` | 5.95 | 7.33 | 0 | $0.0109 | $0.33 | 1,882 | 1/3 |
| `x-ai/grok-4.5` | 5.65 | 7.83 | 0 | $0.0241 | $0.72 | 896 | 1/3 |
| `tencent/hy3:free` | 4.96 | 8.50 | 0 | $0.0000 | $0.00 | 846 | 1/3 |
| `google/gemini-3.1-flash-lite` | 4.20 | 9.50 | 0 | $0.0042 | $0.13 | 864 | 1/3 |

The cost estimate covers the successful Writer call only. It excludes Director, Editor, revision, embeddings, retries and infrastructure.

## Interpretation

- `gpt-5.6-luna` is the best primary Writer candidate from this screen. It led on all three kernels and cost roughly one quarter of Luna Pro. Its consistent over-length output must be corrected before production, ideally by a more explicit scene/word budget rather than destructive truncation.
- `glm-5.2` is the strongest cost-controlled challenger. It was the only model inside the length band on all three standardized runs and was especially competitive on `TH-01`. An earlier diagnostic run exhausted its response budget on hidden reasoning and failed the exact schema, so it needs a longer no-fallback soak before being trusted as primary.
- `qwen3.7-max` can be excellent for the right kernel: it challenged for first on `HX-04` and remained strong on `DT-11`, but fell sharply on `TH-01` and often over-wrote. It is a story-specific challenger, not a global default.
- `gpt-5.6-luna-pro` did not justify its reasoning overhead for prose. OpenRouter describes it as Luna with Pro reasoning mode; equal list pricing did not produce equal request cost because the Pro route consumed far more reasoning tokens. It should not replace standard Luna as Writer based on this evidence.
- `qwen3.7-plus`, `grok-4.5`, `hy3:free` and Flash Lite are not Writer candidates under the current flagship contract. Their low price or speed did not compensate for weaker scene quality, short/long drift and causal or prose defects. The free Hy3 route is also temporary.
- Gemini 3.1 Pro and 3.5 Flash remain candidates for structured Director/Editor work, but this Writer-only run does not establish that role. They should be tested on role-specific contracts rather than inferred from prose ranking.

## Locked recommendation from this screen

1. Keep production routes unchanged.
2. Advance `gpt-5.6-luna`, `glm-5.2` and `qwen3.7-max` to a ten-brief Writer semifinal with human blind preference ballots.
3. Add a story-specific challenger selection: every new kernel can compare the primary Writer against one challenger before chapter one, without creating a content fallback.
4. Do not use Luna and Luna Pro as the nominally independent Writer and Editor pair; they are variants of the same underlying model family.
5. Benchmark Director and Editor separately with their exact schemas. A prose winner must not automatically own planning or publication judgment.

## Reproduction

```bash
OPENROUTER_API_KEY=... npm run flagship:providers:bakeoff -- \
  --slots=hx-04,th-01,dt-11 \
  --judges=google/gemini-3.1-pro-preview,openai/gpt-5.6-luna-pro \
  --output=/tmp/truyencity-provider-bakeoff.json
```

The command writes raw prose and judge evidence only to the requested output path. The API key is read from process environment and is never loaded from a repository file.

## Provider references

- [GLM 5.2 on OpenRouter](https://openrouter.ai/z-ai/glm-5.2)
- [Tencent Hy3 free on OpenRouter](https://openrouter.ai/tencent/hy3%3Afree)
- [Qwen models on OpenRouter](https://openrouter.ai/qwen)
- [Qwen 3.7 Plus vs Max](https://openrouter.ai/compare/qwen/qwen3.7-plus/qwen/qwen3.7-max)
- [Grok 4.5 on OpenRouter](https://openrouter.ai/x-ai/grok-4.5)
- [GPT-5.6 Luna on OpenRouter](https://openrouter.ai/openai/gpt-5.6-luna)
- [GPT-5.6 Luna Pro on OpenRouter](https://openrouter.ai/openai/gpt-5.6-luna-pro)
