import { readFileSync } from 'fs';
import { scoreBlindBakeoff, type BlindPreferenceBallot } from '../src/services/story-engine/flagship/model-bakeoff';

function arg(name: string): string | undefined {
  return process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

const ballotsPath = arg('ballots');
const ids = (arg('candidate-ids') || '').split(',').map(value => value.trim()).filter(Boolean);
if (!ballotsPath || ids.length < 2) {
  throw new Error('Usage: npm run flagship:bakeoff -- --ballots=/abs/ballots.json --candidate-ids=A,B');
}
const ballots = JSON.parse(readFileSync(ballotsPath, 'utf8')) as BlindPreferenceBallot[];
const result = scoreBlindBakeoff(ballots, ids);
console.log(JSON.stringify(result, null, 2));
if (!result.passed65PercentGate) process.exit(1);
