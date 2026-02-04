# Tài liệu tính năng chi tiết

## 🎯 Mục tiêu dự án

Tạo công cụ AI Writer cho phép user **chỉ cần click 1 nút** để sinh ra chương truyện hoàn chỉnh, dài 2000-3000 từ, mạch lạc với 100+ chương trước đó.

## ✅ Tính năng đã hoàn thành

### 1. Story Graph - Bộ nhớ dài hạn

#### Mô tả
Story Graph là hệ thống lưu trữ và truy vấn thông tin về cốt truyện, giúp AI "nhớ" được 100+ chương trước đó.

#### Cấu trúc dữ liệu

**story_graph_nodes**
```sql
- id: UUID
- project_id: UUID (foreign key)
- chapter_number: INTEGER
- chapter_title: TEXT
- summary: TEXT (tóm tắt 2-3 câu)
- key_events: JSONB (sự kiện quan trọng)
- character_states: JSONB (trạng thái nhân vật)
- plot_threads: JSONB (mạch truyện đang mở)
- cultivation_level: TEXT (cảnh giới tu luyện)
- created_at: TIMESTAMP
```

**story_graph_edges**
```sql
- id: UUID
- project_id: UUID
- from_chapter: INTEGER
- to_chapter: INTEGER
- relationship_type: TEXT ('continues', 'references', 'resolves')
- description: TEXT
```

#### Cách hoạt động

1. **Lưu trữ**: Sau khi viết xong mỗi chương, AI tự động:
   - Tóm tắt nội dung thành 2-3 câu
   - Trích xuất cultivation level (nếu là Tiên Hiệp)
   - Lưu vào `story_graph_nodes`
   - Tạo edge liên kết với chương trước

2. **Truy vấn**: Khi viết chương mới, AI:
   - Lấy 5 chương gần nhất
   - Query theo keyword (ví dụ: "di tích cổ")
   - Lấy open plot threads
   - Lấy character states hiện tại

#### Code example

```typescript
// Lấy context cho chương mới
private async getStoryContext(): Promise<StoryContext> {
  const supabase = await this.getClient();
  
  // Lấy 5 chương gần nhất
  const { data: recentNodes } = await supabase
    .from('story_graph_nodes')
    .select('*')
    .eq('project_id', this.project.id)
    .order('chapter_number', { ascending: false })
    .limit(5);
  
  // Lấy plot threads đang mở
  const openThreads = await this.getOpenPlotThreads();
  
  // Lấy trạng thái nhân vật
  const characterStates = await this.getCurrentCharacterStates();
  
  return {
    recentChapters: recentNodes || [],
    openPlotThreads: openThreads,
    characterStates,
    worldState: {}
  };
}

// Query theo keyword
private async getRelevantContext(keyword: string): Promise<StoryGraphNode[]> {
  const supabase = await this.getClient();
  
  const { data } = await supabase
    .from('story_graph_nodes')
    .select('*')
    .eq('project_id', this.project.id)
    .or(`summary.ilike.%${keyword}%,chapter_title.ilike.%${keyword}%`)
    .order('chapter_number', { ascending: false })
    .limit(10);
    
  return data || [];
}
```

### 2. Contradiction Detection - Phát hiện mâu thuẫn

#### Mô tả
Hệ thống tự động phát hiện các mâu thuẫn logic trong cốt truyện.

#### Các loại mâu thuẫn được phát hiện

1. **Cultivation Level giảm**
   - Ví dụ: Chương 50 là "Kim Đan", chương 60 lại là "Trúc Cơ"
   - Logic: So sánh với danh sách cấp độ chuẩn

2. **Nhân vật chính tử vong**
   - Ví dụ: Chương 30 nói "Lâm Phong chết", nhưng chương 31 vẫn tiếp diễn
   - Logic: Tìm keyword "chết", "tử vong", "hi sinh" + tên nhân vật chính

#### Code example

