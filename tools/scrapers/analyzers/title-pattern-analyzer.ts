/**
 * Title Pattern Analyzer - Extracts patterns from Chinese novel titles
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ScrapedNovel, TitlePattern, TITLE_KEYWORDS } from '../types';
import { TITLE_KEYWORDS as keywords } from '../types';

interface AnalysisResult {
  patterns: TitlePattern[];
  insights: {
    most_common_patterns: string[];
    highest_rated_patterns: string[];
    genre_specific_patterns: Record<string, string[]>;
    keyword_frequency: Record<string, number>;
  };
}

export class TitlePatternAnalyzer {
  private novels: ScrapedNovel[] = [];
  
  constructor(novelsData: ScrapedNovel[]) {
    this.novels = novelsData;
  }

  analyze(): AnalysisResult {
    console.log(`Analyzing ${this.novels.length} novel titles...`);

    const patterns = this.extractPatterns();
    const insights = this.generateInsights(patterns);

    const result: AnalysisResult = {
      patterns,
      insights,
    };

    // Save results
    const outputPath = path.join(__dirname, '../data/title-patterns.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`✓ Analysis complete. Saved to ${outputPath}`);

    return result;
  }

  private extractPatterns(): TitlePattern[] {
    const patternMap = new Map<string, {
      examples: Array<{ title: string; rating: number; genre: string }>;
      genres: Set<string>;
    }>();

    // Analyze each title
    for (const novel of this.novels) {
      const detectedPatterns = this.detectPatternsInTitle(novel.title_chinese);
      
      for (const pattern of detectedPatterns) {
        if (!patternMap.has(pattern.id)) {
          patternMap.set(pattern.id, {
            examples: [],
            genres: new Set(),
          });
        }

        const data = patternMap.get(pattern.id)!;
        data.examples.push({
          title: novel.title_chinese,
          rating: novel.stats.rating || 0,
          genre: novel.genre,
        });
        data.genres.add(novel.genre);
      }
    }

    // Convert to TitlePattern array
    const patterns: TitlePattern[] = [];
    
    for (const [patternId, data] of patternMap.entries()) {
      const avgRating = data.examples.reduce((sum, ex) => sum + ex.rating, 0) / data.examples.length;
      
      const pattern: TitlePattern = {
        pattern_id: patternId,
        pattern_type: this.getPatternType(patternId),
        structure: this.getPatternStructure(patternId),
        examples: data.examples.map(ex => ex.title).slice(0, 5), // Top 5 examples
        frequency: data.examples.length,
        avg_rating: Math.round(avgRating * 10) / 10,
        genres: Array.from(data.genres),
        description: this.getPatternDescription(patternId),
      };

      patterns.push(pattern);
    }

    // Sort by frequency and rating
    return patterns.sort((a, b) => {
      const scoreA = a.frequency * 0.6 + a.avg_rating * 0.4;
      const scoreB = b.frequency * 0.6 + b.avg_rating * 0.4;
      return scoreB - scoreA;
    });
  }

  private detectPatternsInTitle(title: string): Array<{ id: string }> {
    const detected: Array<{ id: string }> = [];

    // Pattern 1: Number + Realm/Title (万古神帝, 九星霸体诀)
    if (this.hasKeywords(title, keywords.numbers) && this.hasKeywords(title, keywords.realms)) {
      detected.push({ id: 'number_realm' });
    }

    // Pattern 2: Action + Object (吞噬星空, 遮天)
    if (this.hasKeywords(title, keywords.actions) || title.match(/[吞噬遮镇压掠夺]/)) {
      detected.push({ id: 'action_object' });
    }

    // Pattern 3: Realm/Title alone (元尊, 圣墟)
    if (this.hasKeywords(title, keywords.realms) && title.length <= 3) {
      detected.push({ id: 'realm_title' });
    }

    // Pattern 4: Mystery/Forbidden keywords (诡秘之主, 禁区之主)
    if (this.hasKeywords(title, keywords.mystery)) {
      detected.push({ id: 'mystery_hook' });
    }

    // Pattern 5: System/Sign-in (大王饶命 contains negative emotion system)
    if (this.hasKeywords(title, keywords.system)) {
      detected.push({ id: 'system_based' });
    }

    // Pattern 6: Location + Title (牧神记, 完美世界)
    if (this.hasKeywords(title, keywords.locations) || title.includes('世界') || title.includes('记')) {
      detected.push({ id: 'location_title' });
    }

    // Pattern 7: Emotion + Realm (无敌/最强/至尊)
    if (this.hasKeywords(title, keywords.emotions)) {
      detected.push({ id: 'emotion_realm' });
    }

    // Pattern 8: Occupation/Role + Title (全职高手, 修罗武神)
    if (title.match(/[职师尊神主王]/) && title.length >= 4) {
      detected.push({ id: 'occupation_title' });
    }

    // Pattern 9: Poetic/Literary (斗破苍穹, 遮天)
    if (title.length === 4 && title.match(/[破遮斗裂]/) && title.match(/[天穹苍空]/)) {
      detected.push({ id: 'poetic_four_char' });
    }

    // Pattern 10: Person/Character focus (凡人修仙传, 我师兄...)
    if (title.includes('人') || title.includes('我') || title.includes('师兄') || title.includes('传')) {
      detected.push({ id: 'person_focused' });
    }

    return detected.length > 0 ? detected : [{ id: 'other' }];
  }

  private hasKeywords(title: string, keywordList: string[]): boolean {
    return keywordList.some(keyword => title.includes(keyword));
  }

  private getPatternType(patternId: string): string {
    const types: Record<string, string> = {
      number_realm: 'Number Emphasis',
      action_object: 'Action Verb',
      realm_title: 'Realm/Title',
      mystery_hook: 'Mystery Hook',
      system_based: 'System/LitRPG',
      location_title: 'Location/World',
      emotion_realm: 'Emotion/Power',
      occupation_title: 'Occupation/Role',
      poetic_four_char: 'Poetic Four Characters',
      person_focused: 'Character Focused',
      other: 'Other',
    };
    return types[patternId] || 'Unknown';
  }

  private getPatternStructure(patternId: string): string {
    const structures: Record<string, string> = {
      number_realm: '[Big Number] + [Realm/Title]',
      action_object: '[Action Verb] + [Cosmic Object/Goal]',
      realm_title: '[Realm/Title] (2-3 chars)',
      mystery_hook: '[Mystery Word] + [之] + [Title]',
      system_based: '[System Type] + [Feature]',
      location_title: '[World/Location] + [Title]',
      emotion_realm: '[Emotion/Power] + [Realm]',
      occupation_title: '[Occupation] + [Title]',
      poetic_four_char: '[Verb] + [破/裂] + [Sky/Nature]',
      person_focused: '[Person/Character] + [Journey]',
      other: 'Mixed or Unique',
    };
    return structures[patternId] || 'Unknown Structure';
  }

  private getPatternDescription(patternId: string): string {
    const descriptions: Record<string, string> = {
      number_realm: 'Uses large numbers (万/千/九) combined with realm/title words. Creates sense of epicness and time span.',
      action_object: 'Strong action verbs combined with cosmic or grand objects. Conveys power and ambition.',
      realm_title: 'Short, punchy realm or title words. Direct and memorable.',
      mystery_hook: 'Uses mystery/forbidden keywords to create intrigue and curiosity.',
      system_based: 'References game systems, sign-in, or special mechanics. Appeals to system novel fans.',
      location_title: 'Focuses on world or location names. Good for world-building emphasis.',
      emotion_realm: 'Emphasizes power level through emotion words (invincible, supreme, peak).',
      occupation_title: 'Highlights protagonist\'s role or occupation. Clear identity.',
      poetic_four_char: 'Four-character poetic phrases with dynamic imagery. Classic Chinese style.',
      person_focused: 'Centers on character (common person, protagonist). Relatable hook.',
      other: 'Unique or mixed pattern not fitting standard categories.',
    };
    return descriptions[patternId] || 'No description available.';
  }

  private generateInsights(patterns: TitlePattern[]): AnalysisResult['insights'] {
    // Most common patterns
    const most_common_patterns = patterns
      .slice(0, 5)
      .map(p => `${p.pattern_type} (${p.frequency} examples, avg ${p.avg_rating}★)`);

    // Highest rated patterns
    const highest_rated_patterns = patterns
      .sort((a, b) => b.avg_rating - a.avg_rating)
      .slice(0, 5)
      .map(p => `${p.pattern_type} (${p.avg_rating}★)`);

    // Genre-specific patterns
    const genre_specific_patterns: Record<string, string[]> = {};
    for (const pattern of patterns) {
      for (const genre of pattern.genres) {
        if (!genre_specific_patterns[genre]) {
          genre_specific_patterns[genre] = [];
        }
        genre_specific_patterns[genre].push(pattern.pattern_type);
      }
    }

    // Keyword frequency
    const keyword_frequency: Record<string, number> = {};
    for (const novel of this.novels) {
      const allKeywords = [
        ...keywords.numbers,
        ...keywords.realms,
        ...keywords.actions,
        ...keywords.mystery,
        ...keywords.system,
        ...keywords.locations,
        ...keywords.emotions,
      ];

      for (const keyword of allKeywords) {
        if (novel.title_chinese.includes(keyword)) {
          keyword_frequency[keyword] = (keyword_frequency[keyword] || 0) + 1;
        }
      }
    }

    return {
      most_common_patterns,
      highest_rated_patterns,
      genre_specific_patterns,
      keyword_frequency,
    };
  }
}

// CLI execution
if (require.main === module) {
  const novelsPath = path.join(__dirname, '../data/top-novels-clean.json');
  const novels: ScrapedNovel[] = JSON.parse(fs.readFileSync(novelsPath, 'utf-8'));
  
  const analyzer = new TitlePatternAnalyzer(novels);
  const result = analyzer.analyze();

  console.log('\n=== Analysis Results ===\n');
  console.log(`Total Patterns Found: ${result.patterns.length}`);
  console.log(`\nMost Common Patterns:`);
  result.insights.most_common_patterns.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  
  console.log(`\nHighest Rated Patterns:`);
  result.insights.highest_rated_patterns.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

  console.log(`\nTop Keywords:`);
  const topKeywords = Object.entries(result.insights.keyword_frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  topKeywords.forEach(([keyword, count]) => console.log(`  ${keyword}: ${count}`));
}
