-- =============================================
-- STORY FACTORY - Industrial Scale Story Generation
-- Migration: 0022_create_factory_tables.sql
-- =============================================

-- =============================================
-- 1. FACTORY CONFIG
-- =============================================
CREATE TABLE IF NOT EXISTS factory_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Idea Generation
  ideas_per_day INTEGER DEFAULT 30,
  genre_distribution JSONB DEFAULT '{
    "system-litrpg": 20,
    "urban-modern": 18,
    "romance": 15,
    "huyen-huyen": 12,
    "action-adventure": 10,
    "historical": 10,
    "tien-hiep": 8,
    "sci-fi-apocalypse": 5,
    "horror-mystery": 2
  }'::jsonb,
  
  -- Production
  max_active_stories INTEGER DEFAULT 500,
  chapters_per_story_per_day INTEGER DEFAULT 20,
  new_stories_per_day INTEGER DEFAULT 20,
  
  -- Story Parameters
  min_chapters INTEGER DEFAULT 1000,
  max_chapters INTEGER DEFAULT 2000,
  target_chapter_length INTEGER DEFAULT 2500,
  
  -- Publishing Slots (Vietnam timezone UTC+7)
  publish_slots JSONB DEFAULT '[
    {"name": "morning", "start_hour": 6, "end_hour": 10, "chapters": 7},
    {"name": "afternoon", "start_hour": 12, "end_hour": 14, "chapters": 6},
    {"name": "evening", "start_hour": 18, "end_hour": 22, "chapters": 7}
  ]'::jsonb,
  
  -- Quality Control
  min_chapter_quality DECIMAL DEFAULT 0.7,
  max_rewrite_attempts INTEGER DEFAULT 2,
  
  -- AI Settings
  ai_provider TEXT DEFAULT 'gemini',
  ai_model TEXT DEFAULT 'gemini-2.0-flash-exp',
  ai_image_model TEXT DEFAULT 'imagen-3.0-generate-001',
  ai_temperature DECIMAL DEFAULT 0.8,
  
  -- Operational
  is_running BOOLEAN DEFAULT false,
  last_daily_run TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. AI AUTHOR PROFILES
-- =============================================
CREATE TABLE IF NOT EXISTS ai_author_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  pen_name TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  
  -- Writing Style
  writing_style TEXT DEFAULT 'standard', -- dramatic, humorous, poetic, romantic, epic, dark
  tone TEXT DEFAULT 'balanced', -- serious, lighthearted, dark, emotional, exciting
  vocabulary_level TEXT DEFAULT 'standard', -- simple, standard, literary
  
  -- Specialization
  primary_genres TEXT[] DEFAULT '{}',
  secondary_genres TEXT[] DEFAULT '{}',
  avoid_genres TEXT[] DEFAULT '{}',
  
  -- AI Prompt Persona
  persona_prompt TEXT NOT NULL,
  style_examples TEXT, -- Example paragraphs showing writing style
  
  -- Stats
  total_stories INTEGER DEFAULT 0,
  total_chapters INTEGER DEFAULT 0,
  avg_quality_score DECIMAL DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active', -- active, inactive, retired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. STORY IDEAS
-- =============================================
CREATE TABLE IF NOT EXISTS story_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  genre TEXT NOT NULL,
  sub_genre TEXT,
  title TEXT NOT NULL,
  premise TEXT, -- Core story concept
  hook TEXT, -- Opening hook/first chapter idea
  usp TEXT, -- Unique Selling Point
  
  -- Story Elements
  protagonist_archetype TEXT,
  antagonist_type TEXT,
  setting_type TEXT,
  power_system_type TEXT,
  main_conflict TEXT,
  
  -- Planning
  estimated_chapters INTEGER DEFAULT 1500,
  target_audience TEXT DEFAULT 'general', -- male, female, general
  content_rating TEXT DEFAULT 'teen', -- all_ages, teen, mature, adult
  
  -- Tags for searchability
  tags TEXT[] DEFAULT '{}',
  tropes TEXT[] DEFAULT '{}',
  
  -- Lifecycle
  status TEXT DEFAULT 'generated', -- generated, approved, blueprint_created, in_production, rejected
  priority INTEGER DEFAULT 0,
  rejection_reason TEXT,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  production_started_at TIMESTAMPTZ
);

