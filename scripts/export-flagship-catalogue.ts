import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { FLAGSHIP_FIRST_30_CATALOGUE_V1 } from '../src/services/story-engine/flagship/catalogue-data';

const outputPath = path.join(process.cwd(), 'blueprints/flagship-portfolio-v1/catalogue-v1.md');
const sections = FLAGSHIP_FIRST_30_CATALOGUE_V1.packages.map(item => `## ${item.slotId} — ${item.title}

![Bìa ${item.title}](../../public${item.coverArt.assetPath})

**Tagline:** ${item.tagline}

**Mô tả:** ${item.catalogueDescription}

**Nhân vật chính:** ${item.protagonistSeed}

**Bối cảnh:** ${item.settingSeed}

**Mở truyện:** ${item.openingHook}

**Lời hứa dài kỳ:** ${item.serialPromise}
`);

const document = `# Catalogue 30 truyện nam flagship — V1

Catalogue này là lớp tuyển chọn thượng nguồn. Mỗi mục là một concept package riêng gồm bản sắc, nhân vật, bối cảnh, opening hook, serial promise và bìa 3:4. Nó chưa phải StorySpec và không được inject vào Writer. Chỉ concept được human-gate chọn mới được materialize thành kernel riêng của truyện.

- Tổng số: 30
- Huyền huyễn: 7
- Tiên hiệp phi cổ điển: 5
- Đô thị, niên đại, nghề nghiệp và song xuyên: 18
- Trạng thái: concept_package_ready
- StorySpec đã materialize: 0
- Production mutation: không

${sections.join('\n')}`;

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, document, 'utf8');
console.log(outputPath);
