# Viết chương truyện

Viết chương tiếp theo cho dự án hiện tại.

## Quy trình tự động:

### 1. Đọc cấu hình dự án
Đọc file `.claude/current-project.json` để lấy thông tin dự án.

### 2. Đọc các chương gần nhất
Tìm và đọc 3-5 chương gần nhất trong thư mục `chapters/` để hiểu mạch truyện.

### 3. Viết chương mới

Dựa trên context, viết chương tiếp theo với:
- Tiêu đề format: "Chương [số]: [Tên chương hấp dẫn]"
- Độ dài: 2500-3000 từ
- KHÔNG dùng markdown
- Tạo cliffhanger cuối chương
- Tiếp nối tự nhiên từ chương trước

### 4. Lưu chương
Lưu vào `chapters/chapter-XXX.txt` với format:
```
Chương [số]: [Tên chương]

[Nội dung chương]

---
Viết bởi Claude Code
Ngày: [timestamp]
Số từ: [word count]
```

### 5. Cập nhật current-project.json
Tăng `currentChapter` lên 1.

## Bắt đầu:

Kiểm tra `.claude/current-project.json` có tồn tại không. Nếu không, yêu cầu user chạy `/project setup` trước.

Nếu có, bắt đầu viết chương.