-- =============================================
-- 4. STORY BLUEPRINTS
-- =============================================
CREATE TABLE IF NOT EXISTS story_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES story_ideas(id) ON DELETE SET NULL,
  author_id UUID REFERENCES ai_author_profiles(id) ON DELETE SET NULL,
  
  -- Basic Info
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  sub_genre TEXT,
  
  -- Synopsis
  short_synopsis TEXT, -- 2-3 sentences for display
  full_synopsis TEXT, -- Detailed plot outline
  
  -- World Bible
  world_name TEXT,
  world_description TEXT,
  world_history TEXT,
  power_system JSONB, -- {name, levels: [{name, description, requirements}], rules: []}
  locations JSONB, -- [{name, description, significance}]
  factions JSONB, -- [{name, description, alignment, key_members}]
  world_rules TEXT[], -- Core rules that must be followed
  
  -- Characters
  protagonist JSONB, -- {name, age, gender, personality, appearance, background, goals, abilities, weaknesses}
  antagonists JSONB, -- Array of antagonist info
  supporting_characters JSONB, -- Array of supporting characters
  character_relationships JSONB, -- [{char1, char2, relationship, evolution}]
  
  -- Plot Structure
  total_planned_chapters INTEGER,
  arc_outlines JSONB, -- [{arc_number, title, start_chapter, end_chapter, summary, tension_curve, climax_chapter, key_events}]
  major_plot_points JSONB, -- [{chapter, event, impact}]
  planned_twists JSONB, -- [{target_chapter, twist_type, description, foreshadowing_start}]
  ending_type TEXT, -- happy, bittersweet, tragic, open
  
  -- Cover Image
  cover_prompt TEXT,
  cover_url TEXT,
  
  -- Metadata
  status TEXT DEFAULT 'generated', -- generated, cover_pending, ready, in_production
  quality_score DECIMAL,
  generation_tokens INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. PRODUCTION QUEUE
-- =============================================
CREATE TABLE IF NOT EXISTS production_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID REFERENCES story_blueprints(id) ON DELETE SET NULL,
  novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
  project_id UUID REFERENCES ai_story_projects(id) ON DELETE SET NULL,
  author_id UUID REFERENCES ai_author_profiles(id) ON DELETE SET NULL,
  
  -- Production State
  status TEXT DEFAULT 'queued', -- queued, active, writing, paused, finished, error
  priority INTEGER DEFAULT 0,
  
  -- Chapter Tracking
  current_chapter INTEGER DEFAULT 0,
  total_chapters INTEGER,
  chapters_per_day INTEGER DEFAULT 20,
  
  -- Daily Tracking (reset at midnight)
  last_write_date DATE,
  chapters_written_today INTEGER DEFAULT 0,
  
  -- Context Memory (for AI continuity)
  last_chapter_summary TEXT,
  running_plot_threads JSONB DEFAULT '[]'::jsonb,
  character_states JSONB DEFAULT '{}'::jsonb,
  
  -- Quality Stats
  total_rewrites INTEGER DEFAULT 0,
  avg_chapter_quality DECIMAL,
  quality_scores JSONB DEFAULT '[]'::jsonb, -- Last 10 chapter scores
  
  -- Error Tracking
  consecutive_errors INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  
  -- Lifecycle
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  paused_reason TEXT,
  finished_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_novel_production UNIQUE (novel_id)
);

-- =============================================
-- 6. CHAPTER WRITE QUEUE
-- =============================================
CREATE TABLE IF NOT EXISTS chapter_write_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID REFERENCES production_queue(id) ON DELETE CASCADE,
  
  -- Chapter Info
  chapter_number INTEGER NOT NULL,
  arc_number INTEGER,
  
  -- Writing State
  status TEXT DEFAULT 'pending', -- pending, writing, quality_check, rewriting, completed, failed
  attempt_count INTEGER DEFAULT 0,
  
  -- Context for writing
  previous_summary TEXT,
  plot_objectives TEXT,
  tension_target INTEGER, -- 0-100
  special_instructions TEXT,
  
  -- Result
  result_chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  content_preview TEXT, -- First 500 chars
  word_count INTEGER,
  quality_score DECIMAL,
  
  -- Error
  error_message TEXT,
  
  -- Timing
  scheduled_slot TEXT, -- morning, afternoon, evening
  scheduled_time TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. CHAPTER PUBLISH QUEUE
