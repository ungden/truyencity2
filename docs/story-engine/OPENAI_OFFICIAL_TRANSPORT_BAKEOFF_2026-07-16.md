# OpenAI official transport bake-off — 2026-07-16

## Scope

This follow-up isolates transport and reasoning mode for the leading Writer candidate from the provider screen. The same three flagship kernels (`HX-04`, `TH-01`, `DT-11`) and the same typed `StorySpecV2`, `ChapterPlanV2`, `StoryStateV2`, Writer prompt, strict JSON schema and 1,200-word target were used for four routes:

- OpenAI official Responses API: `gpt-5.6-luna`, standard mode, medium effort.
- OpenAI official Responses API: `gpt-5.6-luna`, `reasoning.mode: "pro"`, medium effort.
- OpenRouter: `openai/gpt-5.6-luna` from the standardized provider run.
- OpenRouter: `openai/gpt-5.6-luna-pro` from the standardized provider run.

Candidate identity and transport were hidden behind deterministic IDs. `gpt-5.6-sol` and `gpt-5.6-terra`, both called through OpenAI official with high reasoning effort, independently scored seven reading-quality axes and produced six blind rankings. Latency was recorded but excluded from the decision because the factory target is quality/cost at 20–30 chapters per story per day.

The official calls used `store: false`. The API key was supplied only through process environment and is not loaded from or written to the repository.

## Result

| Route | Blind axes /10 | Mean rank | First-place votes | Avg. writer cost | Est. 30 chapters | Avg. words |
|---|---:|---:|---:|---:|---:|---:|
| OpenAI official, Pro | 8.06 | 2.33 | 1 | $0.0803 | $2.41 | 1,694 |
| OpenRouter, standard | 8.05 | 2.33 | 2 | $0.0236 | $0.71 | 1,689 |
| OpenAI official, standard | 7.88 | 2.33 | 1 | $0.0263 | $0.79 | 1,654 |
| OpenRouter, Pro | 7.75 | 3.00 | 2 | $0.0966 | $2.90 | 1,621 |

The axis difference between official Pro and OpenRouter standard was only 0.014/10. The three non-OpenRouter-Pro routes had the same mean rank. With three kernels and six ballots, this is evidence of practical quality parity between the standard transports, not proof that one transport intrinsically writes better.

OpenRouter standard happened to cost slightly less in this small run because the generated responses consumed different token counts. That stochastic request-level result should not be interpreted as a lower underlying model price.

## Token evidence

Official standard averaged about 6.8K input tokens and 3.0K output tokens per chapter. Official Pro performed much more internal work: roughly 36.6K–39.3K input tokens and 9.6K–10.8K output tokens per chapter, including 1.4K–2.6K reasoning tokens. Its average Writer cost was about 3.1 times official standard without a material blind-preference gain.

OpenAI documents Luna at $1.00/M input, $0.10/M cached input and $6.00/M output tokens, with GPT-5.6 cache writes billed at 1.25 times uncached input. The calculation in the runner uses the returned `cached_tokens` and `cache_write_tokens` rather than treating all input tokens as equal.

The two independent judges cost $1.0346 in total. That is evaluation expense, not part of the per-chapter production estimate.

## Editorial findings

- Official Pro sometimes improved local causal mechanics, especially on `HX-04`, but remained over-length and did not consistently improve hooks or continuity.
- Official standard produced a good balance of prose and mechanics but still showed isolated domain/causal contradictions.
- OpenRouter standard won both `DT-11` ballots and handled its scoped capability and refusal causality best, but it also over-wrote and missed a required state delta on another kernel.
- OpenRouter Pro won both `TH-01` ballots yet ranked last on both other kernels and introduced plan/continuity failures. Its story-specific win does not justify a global Pro route.
- All four routes exceeded the upper 1,500-word measurement band on average. The next prompt change should allocate words per scene and require a compact transition budget; output must not be repaired by truncation or prose fallback.

## Decision

1. Use OpenAI official `gpt-5.6-luna` in standard mode with medium effort as the production Writer candidate.
2. Keep OpenRouter for challenger models and offline model research, not as the default OpenAI transport.
3. Do not enable Pro for routine Writer calls. OpenAI's own guidance recommends standard mode for high-volume work when representative evaluations do not show a meaningful Pro gain, which matches this run.
4. Preserve the hard no-fallback rule. Provider or billing errors become `infra_blocked`; the factory must not silently switch transport or model.
5. Do not change the live production route from this three-kernel screen. First complete a ten-brief human blind semifinal and a role-specific Director/Editor benchmark.

The direct route is recommended despite current output-quality parity because it provides the native Responses contract, direct usage/cache fields, `store: false`, explicit prompt-cache controls and Batch API access without an extra routing layer. OpenAI documents Batch as asynchronous processing with a 50% discount and a 24-hour completion window, which fits non-urgent factory work once the sequential chapter/state dependencies are handled safely.

## Reproduction

The script reuses the standardized OpenRouter Luna outputs supplied by `--openrouter-results` and creates new official outputs and blind ballots:

```bash
OPENAI_API_KEY=... npm run flagship:openai:transport-bakeoff -- \
  --slots=hx-04,th-01,dt-11 \
  --openrouter-results=/tmp/truyencity-provider-bakeoff-hx04-v2.json,/tmp/truyencity-provider-bakeoff-th-dt.json \
  --output=/tmp/truyencity-openai-transport-bakeoff.json
```

The output contains prose, anonymous ballots, model usage and estimated cost. It does not change a project, provider route or database row.

## Official references

- [OpenAI GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI GPT-5.6 Luna model and pricing](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- [OpenAI Batch API](https://developers.openai.com/api/docs/guides/batch)
