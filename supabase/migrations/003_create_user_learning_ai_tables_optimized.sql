-- Migration 003: AI Personalization and Learning System Tables
-- Execute this migration after 002_create_learning_progress_tables_optimized.sql

BEGIN;

-- Drop existing policies if they exist (for idempotency)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own behavior logs" ON user_behavior_logs;
    DROP POLICY IF EXISTS "Users can insert their own behavior logs" ON user_behavior_logs;
    DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can view their own feedback" ON ai_response_feedback;
    DROP POLICY IF EXISTS "Users can insert their own feedback" ON ai_response_feedback;
    DROP POLICY IF EXISTS "Users can update their own feedback" ON ai_response_feedback;
    DROP POLICY IF EXISTS "Users can view their own learning profile" ON user_learning_profile;
    DROP POLICY IF EXISTS "Users can update their own learning profile" ON user_learning_profile;
    DROP POLICY IF EXISTS "Users can insert their own learning profile" ON user_learning_profile;
    DROP POLICY IF EXISTS "Users can view their own memories" ON ai_user_memories;
    DROP POLICY IF EXISTS "Users can insert their own memories" ON ai_user_memories;
    DROP POLICY IF EXISTS "Users can update their own memories" ON ai_user_memories;
    DROP POLICY IF EXISTS "Users can delete their own memories" ON ai_user_memories;
END $$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_preferences_on_behavior ON user_behavior_logs;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS update_user_preferences_from_behavior();
DROP FUNCTION IF EXISTS analyze_user_learning_style(UUID);

-- Create tables
CREATE TABLE IF NOT EXISTS user_behavior_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL,
    action_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT user_behavior_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT user_behavior_logs_action_type_check CHECK (action_type IN (
        'lesson_generated', 'story_generated', 'tutoring_used', 
        'feature_clicked', 'language_changed', 'view_changed'
    ))
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    preferred_language TEXT DEFAULT 'zh-Hant' NOT NULL,
    preferred_age_group TEXT,
    preferred_subjects TEXT[] DEFAULT '{}',
    preferred_lesson_types TEXT[] DEFAULT '{}',
    preferred_story_styles TEXT[] DEFAULT '{}',
    difficulty_level TEXT DEFAULT 'medium' NOT NULL,
    learning_pace TEXT DEFAULT 'normal' NOT NULL,
    interaction_style TEXT DEFAULT 'balanced' NOT NULL,
    ai_tone_preference TEXT DEFAULT 'friendly' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT user_preferences_difficulty_check CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    CONSTRAINT user_preferences_pace_check CHECK (learning_pace IN ('slow', 'normal', 'fast')),
    CONSTRAINT user_preferences_style_check CHECK (interaction_style IN ('detailed', 'balanced', 'concise')),
    CONSTRAINT user_preferences_tone_check CHECK (ai_tone_preference IN ('friendly', 'professional', 'playful', 'encouraging'))
);

CREATE TABLE IF NOT EXISTS ai_response_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    response_type TEXT NOT NULL,
    response_id UUID,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    was_helpful BOOLEAN,
    improvement_suggestions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT ai_response_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT ai_response_feedback_response_type_check CHECK (response_type IN (
        'lesson', 'story', 'tutoring', 'advice', 'diagnosis'
    ))
);