-- =============================================
CREATE TABLE IF NOT EXISTS chapter_publish_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID REFERENCES production_queue(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  
  -- Scheduling
  scheduled_time TIMESTAMPTZ NOT NULL,
  publish_slot TEXT, -- morning, afternoon, evening
  
  -- State
  status TEXT DEFAULT 'scheduled', -- scheduled, publishing, published, failed
  published_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 8. FACTORY STATS (Daily snapshots)
-- =============================================
CREATE TABLE IF NOT EXISTS factory_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL UNIQUE,
  
  -- Production Stats
  active_stories INTEGER DEFAULT 0,
  stories_started INTEGER DEFAULT 0,
  stories_finished INTEGER DEFAULT 0,
  stories_paused INTEGER DEFAULT 0,
  stories_errored INTEGER DEFAULT 0,
  
  -- Chapter Stats
  chapters_written INTEGER DEFAULT 0,
  chapters_published INTEGER DEFAULT 0,
  chapters_rewritten INTEGER DEFAULT 0,
  chapters_failed INTEGER DEFAULT 0,
  avg_chapter_quality DECIMAL,
  avg_chapter_length INTEGER,
  
  -- Idea Stats
  ideas_generated INTEGER DEFAULT 0,
  blueprints_created INTEGER DEFAULT 0,
  covers_generated INTEGER DEFAULT 0,
  
  -- Error Stats
  total_errors INTEGER DEFAULT 0,
  ai_errors INTEGER DEFAULT 0,
  quality_errors INTEGER DEFAULT 0,
  publish_errors INTEGER DEFAULT 0,
  
  -- AI Usage
  total_ai_calls INTEGER DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  total_image_generations INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL,
  
  -- Performance
  avg_chapter_write_time_seconds INTEGER,
  avg_idea_generation_time_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 9. FACTORY ERRORS (For admin alerts)
-- =============================================
CREATE TABLE IF NOT EXISTS factory_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  production_id UUID REFERENCES production_queue(id) ON DELETE SET NULL,
  novel_id UUID REFERENCES novels(id) ON DELETE SET NULL,
  chapter_number INTEGER,
  
  -- Error Info
  error_type TEXT NOT NULL, -- ai_failure, quality_failure, publish_failure, system_error, rate_limit
  error_code TEXT,
  error_message TEXT NOT NULL,
  error_details JSONB,
  stack_trace TEXT,
  
  -- Severity
  severity TEXT DEFAULT 'warning', -- info, warning, error, critical
  requires_attention BOOLEAN DEFAULT true,
  
  -- Resolution
  status TEXT DEFAULT 'new', -- new, acknowledged, investigating, resolved, ignored
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,
  auto_resolved BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 10. FACTORY RUN LOG
-- =============================================
CREATE TABLE IF NOT EXISTS factory_run_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Run Info
  run_type TEXT NOT NULL, -- daily_tasks, main_loop, writer_worker, publisher
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Results
  status TEXT DEFAULT 'running', -- running, completed, failed
  results JSONB,
  error_message TEXT,
  
  -- Metrics
  duration_seconds INTEGER,
  items_processed INTEGER DEFAULT 0
);

-- =============================================
-- INDEXES
-- =============================================

-- Story Ideas
CREATE INDEX IF NOT EXISTS idx_story_ideas_status ON story_ideas(status);
CREATE INDEX IF NOT EXISTS idx_story_ideas_genre ON story_ideas(genre);
CREATE INDEX IF NOT EXISTS idx_story_ideas_created ON story_ideas(created_at DESC);

-- Blueprints
CREATE INDEX IF NOT EXISTS idx_blueprints_status ON story_blueprints(status);
CREATE INDEX IF NOT EXISTS idx_blueprints_author ON story_blueprints(author_id);

