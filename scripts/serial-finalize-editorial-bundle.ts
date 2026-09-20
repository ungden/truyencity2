/** Deterministic last-mile fixes after prose review; never calls a model or production. */
import { readFileSync, writeFileSync } from 'node:fs';

const value = (name: string): string | undefined =>
  process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const input = value('input');
const output = value('output');
if (!input || !output) throw new Error('Usage: --input=/tmp/in.json --output=/tmp/out.json');

const bundle = JSON.parse(readFileSync(input, 'utf8')) as {
  book: string;
  rewrites: Array<{ chapterNumber: number; newContent: string }>;
};

function chapter(number: number) {
  const item = bundle.rewrites.find(rewrite => rewrite.chapterNumber === number);
  if (!item) throw new Error(`Missing chapter ${number}.`);
  return item;
}

function replaceExact(number: number, before: string, after: string): void {
  const item = chapter(number);
  const count = item.newContent.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one exact match in chapter ${number}, found ${count}.`);
  item.newContent = item.newContent.replace(before, after);
}

if (bundle.book === 'mat-the') {
  replaceExact(6, `Bạch Tẫn bước tới bàn đá, đặt Phiếu Tuyến Thử Bờ Đông xuống.

【Đội Tro Tàn: xuất kho 13 điểm】
【Đã dùng 11 điểm số dư】
【Nợ 02 điểm】

Phan Kha nhìn phiếu.

“Có hàng thì đổi thêm dây trước.”

“Thuốc trước.” Mộc Tử ôm bình nước phản đối. “Ngươi bị cắn thì lấy dây khâu miệng vết thương à?”

“Không có dây, lần sau săn bằng tay?”

“Im.”

Bạch Tẫn cất phiếu vào áo.

Cô nhìn thẳng Lâm Việt.

“Hàng đạt chuẩn, quyền ưu tiên vẫn giữ?”

“Giữ.”

“Kiểm công khai?”

“Công khai.”

“Đúng hàng đúng giá?”

“Đúng.”

Bạch Tẫn gật đầu.

“Đội Tro Tàn nhận tuyến.”`, `Bạch Tẫn bước tới bàn đá, đặt Phiếu Tuyến Thử Bờ Đông đã đóng dấu từ hôm trước xuống.

【Đội Tro Tàn: đã nhận tuyến】
【Đã dùng 11 điểm số dư】
【Nợ 02 điểm】

Cô không ký lại. Cô đẩy phiếu sang cho chiến sĩ trực trạm.

“Đóng dấu xuất tuyến. Điều khoản kiểm công khai và đúng giá đã nằm trên phiếu.”

Chiến sĩ trực trạm đối chiếu tên đội, nện một dấu xanh vào ô khởi hành. Phan Kha lập tức kéo cuộn dây thép đã nhận lên vai; Mộc Tử kiểm lại thuốc cầm máu và bình nước.

Bạch Tẫn chỉ vào cụm Hồng Tuệ vừa được bọc nguyên rễ.

“Hai điểm còn nợ, lô Hồng Tuệ đầu tiên đạt chuẩn sẽ xóa. Sau đó da Thiết Giáp Thử mới tính vào quyền ưu tiên lô sau.”

Lâm Việt gật đầu, ghi lựa chọn ấy vào mép phiếu. Hợp đồng cũ bắt đầu có hiệu lực bằng một dấu xuất tuyến, không phải một lời hứa mới.`);
  chapter(8).newContent = chapter(8).newContent
    .replaceAll('bảy phần mười lăm điểm một cân', 'ba phần tư điểm một cân');
  if (/0[,.]715|bảy phần mười lăm/.test(chapter(8).newContent)) {
    throw new Error('Chapter 8 still contains the rejected 0.715 rate.');
  }
}

writeFileSync(output, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ book: bundle.book, chapters: bundle.rewrites.map(item => item.chapterNumber), output }));