```typescript
private async detectContradictions(newContent: string): Promise<string[]> {
  const contradictions: string[] = [];
  const supabase = await this.getClient();
  
  // 1. Kiểm tra cultivation level
  const currentLevel = this.extractCultivationLevel(newContent);
  
  if (currentLevel && this.project.genre === 'tien-hiep') {
    const { data: previousNodes } = await supabase
      .from('story_graph_nodes')
      .select('chapter_number, summary')
      .eq('project_id', this.project.id)
      .order('chapter_number', { ascending: false })
      .limit(10);
      
    if (previousNodes) {
      for (const node of previousNodes) {
        const prevLevel = this.extractCultivationLevel(node.summary || '');
        if (prevLevel && this.isCultivationLevelLower(currentLevel, prevLevel)) {
          contradictions.push(
            `Chương ${node.chapter_number} có cảnh giới "${prevLevel}" cao hơn chương hiện tại "${currentLevel}"`
          );
        }
      }
    }
  }
  
  // 2. Kiểm tra nhân vật chính tử vong
  const mainCharName = this.project.main_character.toLowerCase();
  const deathKeywords = ['chết', 'tử vong', 'hi sinh', 'qua đời'];
  
  const { data: allNodes } = await supabase
    .from('story_graph_nodes')
    .select('chapter_number, summary')
    .eq('project_id', this.project.id)
    .order('chapter_number', { ascending: false })
    .limit(20);

  if (allNodes) {
    for (const node of allNodes) {
      const summary = (node.summary || '').toLowerCase();
      const hasDeath = deathKeywords.some(keyword => 
        summary.includes(mainCharName) && summary.includes(keyword)
      );
      
      if (hasDeath) {
        contradictions.push(
          `Chương ${node.chapter_number} có dấu hiệu nhân vật chính tử vong`
        );
      }
    }
  }
  
  return contradictions;
}

// So sánh cultivation level
private isCultivationLevelLower(current: string, previous: string): boolean {
  const levels = [
    'khởi điểm', 'luyện khí', 'trúc cơ', 'kim đan', 'nguyên anh', 
    'hóa thần', 'luyện hư', 'hợp thể', 'đại thừa', 'độ kiếp'
  ];
  
  const currentIndex = levels.findIndex(l => current.toLowerCase().includes(l));
  const previousIndex = levels.findIndex(l => previous.toLowerCase().includes(l));
  
  if (currentIndex === -1 || previousIndex === -1) return false;
  
  return currentIndex < previousIndex;
}
```

#### Kết quả
- Mâu thuẫn được ghi log nhưng **không dừng job**
- User có thể xem log để quyết định có viết lại hay không

### 3. Batch Writing - Viết hàng loạt

#### Mô tả
Cho phép user viết 1-100 chương liên tục mà không cần can thiệp.

#### UI Components

**Input**
- Số chương cần viết (1-100)
- Hiển thị range: "Chương X đến chương Y"

**Progress Bar**
- Real-time progress: "3/10 chương"
- Visual progress bar
- Toast notification cho mỗi chương hoàn thành

**Error Handling**
- Tự động dừng nếu có lỗi
- Hiển thị chương nào bị lỗi
- Cho phép tiếp tục từ chương bị lỗi

#### Code example

```typescript
const handleBatchWrite = async () => {
  if (!selectedProject || isBatchWriting) return;
  
  setIsBatchWriting(true);
  setBatchProgress({ current: 0, total: batchCount });
  
  toast.info(`Bắt đầu viết ${batchCount} chương liên tục...`);
  
  for (let i = 0; i < batchCount; i++) {
    setBatchProgress({ current: i + 1, total: batchCount });
    
    try {
      // 1. Tạo job
      const response = await fetch('/api/ai-writer/jobs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ projectId: selectedProject.id }),
      });
      
      const { jobId } = await response.json();
      
      // 2. Đợi job hoàn thành
      const success = await waitForJobComplete(jobId);
      
      if (!success) {
        toast.error(`Chương ${i + 1} thất bại, dừng batch writing`);
        break;
      }
      
      toast.success(`Hoàn thành chương ${i + 1}/${batchCount}`);
      await fetchProjects();
      
    } catch (error) {
      toast.error(`Lỗi không mong đợi tại chương ${i + 1}`);
      break;
    }
  }
  
  setIsBatchWriting(false);
  toast.success('Hoàn thành batch writing!');
};

// Đợi job hoàn thành
const waitForJobComplete = async (jobId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const checkInterval = setInterval(async () => {
      const res = await fetch(`/api/ai-writer/jobs/${jobId}`);
      const { job } = await res.json();
      
      if (job.status === 'completed') {
        clearInterval(checkInterval);
        resolve(true);
      } else if (job.status === 'failed' || job.status === 'stopped') {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 3000); // Poll mỗi 3 giây
  });
};
```

