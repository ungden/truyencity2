# Scalability Integration Guide - 1000-2000 Chapters

## Overview

This guide explains how to integrate all 4 phases of scalability improvements into the story writing system.

## Architecture Changes

### Before (Original System)
```
Story Writing Flow:
1. Story Planning (3-tier outline)
2. Chapter-by-Chapter Writing
   - Memory: Recent 3 chapters + Current Arc
   - Context: ~900 tokens
   - Issues: Forgets threads from 100+ chapters ago
```

### After (With All 4 Phases)
```
Story Writing Flow:
1. Story Planning (3-tier outline)
2. Milestone Validations (Ch.100, 500, 1000...)
3. Chapter-by-Chapter Writing
   - Phase 1: Smart Thread Selection (Top 5 threads)
   - Phase 2: Volume Summaries (Relevant volumes)
   - Phase 3: Rule Suggestions (Context-aware rules)
   - Phase 4: Quality Validation
   - Context: ~1200 tokens (optimized)
   - Remembers: Everything important from Ch.1 to Ch.2000
```

## Phase 1: Plot Thread Manager

### What It Does
- Selects top 5 most relevant plot threads for each chapter
- Tracks thread lifecycle (Open → Developing → Climax → Resolved → Legacy)
- Auto-generates character recaps for returning characters (>50 chapters absence)
- Detects abandoned threads (>100 chapters inactive)

### Integration Code

```typescript
import { PlotThreadManager } from './story-writing-factory';

// Initialize
const threadManager = new PlotThreadManager(projectId);
await threadManager.initialize();

// Before writing each chapter
const threadContext = await threadManager.selectThreadsForChapter(
  chapterNumber,
  ['Lâm Phong', 'Cao Hùng'], // Characters in this chapter
  5, // Arc number
  80 // Tension level
);

// Add to prompt
const prompt = `
📌 ACTIVE PLOT THREADS:
${threadContext.selectedThreads.map(t => `- ${t.name}: ${t.description}`).join('\n')}

💡 FORESHADOWING TO PAY OFF:
${threadContext.foreshadowingHints.map(h => `- "${h.hint}" (deadline: Ch${h.payoffDeadline})`).join('\n')}

${threadContext.characterRecaps.length > 0 ? `
👤 CHARACTER RECAPS:
${threadContext.characterRecaps.map(r => 
  `- ${r.characterName}: Last seen Ch${r.lastSeenChapter}, ${r.relationshipSummary}`
).join('\n')}
` : ''}
`;

// After writing chapter
await threadManager.recordUsage(threadId, chapterNumber);
```

### Database Migration
```sql
-- See: 0100_create_plot_thread_tables.sql
-- Creates: plot_threads, volume_summaries, world_rules_index, milestone_validations
```

## Phase 2: Volume Summary Manager

### What It Does
- Creates volume summary every 100 chapters
- 4-level memory: Story → Volume (100 ch) → Arc (20 ch) → Recent (3 ch)
- Selects relevant volumes based on plot threads and characters
- Tracks character development across volumes

### Integration Code

```typescript
import { VolumeSummaryManager } from './story-writing-factory';

// Initialize
const volumeManager = new VolumeSummaryManager(projectId);
await volumeManager.initialize();

// Generate volume summary every 100 chapters
if (chapterNumber % 100 === 0) {
  await volumeManager.generateVolumeSummary(
    volumeNumber,
    startChapter,
    endChapter,
    arcSummaries,
    plotThreads,
    characterTracker
  );
}

// Before writing chapter
const volumeContext = await volumeManager.selectVolumesForChapter(
  chapterNumber,
  ['Khế ước ác ma', 'Bí mật Thiên Hải'], // Active threads
  ['Lâm Phong', 'Lão Gia'] // Active characters
);

// Add to prompt
const prompt = `
📚 VOLUME CONTEXT:
${volumeContext.selectedVolumes.map(v => `
Volume ${v.volumeNumber}: ${v.title}
${v.summary}
Key Threads: ${v.plotThreadsIntroduced.join(', ')}
Resolved: ${v.plotThreadsResolved.join(', ')}
`).join('\n')}

👤 CHARACTER ARCS:
${volumeContext.characterArcs.map(a => 
  `- ${a.characterName}: ${a.startState} → ${a.endState}`
).join('\n')}
`;
```

