# Viết nhiều chương liên tục

Viết nhiều chương truyện liên tục cho một dự án TruyenCity.

## Cách sử dụng

```
/project batch-write [số_chương]
```

Ví dụ: `/project batch-write 5` sẽ viết 5 chương liên tiếp.

## Cấu hình

Đọc file `.claude/config.json` để lấy:
- `api.baseUrl`: URL của website
- `api.token`: Token xác thực

## Quy trình:

### 1. Lấy danh sách dự án và hỏi user chọn dự án

### 2. Lặp lại cho mỗi chương:

a. Lấy context mới nhất:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "BASE_URL/api/external/claude-code?action=context&projectId=PROJECT_ID"
```

b. Viết chương theo prompt nhận được

c. Gửi chương lên server:
```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"submit_chapter","projectId":"PROJECT_ID","content":"NỘI DUNG"}' \
  "BASE_URL/api/external/claude-code"
```

d. Thông báo tiến trình: "Đã viết xong chương X/Y"

### 3. Tổng kết khi hoàn thành

## Hướng dẫn viết mỗi chương:

- Độ dài: 2500-3000 từ
- KHÔNG markdown
- Tiêu đề: "Chương X: [Tên hấp dẫn]"
- Tạo cliffhanger
- Tiếp nối mạch truyện
- Mỗi chương phải có sự phát triển mới

## Lưu ý quan trọng:

- Luôn lấy context MỚI trước mỗi chương (để có thông tin chương trước)
- Nếu có lỗi, dừng lại và thông báo cho user
- Không viết nội dung trùng lặp giữa các chương
- Giữ tính nhất quán về nhân vật và cốt truyện

## Ví dụ output mong đợi:

```
Đang viết chương 10...
✓ Chương 10: Đột Phá Cảnh Giới - 2,543 từ

Đang viết chương 11...
✓ Chương 11: Kẻ Địch Xuất Hiện - 2,678 từ

...

Hoàn thành! Đã viết 5 chương (12,450 từ tổng cộng)
```
