const { execFileSync } = require('child_process');
const { readFileSync } = require('fs');

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((file) => !file.startsWith('node_modules/') && !file.startsWith('.next/'));

const patterns = [
  {
    name: 'Supabase JWT',
    re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: 'Postgres URL with password',
    re: /postgres(?:ql)?:\/\/[^:\s"'`]+:[^@\s"'`]+@[^ \n"'`]+/g,
  },
  {
    name: 'Supabase service role literal',
    re: /service_role[^A-Za-z0-9_-]*[=:][^A-Za-z0-9_-]*[A-Za-z0-9_-]{24,}/gi,
  },
];

const allowed = [
  /your_service_role_key/i,
  /your-service-role-key/i,
  /your_project/i,
  /placeholder/i,
  /test-service-key/i,
  /JWT_REDACTED/i,
  /POSTGRES_URL_REDACTED/i,
];

const findings = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  for (const { name, re } of patterns) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(text))) {
      const snippet = match[0];
      if (allowed.some((rule) => rule.test(snippet))) continue;
      const line = text.slice(0, match.index).split('\n').length;
      findings.push(`${file}:${line} ${name}`);
    }
  }
}

if (findings.length > 0) {
  console.error('Potential committed secrets found:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Secret scan passed (${files.length} tracked files).`);