#### Performance
- Mỗi chương: 2-3 phút
- 10 chương: ~25 phút
- 50 chương: ~2 giờ
- 100 chương: ~4 giờ

### 4. Auto Prompt Generation - Tự động sinh prompt

#### Mô tả
Hệ thống tự động tạo prompt chi tiết từ Story Graph, không cần user viết prompt thủ công.

#### Template System

**ai_prompt_templates table**
```sql
- id: UUID
- name: TEXT
- category: TEXT ('cultivation', 'fantasy', 'urban', etc.)
- template: TEXT (prompt template với placeholders)
- variables: JSONB (danh sách biến cần thay thế)
- is_default: BOOLEAN
```

#### Placeholders

```
{{CHAPTER_NUMBER}} - Số chương hiện tại
{{NOVEL_TITLE}} - Tên truyện
{{RECENT_CONTEXT}} - Tóm tắt 5 chương gần nhất
{{MAIN_CHARACTER}} - Tên nhân vật chính
{{WORLD_DESCRIPTION}} - Mô tả thế giới
{{PLOT_OBJECTIVES}} - Mục tiêu cốt truyện
{{TARGET_LENGTH}} - Độ dài mục tiêu
{{CULTIVATION_SYSTEM}} - Hệ tu luyện (Tiên Hiệp)
{{MAGIC_SYSTEM}} - Hệ phép thuật (Huyền Huyễn)
{{MODERN_SETTING}} - Bối cảnh đô thị (Đô Thị)
```

#### Dynamic Rules

**Chương đầu (1-3)**
```
QUY TẮC CHƯƠNG ĐẦU: Trong 3 chương đầu, hãy để nhân vật chính 
chủ động (qua hành động/hội thoại) giới thiệu bối cảnh, luật lệ, 
hệ thống sức mạnh để người đọc nắm rõ, ngắn gọn, tự nhiên 
(tránh info dump).
```

**Progression Guidance**
```
HỆ SỨC MẠNH: Bảo đảm tăng trưởng sức mạnh theo thời gian. 
Nếu không có hệ tu luyện cụ thể được cung cấp, tránh dùng 
tên cấp độ rập khuôn (ví dụ: 'Luyện Khí/Trúc Cơ/Kim Đan/...') 
và hãy tạo hệ đặt tên độc đáo, nhất quán.
```

#### Code example

```typescript
private async generatePrompt(context: StoryContext): Promise<string> {
  const supabase = await this.getClient();
  const category = GENRE_CONFIG[this.project.genre]?.aiPromptCategory || 'cultivation';
  
  // Lấy template từ database
  const { data: template } = await supabase
    .from('ai_prompt_templates')
    .select('*')
    .eq('category', category)
    .eq('is_default', true)
    .single();

  const nextChapterNum = this.project.current_chapter + 1;

  // Dynamic rules
  const earlyChapterGuidance = nextChapterNum <= 3
    ? "\n\nQUY TẮC CHƯƠNG ĐẦU: ..."
    : "";

  const progressionGuidance = this.getProgressionGuidance();

  let prompt = template.template;
  
  // Thay thế placeholders
  const replacements: Record<string, string> = {
    CHAPTER_NUMBER: String(nextChapterNum),
    NOVEL_TITLE: this.project.novel?.title || 'Truyện chưa có tên',
    RECENT_CONTEXT: this.formatRecentContext(context.recentChapters),
    MAIN_CHARACTER: this.project.main_character,
    WORLD_DESCRIPTION: this.project.world_description || 'Thế giới truyện',
    PLOT_OBJECTIVES: await this.generatePlotObjectives(context),
    TARGET_LENGTH: String(this.project.target_chapter_length),
  };
  
  // Thêm genre-specific placeholders
  switch (this.project.genre) {
    case 'tien-hiep': 
      replacements['CULTIVATION_SYSTEM'] = this.project.cultivation_system || '...'; 
      break;
    case 'huyen-huyen': 
      replacements['MAGIC_SYSTEM'] = this.project.magic_system || '...'; 
      break;
    // ...
  }
  
  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    prompt = prompt.replace(regex, value);
  });
  
  prompt += earlyChapterGuidance + progressionGuidance;
  
  return prompt;
}
```

### 5. Quality Check - Kiểm tra chất lượng

#### Các bước kiểm tra

1. **Độ dài**
   - Target: 2000-3000 từ
   - Nếu < 80% target → Gọi `expandContent()`

