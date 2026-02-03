# Thiết lập kết nối Claude Code với TruyenCity

Hướng dẫn này giúp bạn kết nối Claude Code CLI với tài khoản TruyenCity để viết truyện tự động.

## Bước 1: Lấy API Token

1. Đăng nhập vào website TruyenCity (https://your-domain.vercel.app)
2. Vào menu **Cài đặt** → **API Tokens**
3. Nhấn **Tạo Token Mới**
4. Đặt tên cho token (ví dụ: "Claude Code trên MacBook")
5. **QUAN TRỌNG**: Copy token ngay lập tức! Token chỉ hiển thị 1 lần.

## Bước 2: Cấu hình config.json

Mở file `.claude/config.json` và cập nhật:

```json
{
  "api": {
    "baseUrl": "https://your-actual-domain.vercel.app",
    "externalEndpoint": "/api/external/claude-code",
    "token": "tc_paste_your_token_here"
  }
}
```

Thay thế:
- `your-actual-domain.vercel.app` bằng domain thực tế của TruyenCity
- `tc_paste_your_token_here` bằng token vừa tạo

## Bước 3: Kiểm tra kết nối

Chạy lệnh sau để kiểm tra:

```bash
curl -H "Authorization: Bearer tc_YOUR_TOKEN" \
  "https://your-domain.vercel.app/api/external/claude-code?action=projects"
```

Nếu thành công, bạn sẽ thấy danh sách các dự án truyện của mình.

## Bước 4: Bắt đầu viết

Sau khi cấu hình xong, bạn có thể sử dụng các lệnh:

- `/project write-chapter` - Viết 1 chương
- `/project batch-write 5` - Viết 5 chương liên tục

## Lưu ý bảo mật

- Không chia sẻ token với ai
- Token có hiệu lực 1 năm
- Nếu nghi ngờ token bị lộ, xóa và tạo token mới tại website
- Token cho phép truy cập tất cả dự án của bạn

## Xử lý lỗi

### Token không hợp lệ
- Kiểm tra token có đúng format `tc_xxx...`
- Token có thể đã hết hạn, tạo token mới

### Không tìm thấy dự án
- Đảm bảo bạn đã tạo dự án AI Writer trên website
- Dự án phải ở trạng thái "active"

### Lỗi kết nối
- Kiểm tra baseUrl có đúng không
- Đảm bảo có kết nối internet