-- Production Queue
CREATE INDEX IF NOT EXISTS idx_production_status ON production_queue(status);
CREATE INDEX IF NOT EXISTS idx_production_active ON production_queue(status, priority DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_production_novel ON production_queue(novel_id);

-- Chapter Write Queue
CREATE INDEX IF NOT EXISTS idx_write_queue_status ON chapter_write_queue(status);
CREATE INDEX IF NOT EXISTS idx_write_queue_production ON chapter_write_queue(production_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_write_queue_scheduled ON chapter_write_queue(scheduled_time) WHERE status = 'pending';

-- Chapter Publish Queue
CREATE INDEX IF NOT EXISTS idx_publish_queue_scheduled ON chapter_publish_queue(scheduled_time) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_publish_queue_production ON chapter_publish_queue(production_id);

-- Factory Errors
CREATE INDEX IF NOT EXISTS idx_factory_errors_new ON factory_errors(created_at DESC) WHERE status = 'new';
CREATE INDEX IF NOT EXISTS idx_factory_errors_severity ON factory_errors(severity, created_at DESC) WHERE requires_attention = true;

-- Factory Run Log
CREATE INDEX IF NOT EXISTS idx_run_log_type ON factory_run_log(run_type, started_at DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE factory_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_author_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_write_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_publish_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_run_log ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins have full access to factory_config" ON factory_config
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to ai_author_profiles" ON ai_author_profiles
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to story_ideas" ON story_ideas
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to story_blueprints" ON story_blueprints
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to production_queue" ON production_queue
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to chapter_write_queue" ON chapter_write_queue
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to chapter_publish_queue" ON chapter_publish_queue
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to factory_stats" ON factory_stats
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to factory_errors" ON factory_errors
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to factory_run_log" ON factory_run_log
  FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Service role bypass (for edge functions)
CREATE POLICY "Service role bypass for factory_config" ON factory_config
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass for ai_author_profiles" ON ai_author_profiles
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass for story_ideas" ON story_ideas
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass for story_blueprints" ON story_blueprints
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass for production_queue" ON production_queue
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass for chapter_write_queue" ON chapter_write_queue
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass for chapter_publish_queue" ON chapter_publish_queue
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass for factory_stats" ON factory_stats
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass for factory_errors" ON factory_errors
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role bypass for factory_run_log" ON factory_run_log
  FOR ALL TO service_role USING (true);

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default config (only if not exists)
INSERT INTO factory_config (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM factory_config LIMIT 1);

-- Insert sample AI Authors
INSERT INTO ai_author_profiles (pen_name, writing_style, tone, primary_genres, secondary_genres, persona_prompt, bio) VALUES
(
  'Thiên Tàm Thổ Đậu',
  'epic',
  'serious',
  ARRAY['tien-hiep', 'huyen-huyen'],
  ARRAY['action-adventure'],
  'Bạn là Thiên Tàm Thổ Đậu, một tác giả tiên hiệp nổi tiếng với phong cách sử thi, hoành tráng. Văn phong trang trọng, miêu tả chi tiết các trận chiến và cảnh giới tu luyện. Bạn giỏi tạo ra những thế giới tu luyện đồ sộ với hệ thống sức mạnh phức tạp. Mỗi chương viết phải có ít nhất một điểm cao trào hoặc revelation. Tránh info dump, thay vào đó hãy show thông tin qua hành động và đối thoại.',
  'Tác giả hàng đầu thể loại tiên hiệp với hơn 50 tác phẩm được yêu thích.'
),
(
  'Ngã Cật Tây Hồng Thị',
  'humorous',
  'lighthearted',
  ARRAY['urban-modern', 'system-litrpg'],
  ARRAY['romance'],
  'Bạn là Ngã Cật Tây Hồng Thị, tác giả đô thị nổi tiếng với lối viết hài hước, dí dỏm. Thích tạo tình huống trớ trêu và nhân vật cá tính. Dialogue chiếm 50-60% nội dung, nhanh nhẹn và witty. Hay sử dụng các tình huống hài hước để giảm tension sau những đoạn căng thẳng. Nhân vật chính thường xuyên có những phản ứng bất ngờ, không theo chuẩn mực thông thường.',
  'Vua hài hước của văn đàn đô thị, chuyên mang tiếng cười cho độc giả.'
),
(
  'Thần Khởi Lạc Hàn',
  'dramatic',
  'dark',
  ARRAY['horror-mystery', 'action-adventure'],
  ARRAY['sci-fi-apocalypse'],
  'Bạn là Thần Khởi Lạc Hàn, chuyên viết truyện kinh dị và hành động. Giỏi tạo bầu không khí căng thẳng, twist bất ngờ. Văn phong gọn gàng, mỗi câu đều có trọng lượng. Sử dụng nhiều kỹ thuật suspense như foreshadowing, red herring, và unreliable narrator. Kết thúc mỗi chương phải để lại một câu hỏi hoặc twist khiến độc giả muốn đọc tiếp.',
  'Bậc thầy kinh dị và bí ẩn, mỗi tác phẩm là một hành trình đầy bất ngờ.'
),
(
  'Cố Mạn',
  'romantic',
  'emotional',
  ARRAY['romance', 'historical'],
  ARRAY['urban-modern'],
  'Bạn là Cố Mạn, nữ tác giả ngôn tình hàng đầu. Chuyên viết tình cảm sâu sắc, nội tâm nhân vật tinh tế. Dialogue tự nhiên, đầy cảm xúc. Giỏi miêu tả những khoảnh khắc lãng mạn nhỏ bé nhưng đáng nhớ. Xây dựng chemistry giữa các nhân vật một cách từ từ, tự nhiên. Conflict trong tình yêu phải có lý do hợp lý, không drama vô nghĩa.',
  'Nữ hoàng ngôn tình, mỗi tác phẩm là một bản tình ca đẹp.'
),
(
  'Viễn Anh',
  'adventurous',
  'exciting',
  ARRAY['sci-fi-apocalypse', 'system-litrpg'],
  ARRAY['action-adventure'],
  'Bạn là Viễn Anh, tác giả khoa huyễn và game. Giỏi xây dựng hệ thống phức tạp, combat scenes kịch tính. Chú trọng vào progression system rõ ràng, mỗi chapter nhân vật phải có tiến bộ dù nhỏ. Sử dụng nhiều số liệu, stats để tăng tính thuyết phục. World-building khoa học với những chi tiết công nghệ thú vị.',
  'Kiến trúc sư của những thế giới khoa học viễn tưởng đầy sáng tạo.'
),
(
  'Mặc Hương Đồng Khứu',
  'poetic',
  'serious',
  ARRAY['historical', 'romance'],
  ARRAY['tien-hiep'],
  'Bạn là Mặc Hương Đồng Khứu, tác giả lịch sử với văn phong cổ kính, trang nhã. Giỏi tái hiện không khí thời đại với những chi tiết lịch sử chính xác. Dialogue phù hợp với thời kỳ, sử dụng ngôn ngữ cổ điển nhưng vẫn dễ hiểu. Chú trọng vào chính trị, âm mưu cung đình và những cuộc đấu trí.',
  'Nhà văn lịch sử được yêu mến với những tác phẩm tái hiện hoàn hảo thời đại.'
),
(
  'Phong Lăng Thiên Hạ',
  'epic',
  'exciting',
  ARRAY['action-adventure', 'huyen-huyen'],
  ARRAY['system-litrpg'],
  'Bạn là Phong Lăng Thiên Hạ, tác giả hành động nổi tiếng với những trận chiến hoành tráng. Văn phong nhanh, mạnh mẽ. Combat description chi tiết nhưng không rườm rà. Mỗi trận chiến phải có chiến thuật, không chỉ đơn thuần là đánh nhau. Nhân vật phản diện phải có depth, không phải evil vì evil.',
  'Vua chiến đấu của văn đàn, mỗi trận chiến là một kiệt tác nghệ thuật.'
),
(
  'Thanh Y Vũ Mặc',
  'dramatic',
  'emotional',
  ARRAY['romance', 'urban-modern'],
  ARRAY['horror-mystery'],
  'Bạn là Thanh Y Vũ Mặc, tác giả chuyên về những câu chuyện tình cảm đô thị hiện đại với nhiều drama. Giỏi tạo những tình huống éo le, hiểu lầm hợp lý. Nội tâm nhân vật phong phú, đặc biệt về những tổn thương quá khứ và quá trình healing. Ending không nhất thiết phải happy, nhưng phải meaningful.',
  'Chuyên gia về những câu chuyện tình đầy nước mắt và sự cứu rỗi.'
),
(
  'Thiên Sầu',
  'standard',
  'balanced',
  ARRAY['system-litrpg', 'action-adventure'],
  ARRAY['huyen-huyen', 'urban-modern'],
  'Bạn là Thiên Sầu, tác giả đa năng với khả năng viết nhiều thể loại. Văn phong cân bằng giữa action và character development. Giỏi xây dựng hệ thống sign-in, daily reward với progression thỏa mãn. Nhân vật chính thông minh nhưng không OP ngay từ đầu, phải có quá trình phát triển hợp lý.',
  'Tác giả bách khoa toàn thư, thể loại nào cũng viết được.'
),
(
  'Hoa Vũ Lâm',
  'romantic',
  'lighthearted',
  ARRAY['romance', 'urban-modern'],
  ARRAY['historical'],
  'Bạn là Hoa Vũ Lâm, tác giả sweet romance với những câu chuyện tình nhẹ nhàng, ấm áp. Dialogue dí dỏm, banter giữa CP ngọt ngào. Ít drama nặng nề, focus vào những khoảnh khắc hạnh phúc nhỏ. Male lead không toxic, female lead có chính kiến. Healthy relationship goals.',
  'Nguồn năng lượng tích cực của văn đàn ngôn tình.'
)
ON CONFLICT (pen_name) DO NOTHING;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to get next available author for a genre
CREATE OR REPLACE FUNCTION get_available_author(p_genre TEXT)
RETURNS UUID AS $$
DECLARE
  v_author_id UUID;
BEGIN
  SELECT id INTO v_author_id
  FROM ai_author_profiles
  WHERE status = 'active'
    AND (p_genre = ANY(primary_genres) OR p_genre = ANY(secondary_genres))
    AND NOT (p_genre = ANY(avoid_genres))
  ORDER BY total_stories ASC, RANDOM()
  LIMIT 1;
  
  -- Fallback to any active author if no genre match
  IF v_author_id IS NULL THEN
    SELECT id INTO v_author_id
    FROM ai_author_profiles
    WHERE status = 'active'
    ORDER BY total_stories ASC, RANDOM()
    LIMIT 1;
  END IF;
  
  RETURN v_author_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update author stats after chapter is written
CREATE OR REPLACE FUNCTION update_author_stats(p_author_id UUID, p_quality_score DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE ai_author_profiles
  SET 
    total_chapters = total_chapters + 1,
    avg_quality_score = CASE 
      WHEN total_chapters = 0 THEN p_quality_score
      ELSE (avg_quality_score * total_chapters + p_quality_score) / (total_chapters + 1)
    END,
    updated_at = NOW()
  WHERE id = p_author_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log factory error
CREATE OR REPLACE FUNCTION log_factory_error(
  p_error_type TEXT,
  p_error_message TEXT,
  p_production_id UUID DEFAULT NULL,
  p_novel_id UUID DEFAULT NULL,
  p_chapter_number INTEGER DEFAULT NULL,
  p_severity TEXT DEFAULT 'warning',
  p_error_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_error_id UUID;
BEGIN
  INSERT INTO factory_errors (
    error_type,
    error_message,
    production_id,
    novel_id,
    chapter_number,
    severity,
    error_details,
    requires_attention
  ) VALUES (
    p_error_type,
    p_error_message,
    p_production_id,
    p_novel_id,
    p_chapter_number,
    p_severity,
    p_error_details,
    p_severity IN ('error', 'critical')
  ) RETURNING id INTO v_error_id;
  
  RETURN v_error_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get factory dashboard stats
CREATE OR REPLACE FUNCTION get_factory_dashboard_stats()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'active_stories', (SELECT COUNT(*) FROM production_queue WHERE status = 'active'),
    'queued_stories', (SELECT COUNT(*) FROM production_queue WHERE status = 'queued'),
    'total_stories', (SELECT COUNT(*) FROM production_queue),
    'chapters_today', (SELECT COALESCE(SUM(chapters_written_today), 0) FROM production_queue WHERE last_write_date = CURRENT_DATE),
    'pending_ideas', (SELECT COUNT(*) FROM story_ideas WHERE status = 'generated'),
    'ready_blueprints', (SELECT COUNT(*) FROM story_blueprints WHERE status = 'ready'),
    'pending_publishes', (SELECT COUNT(*) FROM chapter_publish_queue WHERE status = 'scheduled' AND scheduled_time <= NOW() + INTERVAL '1 hour'),
    'new_errors', (SELECT COUNT(*) FROM factory_errors WHERE status = 'new' AND requires_attention = true),
    'total_authors', (SELECT COUNT(*) FROM ai_author_profiles WHERE status = 'active')
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_author_profiles_updated_at
  BEFORE UPDATE ON ai_author_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_story_blueprints_updated_at
  BEFORE UPDATE ON story_blueprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_queue_updated_at
  BEFORE UPDATE ON production_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_factory_config_updated_at
  BEFORE UPDATE ON factory_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
