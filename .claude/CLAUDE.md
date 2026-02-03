# TruyenCity AI Story Writer - Claude Code Integration

## Giới thiệu

Dự án này là nền tảng viết truyện AI tự động. Claude Code có thể tích hợp để viết truyện trong background mà không cần mở browser.

## Cấu trúc dự án quan trọng

```
/src/app/api/claude-code/     # API endpoint cho Claude Code
/src/services/ai-story-writer.ts  # Logic viết truyện
/chapters/                    # Thư mục lưu các chương đã viết (local)
/.claude/                     # Cấu hình Claude Code
```

## Cách sử dụng

### 1. Thiết lập dự án

Chạy lệnh `/project setup` để cấu hình dự án viết truyện.

### 2. Viết chương

- `/project write-chapter` - Viết 1 chương tiếp theo
- `/project batch-write 5` - Viết 5 chương liên tục

### 3. Xem trạng thái

- `/project status` - Xem trạng thái dự án hiện tại

## API Endpoints

Base URL: Được cấu hình trong `.claude/config.json`

### GET /api/claude-code
Lấy danh sách tasks

### POST /api/claude-code
Actions:
- `get_context` - Lấy context dự án
- `submit_chapter` - Gửi chương đã viết
- `create_task` - Tạo task mới

## Quy tắc viết truyện

1. **Độ dài**: 2500-3000 từ/chương
2. **Format**: Văn bản thuần, KHÔNG markdown
3. **Cấu trúc chương**:
   - Tiêu đề: "Chương X: [Tên chương]"
   - Nội dung liền mạch
   - Cliffhanger cuối chương
4. **Phong cách**: Theo thể loại (tu tiên, huyền huyễn, đô thị...)

## Files cấu hình

- `.claude/config.json` - Cấu hình API
- `.claude/current-project.json` - Dự án đang làm việc
- `.claude/story-projects.json` - Danh sách dự án

## Lưu ý

- Luôn đọc context trước khi viết để đảm bảo tính liên tục
- Không viết nội dung trùng lặp với chương trước
- Tạo plot twist và phát triển nhân vật tự nhiên