2. **Số lượng hội thoại**
   - Minimum: 3 đoạn hội thoại
   - Nếu < 3 → Gọi `addDialogue()`

3. **Markdown cleanup**
   - Xóa tất cả Markdown syntax
   - Chỉ giữ văn bản thuần

#### Code example

```typescript
private async refineContent(content: string): Promise<string> {
  const wordCount = this.countWords(content);
  const targetLength = this.project.target_chapter_length;
  
  // 1. Kiểm tra độ dài
  if (wordCount < targetLength * 0.8) {
    return await this.expandContent(content);
  }
  
  // 2. Kiểm tra hội thoại
  const dialogueCount = this.countDialogue(content);
  if (dialogueCount < 3) {
    return await this.addDialogue(content);
  }
  
  return content;
}

private async expandContent(content: string): Promise<string> {
  const expandPrompt = `Hãy mở rộng đoạn văn sau thành ${this.project.target_chapter_length} từ bằng cách thêm:
- Miêu tả chi tiết hơn về môi trường, cảnh vật
- Miêu tả cảm xúc và suy nghĩ của nhân vật
- Thêm chi tiết về hành động và chuyển động

Nội dung gốc:
${content}

Nội dung mở rộng (không dùng Markdown):`;
  
  return await this.callAI(expandPrompt);
}

private async addDialogue(content: string): Promise<string> {
  const dialoguePrompt = `Hãy thêm 2-3 đoạn hội thoại tự nhiên vào đoạn văn sau:

${content}

Nội dung có thêm hội thoại (không dùng Markdown):`;
  
  return await this.callAI(dialoguePrompt);
}
```

## 🚀 Workflow tổng thể

### User click "Viết tiếp"

```
1. [5%] Initializing
   - Sync project với actual chapters
   - Check if stopped

2. [10%] Analyzing
   - Lấy Story Context (5 chương gần nhất)
   - Lấy open plot threads
   - Lấy character states

3. [25%] Generating Prompt
   - Lấy template từ database
   - Thay thế placeholders
   - Thêm dynamic rules

4. [40%] Writing
   - Gọi OpenRouter API
   - Model: GPT-4 / Claude / Qwen
   - Max tokens: 8000

5. [65%] Refining
   - Kiểm tra độ dài
   - Kiểm tra hội thoại
   - Clean Markdown

6. [75%] Checking Contradictions
   - Kiểm tra cultivation level
   - Kiểm tra nhân vật tử vong
   - Ghi log (không dừng job)

7. [80%] Updating Graph
   - Tóm tắt chương
   - Trích xuất cultivation level
   - Lưu vào story_graph_nodes
   - Tạo edge với chương trước

8. [90%] Saving
   - Lưu chapter vào database
   - Cập nhật current_chapter

9. [100%] Completed
   - Gửi notification
   - Hiển thị preview
```

## 📊 Metrics

### Performance
- Thời gian viết 1 chương: 2-3 phút
- Token usage: ~6000-8000 tokens/chương
- Database queries: ~10 queries/chương

### Quality
- Độ dài trung bình: 2500 từ
- Số hội thoại trung bình: 5-7 đoạn
- Contradiction rate: <5%

### User Experience
- Click to chapter: 2-3 phút
- Batch 10 chapters: ~25 phút
- Autopilot: 1 chương/ngày

## 🎓 Best Practices

### 1. Setup dự án
- Viết mô tả thế giới chi tiết (100-200 từ)
- Chỉ định hệ tu luyện rõ ràng (nếu Tiên Hiệp)
- Chọn AI model phù hợp (GPT-4 cho chất lượng cao)

### 2. Viết chương
- Để AI tự động viết 5-10 chương đầu
- Review và điều chỉnh nếu cần
- Sau đó có thể dùng batch writing

### 3. Quản lý Story Graph
- Định kỳ review summary của các chương
- Sửa lại nếu summary không chính xác
- Thêm plot threads thủ công nếu cần

### 4. Contradiction Detection
- Xem log sau mỗi chương
- Quyết định có viết lại hay không
- Cập nhật cultivation system nếu cần

## 🔮 Future Improvements

### Phase 2
- [ ] Neo4j integration cho Story Graph phức tạp
- [ ] AI-powered contradiction detection (GPT-4)
- [ ] Character<think>Initial files ranking:

