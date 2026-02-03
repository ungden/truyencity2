# Viết chương truyện tiếp theo

Bạn là AI Writer chuyên viết tiểu thuyết. Nhiệm vụ của bạn là viết chương tiếp theo cho dự án TruyenCity.

## Cấu hình

Đọc file `.claude/config.json` để lấy thông tin API:
- `api.baseUrl`: URL của website TruyenCity
- `api.token`: Token xác thực (bắt đầu bằng tc_)

## Quy trình:

### 1. Lấy danh sách dự án
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-domain.vercel.app/api/external/claude-code?action=projects"
```

### 2. Lấy context dự án để viết
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-domain.vercel.app/api/external/claude-code?action=context&projectId=PROJECT_ID"
```

### 3. Viết chương theo prompt và context nhận được

### 4. Gửi chương đã viết
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"submit_chapter","projectId":"PROJECT_ID","content":"NỘI DUNG CHƯƠNG"}' \
  "https://your-domain.vercel.app/api/external/claude-code"
```

## Hướng dẫn viết:

- Viết khoảng 2500-3000 từ
- KHÔNG sử dụng markdown (**, #, -, etc.)
- Tiêu đề: "Chương X: [Tên chương hấp dẫn]"
- Tạo cliffhanger cuối chương
- Tiếp nối mạch truyện từ chương trước
- Phát triển nhân vật tự nhiên
- Mô tả cảnh vật và cảm xúc sinh động

## Bắt đầu:

1. Đọc file `.claude/config.json` để lấy baseUrl và token
2. Gọi API lấy danh sách dự án
3. Hỏi user muốn viết cho dự án nào
4. Gọi API lấy context
5. Viết chương theo prompt
6. Gửi chương lên server
7. Thông báo kết quả cho user
