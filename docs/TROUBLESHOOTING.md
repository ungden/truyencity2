# Troubleshooting Guide

## 🔧 Hướng dẫn xử lý lỗi

## 📋 Mục lục

1. [Lỗi đăng nhập](#lỗi-đăng-nhập)
2. [Lỗi tạo dự án](#lỗi-tạo-dự-án)
3. [Lỗi viết chương](#lỗi-viết-chương)
4. [Lỗi batch writing](#lỗi-batch-writing)
5. [Lỗi autopilot](#lỗi-autopilot)
6. [Lỗi hiệu suất](#lỗi-hiệu-suất)
7. [Lỗi khác](#lỗi-khác)

## 🔐 Lỗi đăng nhập

### Lỗi: "Session expired"

**Nguyên nhân:**
- JWT token hết hạn
- Cookie bị xóa
- Logout từ tab khác

**Giải pháp:**
```
1. Refresh trang (F5)
2. Nếu vẫn lỗi, logout và login lại
3. Clear browser cache
4. Thử trình duyệt khác
```

### Lỗi: "Invalid credentials"

**Nguyên nhân:**
- Email/password sai
- Tài khoản chưa được kích hoạt

**Giải pháp:**
```
1. Kiểm tra lại email/password
2. Kiểm tra email xác nhận
3. Reset password nếu quên
4. Liên hệ support nếu vẫn lỗi
```

### Lỗi: "Too many requests"

**Nguyên nhân:**
- Đăng nhập sai quá nhiều lần
- Rate limit

**Giải pháp:**
```
1. Đợi 5-10 phút
2. Thử lại
3. Liên hệ support nếu bị block
```

## 📝 Lỗi tạo dự án

### Lỗi: "Novel not found"

**Nguyên nhân:**
- Truyện chưa được tạo trong database
- ID truyện không hợp lệ

**Giải pháp:**
```
1. Tạo truyện mới trong admin panel
2. Kiểm tra ID truyện
3. Refresh danh sách truyện
```

### Lỗi: "Invalid genre"

**Nguyên nhân:**
- Thể loại không được hỗ trợ
- Typo trong genre ID

**Giải pháp:**
```
1. Chọn lại thể loại từ dropdown
2. Không nhập thủ công
3. Kiểm tra genre_config.ts
```

### Lỗi: "Main character required"

**Nguyên nhân:**
- Chưa nhập tên nhân vật chính

**Giải pháp:**
```
1. Nhập tên nhân vật chính
2. Tối thiểu 2 ký tự
3. Không để trống
```

## ✍️ Lỗi viết chương

### Lỗi: "Job failed - OpenRouter API error"

**Nguyên nhân:**
- API key không hợp lệ
- Hết quota
- OpenRouter service down

**Giải pháp:**
```
1. Kiểm tra API key trong Supabase secrets
2. Kiểm tra quota tại openrouter.ai
3. Thử lại sau 5 phút
4. Thử model khác (GPT-3.5 thay vì GPT-4)
```

### Lỗi: "Job failed - Timeout"

**Nguyên nhân:**
- AI mất quá lâu để generate
- Network timeout
- Edge function timeout (30s)

**Giải pháp:**
```
1. Giảm target_chapter_length xuống 2000
2. Giảm temperature xuống 0.5
3. Thử model nhanh hơn (GPT-3.5)
4. Thử lại
```

### Lỗi: "Job failed - Content too short"

**Nguyên nhân:**
- AI generate nội dung quá ngắn
- Refine content thất bại

**Giải pháp:**
```
1. Kiểm tra prompt template
2. Tăng target_chapter_length
3. Viết mô tả thế giới chi tiết hơn
4. Thử model khác
```

### Lỗi: "Job failed - Contradiction detected"

**Nguyên nhân:**
- Phát hiện mâu thuẫn nghiêm trọng
- Cultivation level giảm
- Nhân vật chính tử vong

**Giải pháp:**
```
1. Xem log contradiction
2. Quyết định có viết lại hay không
3. Cập nhật cultivation_system nếu cần
4. Bỏ qua nếu không quan trọng
```

### Lỗi: "Job stuck at X%"

**Nguyên nhân:**
- Job bị treo
- Database connection lost
- Edge function crashed

**Giải pháp:**
```
1. Đợi 5 phút
2. Click "Dừng"
3. Viết lại chương
4. Kiểm tra Supabase logs
```

## 📚 Lỗi batch writing

### Lỗi: "Batch stopped at chapter X"

**Nguyên nhân:**
- Một chương bị lỗi
- API quota hết
- Network error

**Giải pháp:**
```
1. Kiểm tra lỗi của chương X
2. Sửa lỗi (nếu có)
3. Chạy lại batch từ chương X
4. Hoặc chuyển sang viết thủ công
```

### Lỗi: "Browser closed, batch stopped"

**Nguyên nhân:**
- Đóng trình duyệt trong khi batch writing
- Tab bị crash
- Máy tính tắt

**Giải pháp:**
```
1. Mở lại trình duyệt
2. Kiểm tra chương cuối cùng đã viết
3. Tiếp tục từ chương đó
4. Lưu ý: Không đóng trình duyệt khi batch writing
```

### Lỗi: "Too many requests"

**Nguyên nhân:**
- Gửi quá nhiều request cùng lúc
- Rate limit

**Giải pháp:**
```
1. Giảm số chương trong batch
2. Đợi 10 phút
3. Thử lại với batch nhỏ hơn (10 chương)
```

## 📅 Lỗi autopilot

### Lỗi: "Schedule not running"

**Nguyên nhân:**
- Lịch bị tạm dừng
- Cron job không chạy
- Edge function lỗi

**Giải pháp:**
```
1. Kiểm tra trạng thái lịch (Active/Paused)
2. Kích hoạt lại nếu bị tạm dừng
3. Kiểm tra Supabase cron logs
4. Kiểm tra edge function logs
```

### Lỗi: "Schedule created but not running"

**Nguyên nhân:**
- next_run_at trong tương lai
- Timezone sai

**Giải pháp:**
```
1. Kiểm tra next_run_at
2. Chuyển đổi UTC sang local time
3. Tick "Bắt đầu ngay" khi tạo lịch
4. Hoặc đợi đến giờ đã chọn
```

### Lỗi: "Schedule runs but no chapter created"

**Nguyên nhân:**
- Job creation failed
- Project bị tạm dừng
- API error

**Giải pháp:**
```
1. Kiểm tra project status (Active/Paused)
2. Kích hoạt project nếu bị tạm dừng
3. Kiểm tra edge function logs
4. Kiểm tra API quota
```

## ⚡ Lỗi hiệu suất

### Lỗi: "Page loading slow"

**Nguyên nhân:**
- Quá nhiều projects
- Database query chậm
- Network chậm

**Giải pháp:**
```
1. Clear browser cache
2. Refresh trang
3. Kiểm tra network speed
4. Liên hệ support nếu vẫn chậm
```

### Lỗi: "Story Graph query slow"

**Nguyên nhân:**
- Quá nhiều chapters
- Index không tối ưu
- Database overload

**Giải pháp:**
```
1. Giảm số chương query (từ 10 xuống 5)
2. Kiểm tra database indexes
3. Liên hệ support để optimize
```

### Lỗi: "Job taking too long (>5 minutes)"

**Nguyên nhân:**
- AI model chậm
- Prompt quá dài
- Refine content nhiều lần

**Giải pháp:**
```
1. Thử model nhanh hơn (GPT-3.5)
2. Giảm target_chapter_length
3. Giảm temperature
4. Đơn giản hóa prompt
```

## 🐛 Lỗi khác

### Lỗi: "Database connection lost"

**Nguyên nhân:**
- Supabase service down
- Network error
- Connection pool exhausted

**Giải pháp:**
```
1. Kiểm tra Supabase status page
2. Refresh trang
3. Đợi 5 phút và thử lại
4. Liên hệ Supabase support
```

### Lỗi: "Edge function timeout"

**Nguyên nhân:**
- Function chạy quá 30s
- Cold start
- Heavy computation

**Giải pháp:**
```
1. Thử lại (cold start chỉ xảy ra lần đầu)
2. Optimize function code
3. Tăng memory limit
4. Split thành nhiều functions nhỏ
```

### Lỗi: "CORS error"

**Nguyên nhân:**
- Edge function không có CORS headers
- Browser blocking request

**Giải pháp:**
```
1. Kiểm tra CORS headers trong edge function
2. Thêm OPTIONS handler
3. Kiểm tra browser console
4. Disable browser extensions
```

### Lỗi: "RLS policy violation"

**Nguyên nhân:**
- User không có quyền truy cập
- RLS policy sai
- user_id không khớp

**Giải pháp:**
```
1. Kiểm tra user_id trong database
2. Kiểm tra RLS policies
3. Logout và login lại
4. Liên hệ admin để cấp quyền
```

## 🔍 Debug Tools

### 1. Browser Console

```javascript
// Mở console (F12)
// Xem errors
console.error()

// Xem network requests
Network tab → Filter by "ai-writer"

// Xem local storage
Application → Local Storage → Check JWT token
```

### 2. Supabase Logs

```
1. Vào Supabase Dashboard
2. Project → Logs
3. Filter by:
   - Edge Functions
   - Database
   - Auth
4. Tìm error messages
```

### 3. API Testing

```bash
# Test API endpoint
curl -X POST https://your-domain.com/api/ai-writer/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId": "uuid"}'
```

### 4. Database Queries

```sql
-- Check job status
SELECT * FROM ai_writing_jobs 
WHERE id = 'job-id' 
ORDER BY created_at DESC;

-- Check project status
SELECT * FROM ai_story_projects 
WHERE id = 'project-id';

-- Check story graph
SELECT * FROM story_graph_nodes 
WHERE project_id = 'project-id' 
ORDER BY chapter_number DESC 
LIMIT 10;
```

## 📞 Liên hệ Support

Nếu vẫn không giải quyết được:

**Email:** support@example.com

**Discord:** [Join our server](https://discord.gg/example)

**GitHub Issues:** [github.com/example/issues](https://github.com/example/issues)

**Thông tin cần cung cấp:**
1. Mô tả lỗi chi tiết
2. Screenshot (nếu có)
3. Browser console logs
4. Steps to reproduce
5. User ID / Project ID
6. Timestamp khi lỗi xảy ra

---

**Last Updated**: 2025-01-30
**Version**: 1.0.0