-- 創建學習進度追蹤相關表

-- 1. 用戶學習課程記錄表
CREATE TABLE IF NOT EXISTS user_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_type TEXT NOT NULL, -- '教學課程', '啟發故事', '5個字彙與例句', 'AI提問', '雙人博客'
  subject TEXT NOT NULL, -- 'KidsEnglish', 'AdultEnglish', 'Science', etc.
  topic TEXT NOT NULL,
  age_group TEXT NOT NULL,
  content JSONB NOT NULL, -- 存儲完整的課程內容（explanation, vocabulary, phrases, imageUrl等）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 用戶故事記錄表
CREATE TABLE IF NOT EXISTS user_stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  story_text TEXT NOT NULL,
  language TEXT NOT NULL,
  age_group TEXT NOT NULL,
  style TEXT NOT NULL,
  character_name TEXT,
  image_urls TEXT[], -- 存儲故事相關的圖片URL
  audio_url TEXT, -- 故事音頻URL（如果有的話）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 用戶作業輔導記錄表
CREATE TABLE IF NOT EXISTS user_tutoring_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level TEXT NOT NULL,
  subject TEXT NOT NULL,
  language TEXT NOT NULL,
  analysis_content JSONB NOT NULL, -- 存儲分析結果（key_concepts, vocabulary, problem_analysis等）
  file_urls TEXT[], -- 存儲上傳的作業文件URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. 用戶收藏表
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL, -- 'lesson', 'story', 'tutoring'
  item_id UUID NOT NULL, -- 對應的 lesson/story/tutoring session ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, item_type, item_id)
);

-- 5. 用戶學習統計表（用於快速查詢統計數據）
CREATE TABLE IF NOT EXISTS user_learning_stats (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  total_lessons INTEGER DEFAULT 0,
  total_stories INTEGER DEFAULT 0,
  total_tutoring_sessions INTEGER DEFAULT 0,
  total_favorites INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 創建索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_user_lessons_user_id ON user_lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lessons_created_at ON user_lessons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_stories_user_id ON user_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_created_at ON user_stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_tutoring_sessions_user_id ON user_tutoring_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tutoring_sessions_created_at ON user_tutoring_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_item ON user_favorites(item_type, item_id);

-- 啟用 Row Level Security (RLS)
ALTER TABLE user_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tutoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_stats ENABLE ROW LEVEL SECURITY;

-- 創建策略：用戶只能訪問自己的記錄
CREATE POLICY "Users can view their own lessons"
  ON user_lessons FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lessons"
  ON user_lessons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lessons"
  ON user_lessons FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own stories"
  ON user_stories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stories"
  ON user_stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON user_stories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own tutoring sessions"
  ON user_tutoring_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tutoring sessions"
  ON user_tutoring_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tutoring sessions"
  ON user_tutoring_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own favorites"
  ON user_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON user_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON user_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own stats"
  ON user_learning_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON user_learning_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON user_learning_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 創建函數：自動更新學習統計
CREATE OR REPLACE FUNCTION update_user_learning_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_learning_stats (user_id, total_lessons, total_stories, total_tutoring_sessions, last_activity_at, updated_at)
  VALUES (
    NEW.user_id,
    (SELECT COUNT(*) FROM user_lessons WHERE user_id = NEW.user_id),
    (SELECT COUNT(*) FROM user_stories WHERE user_id = NEW.user_id),
    (SELECT COUNT(*) FROM user_tutoring_sessions WHERE user_id = NEW.user_id),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_lessons = (SELECT COUNT(*) FROM user_lessons WHERE user_id = NEW.user_id),
    total_stories = (SELECT COUNT(*) FROM user_stories WHERE user_id = NEW.user_id),
    total_tutoring_sessions = (SELECT COUNT(*) FROM user_tutoring_sessions WHERE user_id = NEW.user_id),
    total_favorites = (SELECT COUNT(*) FROM user_favorites WHERE user_id = NEW.user_id),
    last_activity_at = NOW(),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 創建觸發器：當有新的學習記錄時自動更新統計
CREATE TRIGGER update_stats_on_lesson_insert
  AFTER INSERT ON user_lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_user_learning_stats();

CREATE TRIGGER update_stats_on_story_insert
  AFTER INSERT ON user_stories
  FOR EACH ROW
  EXECUTE FUNCTION update_user_learning_stats();

CREATE TRIGGER update_stats_on_tutoring_insert
  AFTER INSERT ON user_tutoring_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_learning_stats();

CREATE TRIGGER update_stats_on_favorite_insert
  AFTER INSERT ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_user_learning_stats();

CREATE TRIGGER update_stats_on_favorite_delete
  AFTER DELETE ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_user_learning_stats();

