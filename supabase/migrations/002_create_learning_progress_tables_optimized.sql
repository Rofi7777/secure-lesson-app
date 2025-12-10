-- Migration 002: Learning Progress Tracking Tables
-- Execute this migration first

BEGIN;

-- Drop existing policies if they exist (for idempotency)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own lessons" ON user_lessons;
    DROP POLICY IF EXISTS "Users can insert their own lessons" ON user_lessons;
    DROP POLICY IF EXISTS "Users can update their own lessons" ON user_lessons;
    DROP POLICY IF EXISTS "Users can delete their own lessons" ON user_lessons;
    DROP POLICY IF EXISTS "Users can view their own stories" ON user_stories;
    DROP POLICY IF EXISTS "Users can insert their own stories" ON user_stories;
    DROP POLICY IF EXISTS "Users can update their own stories" ON user_stories;
    DROP POLICY IF EXISTS "Users can delete their own stories" ON user_stories;
    DROP POLICY IF EXISTS "Users can view their own tutoring sessions" ON user_tutoring_sessions;
    DROP POLICY IF EXISTS "Users can insert their own tutoring sessions" ON user_tutoring_sessions;
    DROP POLICY IF EXISTS "Users can update their own tutoring sessions" ON user_tutoring_sessions;
    DROP POLICY IF EXISTS "Users can delete their own tutoring sessions" ON user_tutoring_sessions;
    DROP POLICY IF EXISTS "Users can view their own favorites" ON user_favorites;
    DROP POLICY IF EXISTS "Users can insert their own favorites" ON user_favorites;
    DROP POLICY IF EXISTS "Users can delete their own favorites" ON user_favorites;
    DROP POLICY IF EXISTS "Users can view their own stats" ON user_learning_stats;
    DROP POLICY IF EXISTS "Users can insert their own stats" ON user_learning_stats;
    DROP POLICY IF EXISTS "Users can update their own stats" ON user_learning_stats;
END $$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_stats_on_lesson_insert ON user_lessons;
DROP TRIGGER IF EXISTS update_stats_on_story_insert ON user_stories;
DROP TRIGGER IF EXISTS update_stats_on_tutoring_insert ON user_tutoring_sessions;
DROP TRIGGER IF EXISTS update_stats_on_favorite_insert ON user_favorites;
DROP TRIGGER IF EXISTS update_stats_on_favorite_delete ON user_favorites;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_user_learning_stats();

-- Create tables
CREATE TABLE IF NOT EXISTS user_lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lesson_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    age_group TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT user_lessons_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    story_text TEXT NOT NULL,
    language TEXT NOT NULL,
    age_group TEXT NOT NULL,
    style TEXT NOT NULL,
    character_name TEXT,
    image_urls TEXT[],
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT user_stories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_tutoring_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    level TEXT NOT NULL,
    subject TEXT NOT NULL,
    language TEXT NOT NULL,
    analysis_content JSONB NOT NULL,
    file_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT user_tutoring_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT user_favorites_unique UNIQUE(user_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS user_learning_stats (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    total_lessons INTEGER DEFAULT 0 NOT NULL,
    total_stories INTEGER DEFAULT 0 NOT NULL,
    total_tutoring_sessions INTEGER DEFAULT 0 NOT NULL,
    total_favorites INTEGER DEFAULT 0 NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT user_learning_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_lessons_user_id ON user_lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lessons_created_at ON user_lessons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_lessons_subject ON user_lessons(subject);
CREATE INDEX IF NOT EXISTS idx_user_lessons_lesson_type ON user_lessons(lesson_type);

CREATE INDEX IF NOT EXISTS idx_user_stories_user_id ON user_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_created_at ON user_stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_stories_language ON user_stories(language);

CREATE INDEX IF NOT EXISTS idx_user_tutoring_sessions_user_id ON user_tutoring_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tutoring_sessions_created_at ON user_tutoring_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_tutoring_sessions_subject ON user_tutoring_sessions(subject);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_item ON user_favorites(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_learning_stats_last_activity ON user_learning_stats(last_activity_at DESC);

-- Enable RLS
ALTER TABLE user_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tutoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_lessons
CREATE POLICY "Users can view their own lessons"
    ON user_lessons FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lessons"
    ON user_lessons FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lessons"
    ON user_lessons FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lessons"
    ON user_lessons FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create RLS policies for user_stories
CREATE POLICY "Users can view their own stories"
    ON user_stories FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stories"
    ON user_stories FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
    ON user_stories FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
    ON user_stories FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create RLS policies for user_tutoring_sessions
CREATE POLICY "Users can view their own tutoring sessions"
    ON user_tutoring_sessions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tutoring sessions"
    ON user_tutoring_sessions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tutoring sessions"
    ON user_tutoring_sessions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tutoring sessions"
    ON user_tutoring_sessions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create RLS policies for user_favorites
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

-- Create RLS policies for user_learning_stats
CREATE POLICY "Users can view their own stats"
    ON user_learning_stats FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
    ON user_learning_stats FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
    ON user_learning_stats FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create function to update learning stats
CREATE OR REPLACE FUNCTION update_user_learning_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO user_learning_stats (
        user_id,
        total_lessons,
        total_stories,
        total_tutoring_sessions,
        total_favorites,
        last_activity_at,
        updated_at
    )
    VALUES (
        NEW.user_id,
        (SELECT COUNT(*) FROM user_lessons WHERE user_id = NEW.user_id),
        (SELECT COUNT(*) FROM user_stories WHERE user_id = NEW.user_id),
        (SELECT COUNT(*) FROM user_tutoring_sessions WHERE user_id = NEW.user_id),
        (SELECT COUNT(*) FROM user_favorites WHERE user_id = NEW.user_id),
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
$$;

-- Create triggers
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

COMMIT;