## Phase 3: Rule Indexer

### What It Does
- Tag-based world rules indexing (power:realm=KimDan, location=ThanhVanTong)
- Hybrid search: Tags (40%) + Category (25%) + Text (20%) + Context (15%)
- Auto-suggests relevant rules for each chapter
- Tracks rule usage to identify important vs. forgotten rules

### Integration Code

```typescript
import { RuleIndexer } from './story-writing-factory';

// Initialize
const ruleIndexer = new RuleIndexer(projectId);
await ruleIndexer.initialize();

// Auto-extract rules from chapters
const newRules = await ruleIndexer.extractRulesFromChapter(
  chapterContent,
  chapterNumber
);

// Before writing chapter - get rule suggestions
const ruleSuggestions = ruleIndexer.suggestRulesForChapter(
  chapterNumber,
  chapterContext,
  ['Lâm Phong', 'Lão Gia'], // Characters
  'Thanh Vân Tông' // Location
);

// Add to prompt
const prompt = `
⚖️ RELEVANT WORLD RULES:
${ruleSuggestions.map(s => `
- ${s.rule.ruleText}
  (Relevance: ${Math.round(s.confidence * 100)}%)
  Reason: ${s.reason}
`).join('\n')}
`;

// After using a rule
await ruleIndexer.recordUsage(ruleId, chapterNumber);
```

### Rule Categories
- `power_system`: Tu luyện, cảnh giới
- `politics`: Chính trị, quyền lực
- `economy`: Kinh tế, tiền tệ
- `geography`: Địa lý, không gian
- `culture`: Văn hóa, phong tục
- `history`: Lịch sử, truyền thuyết
- `mechanics`: Game mechanics
- `restrictions`: Giới hạn, cấm kỵ

## Phase 4: Long-term Validator

### What It Does
- Runs validation checks at milestones: Ch.100, 250, 500, 750, 1000...
- Validates: Thread resolution, Character arcs, Power progression, Foreshadowing payoff, Pacing
- Generates comprehensive reports with recommendations
- Auto-detects issues before they become problems

### Integration Code

```typescript
import { LongTermValidator } from './story-writing-factory';

// Initialize
const validator = new LongTermValidator(projectId, {
  milestones: [100, 250, 500, 750, 1000, 1500, 2000],
  autoValidate: true,
  strictMode: false
});
await validator.initialize();

// After writing each chapter
const report = await validator.checkAndValidate(chapterNumber);

if (report) {
  console.log(`=== MILESTONE ${report.milestoneChapter} ===`);
  console.log(`Status: ${report.overallStatus}`);
  console.log(`Score: ${report.overallScore}/100`);
  
  if (report.criticalIssues.length > 0) {
    console.error('CRITICAL ISSUES:', report.criticalIssues);
  }
  
  console.log('Recommendations:', report.recommendations);
}
```

### Validation Types

1. **thread_resolution**: Checks abandoned threads, resolution ratio, critical threads
2. **character_arc**: Validates protagonist growth, forgotten characters
3. **power_consistency**: Monitors power inflation, breakthrough pacing
4. **foreshadowing_payoff**: Tracks hint payoff ratio, overdue hints
5. **pacing_check**: Evaluates story progression at milestones

## Complete Integration Example

```typescript
import {
  PlotThreadManager,
  VolumeSummaryManager,
  RuleIndexer,
  LongTermValidator,
  MemoryManager
} from './story-writing-factory';

async function writeChapter(
  projectId: string,
  chapterNumber: number
) {
  // Initialize all managers
  const memoryManager = new MemoryManager(projectId);
  await memoryManager.initialize();
  await memoryManager.initializePlotThreadManager();
  await memoryManager.initializeVolumeSummaryManager();
  
  const ruleIndexer = new RuleIndexer(projectId);
  await ruleIndexer.initialize();
  
  const validator = new LongTermValidator(projectId);
  await validator.initialize();
  
  // Phase 4: Milestone validation
  const milestoneReport = await validator.checkAndValidate(chapterNumber);
  if (milestoneReport && milestoneReport.overallStatus === 'failed') {
    // Handle critical issues before writing
    console.error('Milestone validation failed:', milestoneReport.criticalIssues);
  }
  
  // Get characters for this chapter (from outline/AI planning)
  const charactersInChapter = ['Lâm Phong', 'Cao Hùng'];
  const arcNumber = Math.ceil(chapterNumber / 20);
  
  // Build comprehensive context with all 4 phases
  const context = await memoryManager.buildContext(
    chapterNumber,
    2000,
    charactersInChapter,
    arcNumber
  );
  
  // Phase 3: Get rule suggestions
  const ruleSuggestions = ruleIndexer.suggestRulesForChapter(
    chapterNumber,
    '', // Chapter context would be here
    charactersInChapter,
    'Thanh Vân Tông'
  );
  
  // Build final prompt
  const prompt = `
