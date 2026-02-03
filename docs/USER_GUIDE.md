# User Guide - AI Story Writer

## 📖 Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Bắt đầu](#bắt-đầu)
3. [Tạo dự án mới](#tạo-dự-án-mới)
4. [Viết chương](#viết-chương)
5. [Viết hàng loạt](#viết-hàng-loạt)
6. [Lịch tự động](#lịch-tự-động)
7. [Quản lý dự án](#quản-lý-dự-án)
8. [Tips & Tricks](#tips--tricks)
9. [FAQ](#faq)

## 🎯 Giới thiệu

AI Story Writer là công cụ giúp bạn viết truyện tự động bằng AI. Chỉ cần **1 click**, AI sẽ sinh ra chương truyện hoàn chỉnh dài 2000-3000 từ, mạch lạc với 100+ chương trước đó.

### Tính năng chính

- ✅ **1-Click Writing**: Click "Viết tiếp" → Đợi 2-3 phút → Có chương mới
- ✅ **Story Graph**: AI "nhớ" được 100+ chương trước
- ✅ **Auto Prompt**: Không cần viết prompt thủ công
- ✅ **Quality Check**: Tự động kiểm tra độ dài, hội thoại
- ✅ **Batch Writing**: Viết 1-100 chương liên tục
- ✅ **Autopilot**: Lịch tự động viết mỗi ngày

## 🚀 Bắt đầu

### Bước 1: Đăng nhập

1. Truy cập `/login`
2. Đăng nhập bằng email/password
3. Hoặc đăng ký tài khoản mới

### Bước 2: Vào trang AI Writer

1. Click vào menu "Admin"
2. Chọn "AI Writer"
3. Hoặc truy cập trực tiếp `/admin/ai-writer`

### Bước 3: Tạo dự án đầu tiên

Click nút **"Tạo mới"** ở góc trên bên phải.

## 📝 Tạo dự án mới

### Thông tin cơ bản

**1. Tên truyện** (bắt buộc)
```
Ví dụ: "Tu Tiên Đại Đạo"
```

**2. Nhân vật chính** (bắt buộc)
```
Ví dụ: "Lâm Phong"
Lưu ý: Tên này sẽ được dùng để phát hiện mâu thuẫn
```

**3. Thể loại** (bắt buộc)
- Tiên Hiệp
- Huyền Huyễn
- Đô Thị
- Khoa Huyễn
- Lịch Sử
- Đồng Nhân
- Võng Du

### Thông tin chi tiết theo thể loại

#### Tiên Hiệp
**Hệ tu luyện** (khuyến nghị)
```
Ví dụ:
"Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Hợp Thể → Đại Thừa → Độ Kiếp"

Hoặc tự tạo:
"Võ Đồ → Võ Giả → Võ Sư → Đại Võ Sư → Võ Tông → Võ Vương → Võ Hoàng → Võ Đế"
```

#### Huyền Huyễn
**Hệ phép thuật**
```
Ví dụ:
"Học Đồ → Pháp Sư → Đại Pháp Sư → Ma Đạo Sư → Ma Đạo Thánh → Ma Thần"
```

#### Đô Thị
**Bối cảnh hiện đại**
```
Ví dụ:
"Thành phố Thượng Hải năm 2024, nhân vật chính là CEO công ty công nghệ"
```

#### Khoa Huyễn
**Trình độ công nghệ**
```
Ví dụ:
"Năm 2500, nhân loại đã chinh phục 100 hành tinh, có công nghệ du hành không gian"
```

#### Lịch Sử
**Thời kỳ lịch sử**
```
Ví dụ:
"Tam Quốc thời kỳ, năm 208, trước trận Xích Bích"
```

#### Đồng Nhân
**Tác phẩm gốc**
```
Ví dụ:
"Naruto - Nhân vật chính xuyên không vào thế giới Naruto"
```

#### Võng Du
**Hệ thống game**
```
Ví dụ:
"Game MMORPG với hệ thống level, skill, equipment"
```

### Mô tả thế giới (khuyến nghị)

Viết 100-200 từ mô tả thế giới truyện:

```
Ví dụ (Tiên Hiệp):
"Đại Lục Tu Tiên, nơi tu sĩ tranh đấu để đạt đến đỉnh cao tu luyện. 
Có 5 đại tông môn: Thiên Kiếm Tông, Huyền Thiên Tông, Vạn Pháp Tông, 
Thái Hư Tông, và Ma Đạo Tông. Ngoài ra còn vô số tiểu tông môn và 
tán tu. Linh khí trời đất dồi dào, có nhiều di tích cổ đại chứa 
bảo vật và công pháp mạnh."
```

### Cài đặt nâng cao

**1. Độ dài chương mục tiêu**
- Mặc định: 2500 từ
- Khuyến nghị: 2000-3000 từ
- Tối thiểu: 1500 từ

**2. AI Model**
- `gpt-4-turbo`: Chất lượng cao nhất (khuyến nghị)
- `claude-3-opus`: Sáng tạo, văn phong đẹp
- `qwen-max`: Nhanh, giá rẻ

**3. Temperature**
- 0.7: Cân bằng (khuyến nghị)
- 0.5: Ổn định, ít sáng tạo
- 0.9: Sáng tạo, có thể lạc đề

**4. Số chương dự kiến**
- Mặc định: 100 chương
- Có thể thay đổi sau

### Lưu dự án

Click **"Tạo dự án"** → Dự án sẽ xuất hiện trong danh sách bên trái.

## ✍️ Viết chương

### Viết chương đầu tiên

1. **Chọn dự án** từ danh sách bên trái
2. Click nút **"Viết tiếp"**
3. Đợi 2-3 phút
4. Xem preview chương

### Theo dõi tiến độ

Trong khi AI viết, bạn sẽ thấy:

```
[5%] Đang khởi tạo...
[10%] Đang phân tích ngữ cảnh...
[25%] Đang tạo prompt...
[40%] Đang viết nội dung...
[65%] Đang kiểm tra chất lượng...
[75%] Đang phát hiện mâu thuẫn...
[80%] Đang cập nhật Story Graph...
[90%] Đang lưu chương...
[100%] Hoàn thành!
```

### Xem chương vừa viết

Sau khi hoàn thành, bạn có thể:

1. **Xem preview** ngay trên dashboard
2. Click **"Xem chương"** để đọc full
3. Click **"Viết lại"** nếu không hài lòng
4. Click **"Xóa"** để xóa chương

### Viết chương tiếp theo

Sau khi hài lòng với chương hiện tại:

1. Click **"Viết tiếp"** lần nữa
2. AI sẽ tự động lấy context từ chương trước
3. Lặp lại cho đến khi đủ số chương

## 📚 Viết hàng loạt

### Khi nào dùng Batch Writing?

- Bạn muốn viết nhiều chương cùng lúc
- Bạn đã hài lòng với 5-10 chương đầu
- Bạn muốn tiết kiệm thời gian

### Cách sử dụng

1. **Chuyển sang tab "Viết hàng loạt"**
2. **Chọn dự án** (nếu chưa chọn)
3. **Nhập số chương** cần viết (1-100)
4. Click **"Bắt đầu viết"**

### Theo dõi tiến độ

```
Đang viết 3/10 chương...
[████████░░░░░░░░░░] 30%
```

Mỗi chương hoàn thành sẽ có toast notification:
```
✅ Hoàn thành chương 3/10
```

### Xử lý lỗi

Nếu có chương bị lỗi:
```
❌ Chương 5 thất bại, dừng batch writing
```

Bạn có thể:
1. Kiểm tra lỗi
2. Sửa dự án nếu cần
3. Chạy lại batch từ chương 5

### Lưu ý quan trọng

⚠️ **Không đóng trình duyệt** trong khi batch writing đang chạy!

⏱️ **Thời gian ước tính:**
- 10 chương: ~25 phút
- 50 chương: ~2 giờ
- 100 chương: ~4 giờ

## 📅 Lịch tự động

### Khi nào dùng Autopilot?

- Bạn muốn truyện tự động cập nhật mỗi ngày
- Bạn không có thời gian viết thủ công
- Bạn muốn duy trì tần suất đăng đều

### Tạo lịch mới

1. **Chuyển sang tab "Lịch tự động"**
2. Click **"Tạo lịch mới"**
3. Điền thông tin:

**Chọn dự án**
```
Chọn từ dropdown
```

**Giờ chạy** (UTC)
```
Ví dụ: 02:00 (UTC) = 09:00 (GMT+7)
```

**Số chương mỗi lần**
```
Khuyến nghị: 1-2 chương/ngày
```

**Bắt đầu ngay**
```
☑️ Chạy ngay lập tức (không đợi đến giờ đã chọn)
```

4. Click **"Tạo lịch"**

### Quản lý lịch

**Tạm dừng lịch**
```
Click nút "Pause" → Lịch sẽ không chạy nữa
```

**Kích hoạt lại**
```
Click nút "Resume" → Lịch sẽ chạy lại
```

**Xóa lịch**
```
Click nút "Delete" → Xác nhận xóa
```

### Xem lịch sử chạy

Mỗi lịch sẽ hiển thị:
- Lần chạy cuối: `2025-01-30 09:00`
- Lần chạy tiếp: `2025-01-31 09:00`
- Trạng thái: `Đang hoạt động` / `Tạm dừng`

## 🎛️ Quản lý dự án

### Chỉnh sửa dự án

1. Click icon **"Edit"** trên project card
2. Thay đổi thông tin cần thiết
3. Click **"Lưu thay đổi"**

### Tạm dừng/Kích hoạt dự án

Click nút **"Pause"** / **"Resume"** trên project card.

**Khi tạm dừng:**
- Không thể viết chương mới
- Lịch tự động sẽ không chạy
- Dữ liệu vẫn được giữ nguyên

### Xem lịch sử viết

Mỗi dự án hiển thị:
- Số chương hiện tại: `42/100`
- Trạng thái: `Đang hoạt động` / `Tạm dừng`
- Ngày tạo: `2025-01-15`

### Xem các job gần đây

Trong Writing Interface, bạn sẽ thấy danh sách các job:

```
Chương 42 - Hoàn thành - 2025-01-30 10:30
Chương 41 - Hoàn thành - 2025-01-29 10:30
Chương 40 - Thất bại - 2025-01-28 10:30
```

Click vào job để xem chi tiết.

## 💡 Tips & Tricks

### 1. Viết mô tả thế giới chi tiết

✅ **Tốt:**
```
"Đại Lục Tu Tiên với 5 đại tông môn, linh khí dồi dào, 
có nhiều di tích cổ đại. Tu sĩ chia làm Chính Đạo và Ma Đạo, 
thường xuyên xung đột."
```

❌ **Không tốt:**
```
"Thế giới tu tiên"
```

### 2. Chỉ định hệ tu luyện rõ ràng

✅ **Tốt:**
```
"Luyện Khí (1-9 tầng) → Trúc Cơ (Sơ/Trung/Hậu kỳ) → 
Kim Đan (Sơ/Trung/Hậu kỳ) → ..."
```

❌ **Không tốt:**
```
"Có hệ tu luyện"
```

### 3. Review 5-10 chương đầu

- Chương đầu rất quan trọng
- Nếu không hài lòng, viết lại ngay
- Sau 10 chương, AI sẽ ổn định hơn

### 4. Dùng GPT-4 cho chương quan trọng

- Chương đầu (1-3)
- Chương climax
- Chương kết
- Các chương khác có thể dùng GPT-3.5

### 5. Kiểm tra mâu thuẫn định kỳ

- Sau mỗi 10 chương
- Xem log contradiction detection
- Sửa lại nếu cần

### 6. Backup dữ liệu

- Export chapters định kỳ
- Lưu vào Google Drive / Dropbox
- Phòng trường hợp mất dữ liệu

## ❓ FAQ

### Q: Mất bao lâu để viết 1 chương?

**A:** 2-3 phút với GPT-4, 1-2 phút với GPT-3.5.

### Q: Có thể viết bao nhiêu chương cùng lúc?

**A:** Tối đa 100 chương với Batch Writing.

### Q: AI có thể viết tiếng Việt không?

**A:** Có, AI được train để viết tiếng Việt tự nhiên.

### Q: Làm sao để AI "nhớ" chương cũ?

**A:** AI sử dụng Story Graph để lưu trữ summary của mỗi chương.

### Q: Có thể thay đổi AI model giữa chừng không?

**A:** Có, edit dự án và chọn model mới.

### Q: Làm sao để AI viết theo phong cách riêng?

**A:** Điều chỉnh `temperature` và viết mô tả thế giới chi tiết.

### Q: Có thể viết nhiều truyện cùng lúc không?

**A:** Có, tạo nhiều dự án và chuyển đổi giữa chúng.

### Q: Làm sao để dừng job đang chạy?

**A:** Click nút "Dừng" trong Writing Interface.

### Q: Có thể xóa chương đã viết không?

**A:** Có, click nút "Xóa" trong chapter preview.

### Q: Làm sao để viết lại chương?

**A:** Click "Viết lại" → Chương cũ sẽ bị xóa và viết chương mới.

### Q: Autopilot có chạy khi tắt máy không?

**A:** Có, autopilot chạy trên server, không cần máy bật.

### Q: Có giới hạn số chương không?

**A:** Không, bạn có thể viết không giới hạn.

### Q: Có thể export truyện ra file không?

**A:** Hiện tại chưa có, sẽ có trong phiên bản sau.

### Q: Làm sao để báo lỗi?

**A:** Email: support@example.com hoặc Discord.

---

**Cần hỗ trợ thêm?**
- 📧 Email: support@example.com
- 💬 Discord: [Join our server](https://discord.gg/example)
- 📚 Docs: [docs.example.com](https://docs.example.com)