CREATE TABLE IF NOT EXISTS user_learning_profile (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    learning_style TEXT,
    attention_span TEXT,
    preferred_content_length TEXT,
    vocabulary_level TEXT,
    engagement_patterns JSONB DEFAULT '{}'::jsonb,
    topic_interests JSONB DEFAULT '{}'::jsonb,
    strengths JSONB DEFAULT '{}'::jsonb,
    areas_for_improvement JSONB DEFAULT '{}'::jsonb,
    personalized_prompts JSONB DEFAULT '{}'::jsonb,
    last_analyzed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT user_learning_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT user_learning_profile_style_check CHECK (learning_style IN (
        'visual', 'auditory', 'kinesthetic', 'reading', 'mixed'
    ) OR learning_style IS NULL),
    CONSTRAINT user_learning_profile_span_check CHECK (attention_span IN (
        'short', 'medium', 'long'
    ) OR attention_span IS NULL),
    CONSTRAINT user_learning_profile_length_check CHECK (preferred_content_length IN (
        'brief', 'medium', 'detailed'
    ) OR preferred_content_length IS NULL),
    CONSTRAINT user_learning_profile_vocab_check CHECK (vocabulary_level IN (
        'beginner', 'intermediate', 'advanced'
    ) OR vocabulary_level IS NULL)
);

