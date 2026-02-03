# AI Story Writer Platform

Nền tảng viết truyện tự động bằng AI với khả năng "1 Click = 1 Chương hoàn chỉnh".

## 🚀 Tính năng chính

### ✅ Đã hoàn thành (90%)

#### 1. **Viết thủ công (Manual Writing)**
- ✅ Nút "Viết tiếp" - chỉ cần 1 click
- ✅ AI tự động sinh chương hoàn chỉnh
- ✅ Không cần viết prompt thủ công
- ✅ Preview chương real-time
- ✅ Tự động lưu vào database

#### 2. **Story Graph (Nhớ 100+ chương)**
- ✅ Lưu trữ summary mỗi chương
- ✅ Lưu mối quan hệ giữa các chương
- ✅ Tự động lấy 5 chương gần nhất làm context
- ✅ Query thông minh theo keyword
- ✅ Theo dõi cultivation level/magic level

#### 3. **Tự động sinh Prompt**
- ✅ Template system với `ai_prompt_templates`
- ✅ Tự động tạo prompt từ Story Graph
- ✅ Hỗ trợ 7 thể loại: Tiên Hiệp, Huyền Huyễn, Đô Thị, Khoa Huyễn, Lịch Sử, Đồng Nhân, Võng Du
- ✅ Tự động điều chỉnh prompt theo chương đầu/giữa/cuối

#### 4. **Kiểm tra chất lượng tự động**
- ✅ Kiểm tra độ dài (tự động mở rộng nếu quá ngắn)
- ✅ Kiểm tra số lượng hội thoại (tự động thêm nếu thiếu)
- ✅ **MỚI**: Phát hiện mâu thuẫn cultivation level
- ✅ **MỚI**: Phát hiện mâu thuẫn nhân vật chính tử vong
- ✅ Clean Markdown tự động

#### 5. **Viết hàng loạt (Batch Writing)**
- ✅ **MỚI**: UI viết 1-100 chương liên tục
- ✅ **MỚI**: Progress bar theo dõi tiến độ
- ✅ **MỚI**: Tự động dừng nếu có lỗi
- ✅ **MỚI**: Toast notification cho mỗi chương hoàn thành

#### 6. **Lịch tự động (Autopilot)**
- ✅ Thiết lập lịch viết hàng ngày
- ✅ Edge function `ai-writer-scheduler` chạy tự động
- ✅ Hỗ trợ viết nhiều chương mỗi lần
- ✅ Quản lý lịch: kích hoạt/tạm dừng/xóa

#### 7. **Thông báo (Notifications)**
- ✅ Tự động gửi thông báo khi có chương mới
- ✅ Thông báo cho users đã bookmark truyện
- ✅ Edge function `notify-new-chapter`

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI**: Shadcn/UI + Tailwind CSS
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **State**: React Context API
- **Notifications**: Sonner

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Edge Functions**: Deno
- **AI**: OpenRouter API (GPT-4, Claude, Qwen)

### AI Features
- **Story Graph**: PostgreSQL JSONB
- **Context Management**: 5 chương gần nhất + keyword search
- **Contradiction Detection**: Rule-based + cultivation level tracking
- **Prompt Templates**: Dynamic generation từ database

## 📊 Đánh giá tiến độ

| Tính năng | Mục tiêu | Thực tế | % |
|-----------|----------|---------|---|
| 1-Click Writing | ✅ | ✅ | 100% |
| Story Graph | ✅ | ✅ | 100% |
| Auto Prompt | ✅ | ✅ | 100% |
| Quality Check | ✅ | ✅ | 100% |
| Contradiction Detection | ✅ | ✅ | 100% |
| Batch Writing UI | ✅ | ✅ | 100% |
| Autopilot | ✅ | ✅ | 100% |
| **TỔNG** | | | **100%** |

## 🎯 Cách sử dụng

### 1. Tạo dự án mới
```
1. Vào /admin/ai-writer
2. Click "Tạo mới"
3. Nhập:
   - Tên truyện
   - Nhân vật chính
   - Hệ thống tu luyện (nếu là Tiên Hiệp)
   - Mô tả thế giới
4. Click "Tạo dự án"
```

### 2. Viết chương thủ công
```
1. Chọn dự án từ danh sách
2. Click "Viết tiếp"
3. Đợi 2-3 phút
4. Xem preview chương
5. Click "Xem chương" để đọc full
```

### 3. Viết hàng loạt
```
1. Chọn dự án
2. Chuyển sang tab "Viết hàng loạt"
3. Nhập số chương (1-100)
4. Click "Bắt đầu viết"
5. Theo dõi progress bar
```

### 4. Thiết lập lịch tự động
```
1. Chuyển sang tab "Lịch tự động"
2. Click "Tạo lịch mới"
3. Chọn:
   - Giờ chạy (UTC)
   - Số chương mỗi lần
   - Bắt đầu ngay (optional)
4. Click "Tạo lịch"
```

## 🔧 Cài đặt

### Prerequisites
- Node.js 18+
- Supabase account
- OpenRouter API key

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENROUTER_API_KEY=your_openrouter_key
```

### Installation
```bash
# Clone repo
git clone <repo-url>

# Install dependencies
npm install

# Run migrations
npx supabase db push

# Deploy edge functions
npx supabase functions deploy ai-writer-scheduler
npx supabase functions deploy notify-new-chapter
npx supabase functions deploy openrouter-chat

# Start dev server
npm run dev
```

## 📝 Database Schema

### Core Tables
- `novels` - Thông tin truyện
- `chapters` - Nội dung chương
- `ai_story_projects` - Dự án AI Writer
- `story_graph_nodes` - Story Graph nodes
- `story_graph_edges` - Story Graph edges
- `ai_writing_jobs` - Job tracking
- `ai_writing_schedules` - Lịch tự động
- `ai_prompt_templates` - Template prompts

### Security
- ✅ Row Level Security (RLS) enabled
- ✅ User-specific policies
- ✅ Admin override policies

## 🚀 Roadmap

### Phase 1: Core Features (✅ Hoàn thành)
- [x] 1-Click Writing
- [x] Story Graph
- [x] Auto Prompt
- [x] Quality Check
- [x] Batch Writing
- [x] Autopilot

### Phase 2: Advanced Features (🚧 Đang phát triển)
- [ ] Neo4j integration cho Story Graph phức tạp
- [ ] AI-powered contradiction detection (GPT-4)
- [ ] Character relationship graph
- [ ] Plot arc visualization
- [ ] Multi-language support

### Phase 3: Optimization (📋 Kế hoạch)
- [ ] Fine-tune model trên webnovel dataset
- [ ] Caching layer cho Story Graph
- [ ] Real-time collaboration
- [ ] Mobile app

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenRouter for AI API
- Supabase for backend infrastructure
- Shadcn/UI for beautiful components
- Next.js team for amazing framework

## 📞 Support

- Email: support@example.com
- Discord: [Join our server](https://discord.gg/example)
- Docs: [Read the docs](https://docs.example.com)

---

**Made with ❤️ by the AI Story Writer team**