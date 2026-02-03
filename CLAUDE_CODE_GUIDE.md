# Hướng Dẫn Kết Nối Claude Code CLI với TruyenCity

## Tổng Quan

TruyenCity cho phép bạn kết nối Claude Code CLI của riêng bạn để viết truyện tự động. Chương được viết sẽ lưu trực tiếp vào database và hiển thị trên website.

## Yêu Cầu

- Claude Code CLI đã cài đặt (`npm install -g @anthropic-ai/claude-code`)
- Tài khoản TruyenCity đã đăng nhập
- Có ít nhất 1 dự án AI Writer trên website

## Bước 1: Tạo API Token

1. Đăng nhập vào TruyenCity
2. Vào **Cài đặt** → **API Tokens**
3. Nhấn **Tạo Token Mới**
4. Đặt tên (ví dụ: "Claude Code MacBook")
5. **Copy token ngay** - chỉ hiển thị 1 lần!

Token có dạng: `tc_abc123def456...`

## Bước 2: Cấu Hình Claude Code

Clone hoặc tạo thư mục dự án với cấu trúc:

```
my-story-project/
├── .claude/
│   ├── config.json
│   └── commands/
│       ├── setup.md
│       ├── write-chapter.md
│       └── batch-write.md
└── chapters/
```

### File `.claude/config.json`:

```json
{
  "name": "TruyenCity AI Writer",
  "version": "2.0.0",
  "api": {
    "baseUrl": "https://your-domain.vercel.app",
    "externalEndpoint": "/api/external/claude-code",
    "token": "tc_YOUR_TOKEN_HERE"
  },
  "writing": {
    "targetLength": 2500,
    "language": "vi"
  }
}
```

Thay thế:
- `your-domain.vercel.app` → domain thực tế
- `tc_YOUR_TOKEN_HERE` → token đã tạo

## Bước 3: Sử Dụng

### Kiểm tra kết nối

```bash
curl -H "Authorization: Bearer tc_YOUR_TOKEN" \
  "https://your-domain.vercel.app/api/external/claude-code?action=projects"
```

### Viết truyện với Claude Code

```bash
cd my-story-project
claude
```

Sau đó dùng các lệnh:
- `/project setup` - Xem hướng dẫn cấu hình
- `/project write-chapter` - Viết 1 chương
- `/project batch-write 5` - Viết 5 chương liên tục

## API Endpoints

### GET - Lấy thông tin

```bash
# Danh sách dự án
GET /api/external/claude-code?action=projects
Authorization: Bearer tc_xxx

# Context để viết chương
GET /api/external/claude-code?action=context&projectId=UUID
Authorization: Bearer tc_xxx
```

### POST - Gửi chương

```bash
POST /api/external/claude-code
Authorization: Bearer tc_xxx
Content-Type: application/json

{
  "action": "submit_chapter",
  "projectId": "UUID",
  "title": "Chương 1: Khởi Đầu",
  "content": "Nội dung chương..."
}
```

## Quy Tắc Viết Chương

1. **Độ dài**: 2500-3000 từ
2. **Format**: Văn bản thuần, KHÔNG markdown
3. **Tiêu đề**: "Chương X: [Tên hấp dẫn]"
4. **Kết thúc**: Tạo cliffhanger
5. **Liên kết**: Tiếp nối từ chương trước

## Ví Dụ Viết Chương

```
User: /project write-chapter

Claude: Tôi sẽ viết chương tiếp theo cho dự án của bạn.

[Claude gọi API lấy context]
[Claude viết chương]
[Claude gửi chương lên server]

✓ Đã lưu: Chương 15: Đại Chiến Bùng Nổ (2,543 từ)
```

## Bảo Mật

- **KHÔNG** chia sẻ token với ai
- Token có hiệu lực 1 năm
- Xóa token ngay nếu nghi ngờ bị lộ
- Mỗi thiết bị nên có token riêng

## Xử Lý Lỗi

### "Invalid or expired token"
- Token sai hoặc hết hạn
- Tạo token mới tại website

### "Project not found"
- projectId không đúng
- Dự án không ở trạng thái "active"

## Thể Loại Hỗ Trợ

| Thể loại | Mã | Đặc điểm |
|----------|-----|----------|
| Tiên Hiệp | `tien-hiep` | Tu luyện, cảnh giới, đan dược |
| Huyền Huyễn | `huyen-huyen` | Phép thuật, thần bí |
| Đô Thị | `do-thi` | Hiện đại, tình cảm |
| Võ Hiệp | `vo-hiep` | Võ công, giang hồ |

---

Chúc bạn viết truyện vui vẻ!
