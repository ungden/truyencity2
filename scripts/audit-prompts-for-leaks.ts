/**
 * Audit prompts/templates for placeholder leaks.
 *
 * Scans story-engine source files for hardcoded character names that historically
 * leaked into generated chapters via LLM imitation (the "Băng Hà Tận Thế" MC name
 * flip bug, where voice anchor sample "Trần Vũ" got copied into Lê Minh's story).
 *
 * Convention enforced:
 *   <MC>      = main character placeholder
 *   <LOVE>    = love interest placeholder
 *   <CITY>    = location placeholder
 *
 * Any literal occurrence of NAMES_REGISTRY in scanned files = error, exit 1.
 *
 * Usage: npx tsx scripts/audit-prompts-for-leaks.ts
 * Add to CI: npm run lint:prompts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Names that historically appeared as voice-anchor placeholders. ALL must now be <MC> /
// <LOVE> / <CITY>. If any of these strings appears as a literal in a scanned file, it
// will leak via prose imitation.
const FORBIDDEN_LITERAL_NAMES = [
  // Cultivation cluster
  'Tô Mục', 'Lý Tầm Hoan',
  // Fantasy cluster
  'Lâm Hạo',
  // Modern cluster
  'Trần Vũ', 'Trần Hạo', 'Lý Trưởng Khang',
  // Romance cluster
  'Lâm Hạ Vy', 'Trịnh Nam Du',
  // Horror cluster
  'Lê Đình Phong',
  // Historical cluster
  'Tô Trọng Ngạn',
  // Quick transmigration
  'Lâm Yên',
  // Fan-fic
  'Hatake Kakashi II',
];

// Files to scan — if leak appears here, abort.
const SCAN_GLOB = [
  'src/services/story-engine/templates/genre-voice-anchors.ts',
  'src/services/story-engine/templates/genre-process-blueprints.ts',
  'src/services/story-engine/pipeline/chapter-writer.ts',
  'src/services/story-engine/plan/master-outline.ts',
  'src/services/story-engine/plan/story-outline.ts',
  'src/services/story-engine/context/assembler.ts',
];

interface Leak {
  file: string;
  name: string;
  lineNumber: number;
  lineContent: string;
}

function findLeaks(): Leak[] {
  const leaks: Leak[] = [];
  const cwd = execSync('git rev-parse --show-toplevel').toString().trim();

  for (const relPath of SCAN_GLOB) {
    const fullPath = join(cwd, relPath);
    let content: string;
    try {
      content = readFileSync(fullPath, 'utf8');
    } catch {
      continue; // file may not exist in some checkouts
    }
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comment lines + import statements (they may reference names safely in docstrings)
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
      // Skip the FORBIDDEN_LITERAL_NAMES list itself (lint script meta-references)
      if (line.includes('FORBIDDEN_LITERAL_NAMES')) continue;
      for (const name of FORBIDDEN_LITERAL_NAMES) {
        if (line.includes(name)) {
          leaks.push({
            file: relPath,
            name,
            lineNumber: i + 1,
            lineContent: line.trim().slice(0, 120),
          });
        }
      }
    }
  }
  return leaks;
}

function main(): void {
  const leaks = findLeaks();
  if (leaks.length === 0) {
    console.log('✓ No placeholder leaks found in scanned files.');
    process.exit(0);
  }
  console.error(`✗ Found ${leaks.length} placeholder leak(s):\n`);
  for (const l of leaks) {
    console.error(`  ${l.file}:${l.lineNumber}`);
    console.error(`    leaked: "${l.name}"`);
    console.error(`    line:   ${l.lineContent}`);
    console.error('');
  }
  console.error('Replace the literal name with the appropriate placeholder:');
  console.error('  <MC>    — main character (replaced from project.main_character)');
  console.error('  <LOVE>  — love interest (replaced from castRoster)');
  console.error('  <CITY>  — primary location (replaced from world_description)');
  process.exit(1);
}

main();
