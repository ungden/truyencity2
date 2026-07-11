import { readFileSync } from 'fs';
import { runConceptTournament, type ConceptCandidateV2 } from '../src/services/story-engine/flagship/concept-tournament';

const inputPath = process.argv.find(value => value.startsWith('--input='))?.slice('--input='.length);
if (!inputPath) throw new Error('Usage: npm run flagship:concepts -- --input=/absolute/concepts.json');
const candidates = JSON.parse(readFileSync(inputPath, 'utf8')) as ConceptCandidateV2[];
const result = runConceptTournament(candidates, 3, 20);
console.log(JSON.stringify({
  inputCount: candidates.length,
  finalistCount: result.finalists.length,
  ...result,
  nextGate: 'opening_simulation_chapters_1_to_3',
}, null, 2));
