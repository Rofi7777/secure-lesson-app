-- 創建 AI 個性化學習和記憶系統相關表

-- 1. 用戶行為追蹤表
CREATE TABLE IF NOT EXISTS user_behavior_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL, -- 'lesson_generated', 'story_generated', 'tutoring_used', 'feature_clicked', 'language_changed', etc.
  action_details JSONB NOT NULL, -- 存儲動作的詳細信息（主題、類型、設置等）
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  session_id TEXT, -- 用於追蹤同一會話中的多個動作
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 用戶偏好設置表
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  preferred_language TEXT DEFAULT 'zh-Hant',
  preferred_age_group TEXT,
  preferred_subjects TEXT[], -- 用戶最常使用的科目
  preferred_lesson_types TEXT[], -- 用戶最喜歡的課程類型
  preferred_story_styles TEXT[], -- 用戶喜歡的故事風格
  difficulty_level TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  learning_pace TEXT DEFAULT 'normal', -- 'slow', 'normal', 'fast'
  interaction_style TEXT DEFAULT 'balanced', -- 'detailed', 'balanced', 'concise'
  ai_tone_preference TEXT DEFAULT 'friendly', -- 'friendly', 'professional', 'playful', 'encouraging'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. AI 回應反饋表（用於改進 AI 回應質量）
