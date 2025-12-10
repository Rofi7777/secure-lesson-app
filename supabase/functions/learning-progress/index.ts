// Supabase Edge Function: Learning Progress Management
// This function handles saving and retrieving user learning progress

// @deno-types="https://esm.sh/@supabase/supabase-js@2.42.3"

declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

declare const Response: typeof globalThis.Response
declare const fetch: typeof globalThis.fetch
declare const console: typeof globalThis.console

// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore - ESM import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.3";

interface RequestPayload {
  action: 'save_lesson' | 'save_story' | 'save_tutoring' | 'get_lessons' | 'get_stories' | 'get_tutoring_sessions' | 'get_stats' | 'add_favorite' | 'remove_favorite' | 'get_favorites'
  lesson?: any
  story?: any
  tutoring?: any
  item_type?: 'lesson' | 'story' | 'tutoring'
  item_id?: string
  limit?: number
  offset?: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Verify the user's session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Parse request body
    const payload: RequestPayload = await req.json()
    const { action, lesson, story, tutoring, item_type, item_id, limit = 20, offset = 0 } = payload

    switch (action) {
      case 'save_lesson': {
        if (!lesson) {
          return new Response(
            JSON.stringify({ error: 'Missing lesson data' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data, error } = await supabase
          .from('user_lessons')
          .insert({
            user_id: user.id,
            lesson_type: lesson.lesson_type,
            subject: lesson.subject,
            topic: lesson.topic,
            age_group: lesson.age_group,
            content: lesson.content,
          })
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to save lesson', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'save_story': {
        if (!story) {
          return new Response(
            JSON.stringify({ error: 'Missing story data' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data, error } = await supabase
          .from('user_stories')
          .insert({
            user_id: user.id,
            story_text: story.story_text,
            language: story.language,
            age_group: story.age_group,
            style: story.style,
            character_name: story.character_name,
            image_urls: story.image_urls || [],
            audio_url: story.audio_url,
          })
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to save story', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'save_tutoring': {
        if (!tutoring) {
          return new Response(
            JSON.stringify({ error: 'Missing tutoring data' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data, error } = await supabase
          .from('user_tutoring_sessions')
          .insert({
            user_id: user.id,
            level: tutoring.level,
            subject: tutoring.subject,
            language: tutoring.language,
            analysis_content: tutoring.analysis_content,
            file_urls: tutoring.file_urls || [],
          })
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to save tutoring session', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'get_lessons': {
        const { data, error } = await supabase
          .from('user_lessons')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch lessons', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ data: data || [] }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'get_stories': {
        const { data, error } = await supabase
          .from('user_stories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch stories', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ data: data || [] }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'get_tutoring_sessions': {
        const { data, error } = await supabase
          .from('user_tutoring_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch tutoring sessions', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ data: data || [] }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'get_stats': {
        const { data, error } = await supabase
          .from('user_learning_stats')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
          return new Response(
            JSON.stringify({ error: 'Failed to fetch stats', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        // If stats don't exist, return default values
        const stats = data || {
          total_lessons: 0,
          total_stories: 0,
          total_tutoring_sessions: 0,
          total_favorites: 0,
          last_activity_at: null
        }

        return new Response(
          JSON.stringify({ data: stats }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'add_favorite': {
        if (!item_type || !item_id) {
          return new Response(
            JSON.stringify({ error: 'Missing item_type or item_id' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data, error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            item_type,
            item_id,
          })
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to add favorite', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'remove_favorite': {
        if (!item_type || !item_id) {
          return new Response(
            JSON.stringify({ error: 'Missing item_type or item_id' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('item_type', item_type)
          .eq('item_id', item_id)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to remove favorite', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'get_favorites': {
        const { data, error } = await supabase
          .from('user_favorites')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch favorites', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ data: data || [] }),
          { status: 200, headers: corsHeaders }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: corsHeaders }
        )
    }
  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})