CREATE TABLE IF NOT EXISTS ai_user_memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    memory_type TEXT NOT NULL,
    memory_content TEXT NOT NULL,
    memory_context JSONB DEFAULT '{}'::jsonb,
    importance_score INTEGER DEFAULT 5 NOT NULL,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT ai_user_memories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT ai_user_memories_importance_check CHECK (importance_score >= 1 AND importance_score <= 10),
    CONSTRAINT ai_user_memories_type_check CHECK (memory_type IN (
        'preference', 'context', 'achievement', 'challenge', 'insight'
    ))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_user_id ON user_behavior_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_timestamp ON user_behavior_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_action_type ON user_behavior_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_session_id ON user_behavior_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_user_timestamp ON user_behavior_logs(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ai_response_feedback_user_id ON ai_response_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_response_feedback_response_type ON ai_response_feedback(response_type);
CREATE INDEX IF NOT EXISTS idx_ai_response_feedback_response_id ON ai_response_feedback(response_id);
CREATE INDEX IF NOT EXISTS idx_ai_response_feedback_rating ON ai_response_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_ai_response_feedback_created_at ON ai_response_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_user_memories_user_id ON ai_user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user_memories_memory_type ON ai_user_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_ai_user_memories_importance ON ai_user_memories(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_user_memories_user_importance ON ai_user_memories(user_id, importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_user_memories_last_accessed ON ai_user_memories(last_accessed_at DESC NULLS LAST);

-- Enable RLS
ALTER TABLE user_behavior_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_response_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_user_memories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_behavior_logs
CREATE POLICY "Users can view their own behavior logs"
    ON user_behavior_logs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own behavior logs"
    ON user_behavior_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences"
    ON user_preferences FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON user_preferences FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON user_preferences FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for ai_response_feedback
CREATE POLICY "Users can view their own feedback"
    ON ai_response_feedback FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
    ON ai_response_feedback FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
    ON ai_response_feedback FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_learning_profile
CREATE POLICY "Users can view their own learning profile"
    ON user_learning_profile FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning profile"
    ON user_learning_profile FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning profile"
    ON user_learning_profile FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for ai_user_memories
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
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
    ON ai_user_memories FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create function to update user preferences from behavior
CREATE OR REPLACE FUNCTION update_user_preferences_from_behavior()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    action_data JSONB;
    subject_val TEXT;
    lesson_type_val TEXT;
    age_group_val TEXT;
    language_val TEXT;
BEGIN
    action_data := COALESCE(NEW.action_details, '{}'::jsonb);
    
    IF NEW.action_type = 'lesson_generated' THEN
        subject_val := action_data->>'subject';
        lesson_type_val := action_data->>'lesson_type';
        age_group_val := action_data->>'age_group';
        
        IF subject_val IS NOT NULL OR lesson_type_val IS NOT NULL OR age_group_val IS NOT NULL THEN
            INSERT INTO user_preferences (
                user_id,
                preferred_subjects,
                preferred_lesson_types,
                preferred_age_group,
                updated_at
            )
            VALUES (
                NEW.user_id,
                CASE WHEN subject_val IS NOT NULL THEN ARRAY[subject_val]::TEXT[] ELSE '{}'::TEXT[] END,
                CASE WHEN lesson_type_val IS NOT NULL THEN ARRAY[lesson_type_val]::TEXT[] ELSE '{}'::TEXT[] END,
                age_group_val,
                NOW()
            )
            ON CONFLICT (user_id) DO UPDATE
            SET
                preferred_subjects = CASE
                    WHEN subject_val IS NOT NULL AND NOT (subject_val = ANY(user_preferences.preferred_subjects))
                    THEN user_preferences.preferred_subjects || ARRAY[subject_val]::TEXT[]
                    ELSE user_preferences.preferred_subjects
                END,
                preferred_lesson_types = CASE
                    WHEN lesson_type_val IS NOT NULL AND NOT (lesson_type_val = ANY(user_preferences.preferred_lesson_types))
                    THEN user_preferences.preferred_lesson_types || ARRAY[lesson_type_val]::TEXT[]
                    ELSE user_preferences.preferred_lesson_types
                END,
                preferred_age_group = COALESCE(age_group_val, user_preferences.preferred_age_group),
                updated_at = NOW();
        END IF;
    END IF;
    
    IF NEW.action_type = 'language_changed' THEN
        language_val := action_data->>'to_language';
        IF language_val IS NOT NULL THEN
            INSERT INTO user_preferences (user_id, preferred_language, updated_at)
            VALUES (NEW.user_id, language_val, NOW())
            ON CONFLICT (user_id) DO UPDATE
            SET preferred_language = language_val, updated_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for behavior-based preference updates
CREATE TRIGGER update_preferences_on_behavior
    AFTER INSERT ON user_behavior_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_from_behavior();

-- Create function to analyze user learning style
CREATE OR REPLACE FUNCTION analyze_user_learning_style(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    behavior_stats JSONB;
    learning_style_result TEXT;
    analysis_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_lessons', COUNT(*) FILTER (WHERE action_type = 'lesson_generated'),
        'total_stories', COUNT(*) FILTER (WHERE action_type = 'story_generated'),
        'total_tutoring', COUNT(*) FILTER (WHERE action_type = 'tutoring_used'),
        'most_used_subjects', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('subject', subject, 'count', count) ORDER BY count DESC)
            FROM (
                SELECT action_details->>'subject' as subject, COUNT(*) as count
                FROM user_behavior_logs
                WHERE user_id = p_user_id 
                    AND action_type = 'lesson_generated'
                    AND action_details->>'subject' IS NOT NULL
                GROUP BY action_details->>'subject'
                ORDER BY count DESC
                LIMIT 5
            ) subj_stats
        ), '[]'::jsonb),
        'most_used_lesson_types', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('lesson_type', lesson_type, 'count', count) ORDER BY count DESC)
            FROM (
                SELECT action_details->>'lesson_type' as lesson_type, COUNT(*) as count
                FROM user_behavior_logs
                WHERE user_id = p_user_id 
                    AND action_type = 'lesson_generated'
                    AND action_details->>'lesson_type' IS NOT NULL
                GROUP BY action_details->>'lesson_type'
                ORDER BY count DESC
                LIMIT 5
            ) type_stats
        ), '[]'::jsonb)
    ) INTO behavior_stats
    FROM user_behavior_logs
    WHERE user_id = p_user_id;
    
    learning_style_result := 'mixed';
    
    analysis_result := jsonb_build_object(
        'learning_style', learning_style_result,
        'behavior_stats', behavior_stats,
        'analyzed_at', NOW()
    );
    
    INSERT INTO user_learning_profile (
        user_id,
        learning_style,
        engagement_patterns,
        updated_at,
        last_analyzed_at
    )
    VALUES (
        p_user_id,
        learning_style_result,
        behavior_stats,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
        learning_style = learning_style_result,
        engagement_patterns = behavior_stats,
        updated_at = NOW(),
        last_analyzed_at = NOW();
    
    RETURN analysis_result;
END;
$$;

COMMIT;