VIẾT CHƯƠNG ${chapterNumber}

${context}

⚖️ WORLD RULES:
${ruleSuggestions.slice(0, 3).map(s => `- ${s.rule.ruleText}`).join('\n')}

VIẾT CHƯƠNG (3000-4000 từ):
`;
  
  // Write chapter...
  const chapterContent = await writeWithAI(prompt);
  
  // Phase 3: Extract new rules from chapter
  const newRules = await ruleIndexer.extractRulesFromChapter(
    chapterContent,
    chapterNumber
  );
  
  return chapterContent;
}
```

## Performance Considerations

### Context Size Optimization
- Story Essence: ~100 tokens
- Phase 1 (Threads): ~200 tokens (top 5 threads)
- Phase 2 (Volumes): ~200 tokens (1-2 volumes)
- Arc Summary: ~150 tokens
- Recent Chapters: ~300 tokens
- Phase 3 (Rules): ~150 tokens (top 3 rules)
- Characters: ~100 tokens
- **Total: ~1200 tokens** (still well within limits)

### Database Queries
- All managers use efficient indexed queries
- Lazy loading: Only load data when needed
- Caching: Keep recent data in memory

### When to Generate Volume Summaries
- Automatically every 100 chapters
- Triggered by arc completion
- Manual trigger available for testing

## Testing Checklist

### Phase 1 Tests
- [ ] Create plot thread
- [ ] Add foreshadowing hint
- [ ] Select threads for chapter
- [ ] Detect abandoned threads
- [ ] Character recap generation

### Phase 2 Tests
- [ ] Generate volume summary
- [ ] Select relevant volumes
- [ ] Character arc tracking
- [ ] Thread resolution tracking

### Phase 3 Tests
- [ ] Add world rule
- [ ] Search rules by tags
- [ ] Suggest rules for chapter
- [ ] Record rule usage
- [ ] Extract rules from content

### Phase 4 Tests
- [ ] Run milestone validation
- [ ] Check thread resolution
- [ ] Validate character arcs
- [ ] Check power progression
- [ ] Generate validation report

## Migration Steps

1. **Run Database Migration**
   ```bash
   # Execute the SQL migration
   psql -d your_db -f supabase/migrations/0100_create_plot_thread_tables.sql
   ```

2. **Update Code**
   - All new modules are already exported from `index.ts`
   - Update `MemoryManager.buildContext()` to async
   - Initialize managers in story runner

3. **Test with Existing Projects**
   - Backward compatible: Works without new tables
   - Graceful degradation if tables missing

4. **Deploy**
   - No breaking changes
   - New features opt-in

## Expected Results

### For 200 Chapters
- Before: ✅ Works fine
- After: ✅ Still works, better thread management

### For 500 Chapters
- Before: ⚠️ Some threads forgotten
- After: ✅ All threads tracked, character recaps work

### For 1000 Chapters
- Before: ❌ Many inconsistencies
- After: ✅ Consistent, validated at milestones

### For 2000 Chapters
- Before: ❌ Unusable
- After: ✅ Fully functional with volume summaries

## Troubleshooting

### Issue: "Too many context tokens"
**Solution**: Reduce `maxThreadsInContext` or `maxVolumesInContext` in config

### Issue: "Database queries slow"
**Solution**: Ensure indexes are created (migration includes indexes)

### Issue: "Threads not being selected"
**Solution**: Check character overlap and deadline settings

### Issue: "Validation failing"
**Solution**: Check `milestone_validations` table for specific errors

## Future Enhancements

- AI-powered thread importance prediction
- Automatic foreshadowing suggestion
- Reader engagement prediction
- Cross-story universe consistency

---

**Status**: All 4 phases implemented and ready for use
**Version**: 1.0.0
**Last Updated**: 2026-02-11