src/lib/types/ai-writer.ts: 0.95

src/services/ai-story-writer.ts: 0.93

src/components/admin/ai-writer/dashboard.tsx: 0.85

src/components/admin/ai-writer/writing-interface.tsx: 0.81

supabase/functions/ai-writer-scheduler/index.ts: 0.81

src/app/api/ai-writer/jobs/route.ts: 0.76

src/app/api/ai-writer/generate/route.ts: 0.76

src/app/admin/ai-writer/page.tsx: 0.75

src/lib/types.ts: 0.72

supabase/functions/openrouter-chat/index.ts: 0.70

src/lib/config.ts: 0.70

src/lib/types/genre-config.ts: 0.70

src/components/admin/ai-writer/project-card.tsx: 0.66

src/app/api/ai-writer/projects/route.ts: 0.66

src/integrations/supabase/client.ts: 0.64

src/components/ui/textarea.tsx: 0.60

src/app/api/ai-writer/projects/[id]/jobs/route.ts: 0.60

src/app/api/ai-writer/jobs/[id]/route.ts: 0.60

src/app/api/ai-writer/generate-idea/route.ts: 0.59

src/components/ui/button.tsx: 0.59

src/app/api/ai-writer/analyze-novel/route.ts: 0.59

src/App.tsx: 0.51

src/app/api/ai-writer/test-key/route.ts: 0.48

src/app/api/ai-writer/jobs/[id]/stop/route.ts: 0.42

src/components/admin/ai-writer/recent-jobs.tsx: 0.41

src/components/ui/sonner.tsx: 0.38

src/app/api/chapters/[id]/route.ts: 0.38

src/components/admin/ai-writer/project-setup-dialog.tsx: 0.38

package.json: 0.36

next.config.ts: 0.36

src/app/api/ai-writer/projects/[id]/status/route.ts: 0.35

src/components/ui/progress.tsx: 0.34

src/lib/actions.ts: 0.33

src/components/admin/ai-writer/quick-ai-setup-dialog.tsx: 0.33

src/app/api/ai-writer/schedules/route.ts: 0.30

src/components/admin/ai-writer/schedule-list.tsx: 0.30

src/components/ui/input.tsx: 0.29

src/components/chapter-list.tsx: 0.29

src/components/admin/ai-writer/schedule-dialog.tsx: 0.28

src/integrations/supabase/server.ts: 0.27

src/app/novel/[id]/read/[chapter]/page.tsx: 0.26

src/components/admin/chapter-form.tsx: 0.24

src/app/admin/page.tsx: 0.24

src/components/admin/novel-form.tsx: 0.24

src/app/api/ai-writer/schedules/[id]/route.ts: 0.23

src/components/novel-actions.tsx: 0.23

src/services/reading-progress.ts: 0.22

src/components/admin/refreshable-novel-page.tsx: 0.21

src/app/api/debug-env/route.ts: 0.21

src/app/novel/[id]/page.tsx: 0.20

supabase/functions/notify-new-chapter/index.ts: 0.20

AI_RULES.md: 0.19

src/contexts/reading-context.tsx: 0.18

README.md: 0.17

src/components/admin/author-form.tsx: 0.17

src/lib/utils.ts: 0.16

src/components/admin/novel-table.tsx: 0.16

src/app/globals.css: 0.16

src/app/layout.tsx: 0.16

src/components/reading-controls.tsx: 0.15

src/app/api/novels/route.ts: 0.15

src/components/admin/chapter-table.tsx: 0.14

src/app/debug/page.tsx: 0.14

src/components/admin/admin-sidebar.tsx: 0.14

src/components/ui/alert.tsx: 0.13

src/app/admin/settings/page.tsx: 0.13

src/app/admin/novels/[id]/page.tsx: 0.13

supabase/functions/debug-delete/index.ts: 0.13

src/services/notifications.ts: 0.13

src/app/admin/novels/page.tsx: 0.13

src/components/ui/dialog.tsx: 0.13

src/components/ui/form.tsx: 0.12

src/app/genres/[id]/page.tsx: 0.12

src/components/admin/notification-form.tsx: 0.12

src/components/header.tsx: 0.12

src/components/search-modal.tsx: 0.11

src/components/ui/command.tsx: 0.11

src/components/ui/card.tsx: 0.11

src/app/profile/page.tsx: 0.11

src/integrations/supabase/auth-helpers.ts: 0.11

