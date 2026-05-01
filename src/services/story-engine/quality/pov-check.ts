/**
 * Story Engine v2 — POV Consistency Check (Phase 27 W5.1)
 *
 * Detects POV violations in chapter content:
 *   - 1st-person narrator slipping into omniscient (revealing other chars' thoughts)
 *   - 3rd-person limited slipping between viewpoint characters mid-scene
 *   - Sudden POV switch without scene break
 *
 * Heuristic-only (no AI calls — fast). Returns issues for Critic to flag.
 */

export type PovViolationType = 'omniscient_slip' | 'pov_switch_mid_scene' | 'wrong_viewpoint';

export interface PovViolation {
  type: PovViolationType;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  evidence?: string;
}

interface PovCheckOptions {
  expectedPov: '1st' | '3rd-limited' | '3rd-omniscient';
  protagonistName: string;
  // Other named POV characters allowed in this chapter (vd ensemble novels).
  allowedPovCharacters?: string[];
}

/**
 * Run heuristic POV checks on chapter content. Cheap, runs every chapter.
 */
export function checkPovConsistency(
  content: string,
  options: PovCheckOptions,
): PovViolation[] {
  const violations: PovViolation[] = [];
  const { expectedPov, protagonistName, allowedPovCharacters = [] } = options;

  // === 1st-person POV checks ===
  if (expectedPov === '1st') {
    // Patterns that suggest narrator knows another character's internal thoughts.
    const omniscientPatterns: Array<{ re: RegExp; desc: string }> = [
      { re: /\b(?:nàng|hắn|cô ấy|anh ấy|y|gã)\s+(?:thầm nghĩ|nghĩ thầm|trong lòng|sâu thẳm|tự nhủ)/gi, desc: '1st-person narrator describing other character\'s inner thoughts' },
      { re: /\b(?:nàng|hắn|cô ấy|anh ấy|y|gã)\s+cảm thấy\s+(?:đau|vui|buồn|tức|sợ|kinh ngạc|hối hận)/gi, desc: '1st-person narrator attributing specific emotions to non-narrator' },
    ];

    for (const { re, desc } of omniscientPatterns) {
      const matches = content.match(re);
      if (matches && matches.length >= 2) {
        violations.push({
          type: 'omniscient_slip',
          severity: matches.length >= 5 ? 'major' : 'moderate',
          description: `${desc} (${matches.length} occurrences)`,
          evidence: matches[0],
        });
      }
    }
  }

  // === 3rd-limited POV checks ===
  if (expectedPov === '3rd-limited') {
    // Detect POV switching mid-scene by counting "viewpoint character" markers.
    const allowedNames = new Set([protagonistName, ...allowedPovCharacters].filter(Boolean));

    // Find all "<Name> nghĩ" / "<Name> cảm thấy" patterns. If non-allowed names
    // get inner-thought attribution, flag.
    const innerThoughtRe = /([A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+(?:\s+[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+)?)\s+(?:thầm nghĩ|nghĩ thầm|trong lòng nghĩ|tự nhủ|cảm thấy)/g;
    const wrongViewpointNames = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = innerThoughtRe.exec(content)) !== null) {
      const name = m[1].trim();
      if (!allowedNames.has(name) && name.length >= 2) {
        wrongViewpointNames.add(name);
      }
    }

    if (wrongViewpointNames.size >= 2) {
      violations.push({
        type: 'wrong_viewpoint',
        severity: wrongViewpointNames.size >= 4 ? 'major' : 'moderate',
        description: `3rd-limited POV expects only ${[...allowedNames].join(', ')} to have inner-thought access. Found inner thoughts attributed to ${[...wrongViewpointNames].slice(0, 5).join(', ')}.`,
      });
    }

    // Detect mid-scene POV switch — count distinct "Name + thought verb" within same paragraph block.
    const paragraphs = content.split(/\n\n+/);
    let switchCount = 0;
    for (const p of paragraphs) {
      const namesInP = new Set<string>();
      let m2: RegExpExecArray | null;
      const pRe = new RegExp(innerThoughtRe.source, 'g');
      while ((m2 = pRe.exec(p)) !== null) {
        namesInP.add(m2[1].trim());
      }
      if (namesInP.size >= 2) switchCount++;
    }

    if (switchCount >= 3) {
      violations.push({
        type: 'pov_switch_mid_scene',
        severity: 'moderate',
        description: `Mid-paragraph POV switch detected ${switchCount} times — 3rd-limited POV should not switch viewpoints within a scene without explicit break.`,
      });
    }
  }

  return violations;
}

/**
 * Format POV violations as a Critic-friendly issue list.
 */
export function formatPovViolations(violations: PovViolation[]): string | null {
  if (violations.length === 0) return null;
  const lines = ['[POV VIOLATIONS DETECTED]'];
  for (const v of violations) {
    lines.push(`  ${v.severity.toUpperCase()} ${v.type}: ${v.description}`);
    if (v.evidence) lines.push(`    Evidence: "${v.evidence.slice(0, 100)}"`);
  }
  return lines.join('\n');
}
