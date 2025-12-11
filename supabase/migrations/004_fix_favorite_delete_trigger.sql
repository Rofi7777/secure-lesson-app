-- Fix the update_user_learning_stats function to handle DELETE operations correctly
-- The issue: When a favorite is deleted, the trigger uses NEW.user_id which is NULL
-- Solution: Use OLD.user_id for DELETE operations and NEW.user_id for INSERT operations

CREATE OR REPLACE FUNCTION update_user_learning_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Determine user_id based on trigger operation
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;

  -- Only proceed if we have a valid user_id
  IF target_user_id IS NULL THEN
    RAISE WARNING 'Cannot update stats: user_id is NULL';
    RETURN COALESCE(OLD, NEW);
  END IF;

  -- Insert or update stats
  INSERT INTO user_learning_stats (user_id, total_lessons, total_stories, total_tutoring_sessions, total_favorites, last_activity_at, updated_at)
  VALUES (
    target_user_id,
    (SELECT COUNT(*) FROM user_lessons WHERE user_id = target_user_id),
    (SELECT COUNT(*) FROM user_stories WHERE user_id = target_user_id),
    (SELECT COUNT(*) FROM user_tutoring_sessions WHERE user_id = target_user_id),
    (SELECT COUNT(*) FROM user_favorites WHERE user_id = target_user_id),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_lessons = (SELECT COUNT(*) FROM user_lessons WHERE user_id = target_user_id),
    total_stories = (SELECT COUNT(*) FROM user_stories WHERE user_id = target_user_id),
    total_tutoring_sessions = (SELECT COUNT(*) FROM user_tutoring_sessions WHERE user_id = target_user_id),
    total_favorites = (SELECT COUNT(*) FROM user_favorites WHERE user_id = target_user_id),
    last_activity_at = NOW(),
    updated_at = NOW();

  RETURN COALESCE(OLD, NEW);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