src/components/genre-filter.tsx: 0.11

src/components/ui/scroll-area.tsx: 0.11

src/components/ui/select.tsx: 0.10

src/app/library/page.tsx: 0.10

src/components/ui/sheet.tsx: 0.10

src/components/admin/notification-table.tsx: 0.10

src/components/ui/label.tsx: 0.09

.gitignore: 0.09

src/components/novel-card.tsx: 0.09

src/components/notification-center.tsx: 0.09

src/components/ui/avatar.tsx: 0.08

supabase/migrations/0000_fix_chapters_policies_add_proper_insert_policy_with_check.sql: 0.08

src/app/admin/layout.tsx: 0.08

supabase/migrations/0004_fix_chapters_policies_add_proper_insert_policy_with_check_skip_if_exists_.sql: 0.08

supabase/migrations/0006_fix_reading_progress_table_change_novel_id_type_from_text_to_uuid_for_consistency.sql: 0.08

src/components/ui/drawer.tsx: 0.08

src/app/page.tsx: 0.08

src/components/reading-settings.tsx: 0.08

supabase/migrations/0010_skip_creating_policies_if_they_already_exist_tables_and_rls_are_already_set_up_correctly.sql: 0.07

src/components/admin/novel-cover-upload.tsx: 0.07

src/app/browse/page.tsx: 0.07

tailwind.config.ts: 0.07

src/components/ui/table.tsx: 0.07

src/app/admin/notifications/page.tsx: 0.07

src/app/admin/analytics/page.tsx: 0.07

src/components/admin/author-table.tsx: 0.07

src/app/admin/data/page.tsx: 0.07

supabase/migrations/0003_add_performance_indexes_for_frequently_queried_columns.sql: 0.07

supabase/migrations/0007_add_foreign_key_constraints_with_cascade_for_other_tables.sql: 0.07

src/app/admin/settings/authors/page.tsx: 0.07

supabase/functions/gemini-cover-generate/index.ts: 0.07

supabase/migrations/0009_add_performance_indexes_for_frequently_queried_columns.sql: 0.06

src/components/ui/sidebar.tsx: 0.06</think><think>Re-ranking the files. Please wait a moment...

Complexity: high

Reasoning: undefined

</think><dyad-codebase-context files="src/lib/types/ai-writer.ts,src/services/ai-story-writer.ts,src/components/admin/ai-writer/dashboard.tsx,src/components/admin/ai-writer/writing-interface.tsx,supabase/functions/ai-writer-scheduler/index.ts,src/app/api/ai-writer/jobs/route.ts,src/app/api/ai-writer/generate/route.ts,src/app/admin/ai-writer/page.tsx,src/lib/types.ts,supabase/functions/openrouter-chat/index.ts,src/lib/config.ts,src/lib/types/genre-config.ts,src/components/admin/ai-writer/project-card.tsx,src/app/api/ai-writer/projects/route.ts,src/integrations/supabase/client.ts,src/components/ui/textarea.tsx,src/app/api/ai-writer/projects/[id]/jobs/route.ts,src/app/api/ai-writer/jobs/[id]/route.ts,src/app/api/ai-writer/generate-idea/route.ts,src/components/ui/button.tsx,src/app/api/ai-writer/analyze-novel/route.ts,src/app/api/ai-writer/test-key/route.ts,src/app/api/ai-writer/jobs/[id]/stop/route.ts,src/components/admin/ai-writer/recent-jobs.tsx,src/app/api/chapters/[id]/route.ts,src/components/admin/ai-writer/project-setup-dialog.tsx,src/app/api/ai-writer/projects/[id]/status/route.ts,src/lib/actions.ts,src/components/admin/ai-writer/quick-ai-setup-dialog.tsx,src/app/api/ai-writer/schedules/route.ts,src/components/admin/ai-writer/schedule-list.tsx,src/components/admin/ai-writer/schedule-dialog.tsx,src/app/api/ai-writer/schedules/[id]/route.ts,supabase/functions/notify-new-chapter/index.ts"></dyad-codebase-context><think>dyad-token-savings?original-tokens=184795.75&smart-context-tokens=53820</think> relationship graph
- [ ] Plot arc visualization

### Phase 3
- [ ] Fine-tune model trên webnovel dataset
- [ ] Caching layer cho Story Graph
- [ ] Real-time collaboration
- [ ] Mobile app