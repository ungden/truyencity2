/**
 * Story Engine v2 Integration Test
 * 
 * Run: npx ts-node scripts/test-story-engine-v2.ts <projectId>
 * 
 * This script tests the v2 pipeline by writing a single chapter.
 */

import { writeChapterForProject } from '../src/services/story-engine';

async function main() {
  const projectId = process.argv[2];
  
  if (!projectId) {
    console.error('Usage: npx ts-node scripts/test-story-engine-v2.ts <projectId>');
    console.error('\nGet projectId from: SELECT id, main_character FROM ai_story_projects LIMIT 5;');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Story Engine v2 Integration Test');
  console.log('='.repeat(60));
  console.log(`Project ID: ${projectId}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  try {
    const startTime = Date.now();
    
    const result = await writeChapterForProject({
      projectId,
    });

    const duration = Date.now() - startTime;
    
    console.log('-'.repeat(60));
    console.log('RESULT:');
    console.log('-'.repeat(60));
    console.log(`  Chapter: ${result.chapterNumber}`);
    console.log(`  Title: ${result.title}`);
    console.log(`  Word Count: ${result.wordCount}`);
    console.log(`  Quality Score: ${result.qualityScore}`);
    console.log(`  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log('');
    console.log('✅ SUCCESS - Chapter written successfully!');
    console.log('');
    
    // Validation checks
    const warnings: string[] = [];
    
    if (result.wordCount < 2000) {
      warnings.push(`Word count low: ${result.wordCount} (expected ~2800)`);
    }
    
    if (result.qualityScore < 6) {
      warnings.push(`Quality score low: ${result.qualityScore} (expected >= 6)`);
    }
    
    if (duration > 180000) {
      warnings.push(`Duration long: ${(duration / 1000).toFixed(1)}s (expected < 180s)`);
    }
    
    if (warnings.length > 0) {
      console.log('⚠️ WARNINGS:');
      warnings.forEach(w => console.log(`  - ${w}`));
    } else {
      console.log('✅ All checks passed!');
    }

  } catch (error) {
    console.error('-'.repeat(60));
    console.error('❌ ERROR:');
    console.error('-'.repeat(60));
    console.error(error);
    process.exit(1);
  }
}

main();