CREATE TABLE IF NOT EXISTS ai_response_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  response_type TEXT NOT NULL, -- 'lesson', 'story', 'tutoring', 'advice', 'diagnosis'
  response_id UUID, -- 對應的 lesson/story/tutoring session ID
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 星評分
  feedback_text TEXT, -- 用戶的具體反饋
  was_helpful BOOLEAN,
  improvement_suggestions TEXT, -- 用戶建議的改進方向
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. 用戶學習風格分析表（AI 自動分析生成）
CREATE TABLE IF NOT EXISTS user_learning_profile (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  learning_style TEXT, -- 'visual', 'auditory', 'kinesthetic', 'reading', 'mixed'
  attention_span TEXT, -- 'short', 'medium', 'long'
  preferred_content_length TEXT, -- 'brief', 'medium', 'detailed'
  vocabulary_level TEXT, -- 'beginner', 'intermediate', 'advanced'
  engagement_patterns JSONB, -- 存儲用戶的參與模式（最活躍時間、使用頻率等）
  topic_interests JSONB, -- 用戶感興趣的主題和領域
  strengths JSONB, -- 用戶的學習強項
  areas_for_improvement JSONB, -- 需要改進的領域
  personalized_prompts JSONB, -- 為該用戶定制的 AI 提示詞模板
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. AI 學習記憶表（存儲 AI 對用戶的記憶和上下文）
CREATE TABLE IF NOT EXISTS ai_user_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  memory_type TEXT NOT NULL, -- 'preference', 'context', 'achievement', 'challenge', 'insight'
  memory_content TEXT NOT NULL, -- AI 記憶的內容
  memory_context JSONB, -- 相關的上下文信息
  importance_score INTEGER DEFAULT 5 CHECK (importance_score >= 1 AND importance_score <= 10), -- 記憶重要性評分
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 創建索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_user_id ON user_behavior_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_timestamp ON user_behavior_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_action_type ON user_behavior_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_response_feedback_user_id ON ai_response_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_response_feedback_response_type ON ai_response_feedback(response_type);
CREATE INDEX IF NOT EXISTS idx_ai_user_memories_user_id ON ai_user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_memories_memory_type ON ai_user_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_ai_user_memories_importance ON ai_user_memories(importance_score DESC);

-- 啟用 Row Level Security (RLS)
ALTER TABLE user_behavior_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_response_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_memories ENABLE ROW LEVEL SECURITY;

-- 創建策略：用戶只能訪問自己的記錄
CREATE POLICY "Users can view their own behavior logs"
  ON user_behavior_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own behavior logs"
  ON user_behavior_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
  ON ai_response_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
  ON ai_response_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own learning profile"
  ON user_learning_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning profile"
  ON user_learning_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning profile"
  ON user_learning_profile FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own memories"
  ON ai_user_memories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories"
  ON ai_user_memories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
  ON ai_user_memories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 創建函數：自動更新用戶偏好（基於行為分析）
CREATE OR REPLACE FUNCTION update_user_preferences_from_behavior()
RETURNS TRIGGER AS $$
DECLARE
  action_data JSONB;
  subject_val TEXT;
  lesson_type_val TEXT;
  age_group_val TEXT;
  language_val TEXT;
BEGIN
  action_data := NEW.action_details;
  
  -- 根據行為類型更新偏好
  IF NEW.action_type = 'lesson_generated' THEN
    subject_val := action_data->>'subject';
    lesson_type_val := action_data->>'lesson_type';
    age_group_val := action_data->>'age_group';
    
    -- 更新偏好數組（如果不存在則添加）
    INSERT INTO user_preferences (user_id, preferred_subjects, preferred_lesson_types, preferred_age_group, updated_at)
    VALUES (NEW.user_id, 
            ARRAY[subject_val]::TEXT[], 
            ARRAY[lesson_type_val]::TEXT[], 
            age_group_val,
            NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET 
      preferred_subjects = CASE 
        WHEN subject_val = ANY(user_preferences.preferred_subjects) 
        THEN user_preferences.preferred_subjects
        ELSE user_preferences.preferred_subjects || ARRAY[subject_val]::TEXT[]
      END,
      preferred_lesson_types = CASE 
        WHEN lesson_type_val = ANY(user_preferences.preferred_lesson_types) 
        THEN user_preferences.preferred_lesson_types
        ELSE user_preferences.preferred_lesson_types || ARRAY[lesson_type_val]::TEXT[]
      END,
      preferred_age_group = COALESCE(age_group_val, user_preferences.preferred_age_group),
      updated_at = NOW();
  END IF;
  
  IF NEW.action_type = 'language_changed' THEN
    language_val := action_data->>'language';
    INSERT INTO user_preferences (user_id, preferred_language, updated_at)
    VALUES (NEW.user_id, language_val, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET preferred_language = language_val, updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 創建觸發器：當有新的行為記錄時自動更新偏好
CREATE TRIGGER update_preferences_on_behavior
  AFTER INSERT ON user_behavior_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_from_behavior();

-- 創建函數：分析用戶學習風格（定期調用）
CREATE OR REPLACE FUNCTION analyze_user_learning_style(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  behavior_stats JSONB;
  lesson_stats JSONB;
  story_stats JSONB;
  tutoring_stats JSONB;
  learning_style_result TEXT;
  analysis_result JSONB;
BEGIN
  -- 分析用戶行為統計
  SELECT jsonb_build_object(
    'total_lessons', COUNT(*) FILTER (WHERE action_type = 'lesson_generated'),
    'total_stories', COUNT(*) FILTER (WHERE action_type = 'story_generated'),
    'total_tutoring', COUNT(*) FILTER (WHERE action_type = 'tutoring_used'),
    'most_used_subjects', (
      SELECT jsonb_agg(subject ORDER BY count DESC)
      FROM (
        SELECT action_details->>'subject' as subject, COUNT(*) as count
        FROM user_behavior_logs
        WHERE user_id = p_user_id AND action_type = 'lesson_generated'
        GROUP BY action_details->>'subject'
        ORDER BY count DESC
        LIMIT 5
      ) subj_stats
    ),
    'most_used_lesson_types', (
      SELECT jsonb_agg(lesson_type ORDER BY count DESC)
      FROM (
        SELECT action_details->>'lesson_type' as lesson_type, COUNT(*) as count
        FROM user_behavior_logs
        WHERE user_id = p_user_id AND action_type = 'lesson_generated'
        GROUP BY action_details->>'lesson_type'
        ORDER BY count DESC
        LIMIT 5
      ) type_stats
    )
  ) INTO behavior_stats
  FROM user_behavior_logs
  WHERE user_id = p_user_id;
  
  -- 基於統計推斷學習風格（簡化版本，實際應該用 AI 分析）
  learning_style_result := 'mixed'; -- 默認值，實際應該基於數據分析
  
  analysis_result := jsonb_build_object(
    'learning_style', learning_style_result,
    'behavior_stats', behavior_stats,
    'analyzed_at', NOW()
  );
  
  -- 更新用戶學習檔案
  INSERT INTO user_learning_profile (user_id, learning_style, engagement_patterns, updated_at, last_analyzed_at)
  VALUES (p_user_id, learning_style_result, behavior_stats, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET 
    learning_style = learning_style_result,
    engagement_patterns = behavior_stats,
    updated_at = NOW(),
    last_analyzed_at = NOW();
  
  RETURN analysis_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

