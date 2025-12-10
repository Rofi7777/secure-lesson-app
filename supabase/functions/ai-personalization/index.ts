// Supabase Edge Function: AI Personalization and Learning
// This function handles user behavior tracking, preference analysis, and personalized prompt generation

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
  action: 'log_behavior' | 'get_preferences' | 'update_preferences' | 'get_learning_profile' | 'analyze_learning_style' | 'get_personalized_prompt' | 'save_feedback' | 'get_ai_memories' | 'save_ai_memory'
  behavior?: any
  preferences?: any
  feedback?: any
  memory?: any
  prompt_context?: any
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
    const { action, behavior, preferences, feedback, memory, prompt_context } = payload

    switch (action) {
      case 'log_behavior': {
        if (!behavior) {
          return new Response(
            JSON.stringify({ error: 'Missing behavior data' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data, error } = await supabase
          .from('user_behavior_logs')
          .insert({
            user_id: user.id,
            action_type: behavior.action_type,
            action_details: behavior.action_details || {},
            session_id: behavior.session_id,
          })
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to log behavior', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'get_preferences': {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch preferences', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ data: data || null }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'update_preferences': {
        if (!preferences) {
          return new Response(
            JSON.stringify({ error: 'Missing preferences data' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data, error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            ...preferences,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to update preferences', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'get_learning_profile': {
        const { data, error } = await supabase
          .from('user_learning_profile')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch learning profile', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ data: data || null }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'analyze_learning_style': {
        // Call the database function to analyze learning style
        const { data, error } = await supabase.rpc('analyze_user_learning_style', {
          p_user_id: user.id
        })

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to analyze learning style', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ data }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'get_personalized_prompt': {
        // Get user preferences and learning profile
        const [prefsResult, profileResult] = await Promise.all([
          supabase.from('user_preferences').select('*').eq('user_id', user.id).single(),
          supabase.from('user_learning_profile').select('*').eq('user_id', user.id).single(),
        ])

        const prefs = prefsResult.data || {}
        const profile = profileResult.data || {}

        // Build personalized prompt context
        const personalizedContext = {
          user_preferences: {
            preferred_language: prefs.preferred_language || 'zh-Hant',
            preferred_age_group: prefs.preferred_age_group,
            preferred_subjects: prefs.preferred_subjects || [],
            preferred_lesson_types: prefs.preferred_lesson_types || [],
            difficulty_level: prefs.difficulty_level || 'medium',
            learning_pace: prefs.learning_pace || 'normal',
            interaction_style: prefs.interaction_style || 'balanced',
            ai_tone_preference: prefs.ai_tone_preference || 'friendly',
          },
          learning_profile: {
            learning_style: profile.learning_style || 'mixed',
            vocabulary_level: profile.vocabulary_level || 'intermediate',
            preferred_content_length: profile.preferred_content_length || 'medium',
            topic_interests: profile.topic_interests || {},
          },
          context: prompt_context || {},
        }

        // Generate personalized system prompt
        const personalizedSystemPrompt = generatePersonalizedSystemPrompt(personalizedContext)

        return new Response(
          JSON.stringify({ 
            personalized_context: personalizedContext,
            personalized_system_prompt: personalizedSystemPrompt
          }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'save_feedback': {
        if (!feedback) {
          return new Response(
            JSON.stringify({ error: 'Missing feedback data' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data, error } = await supabase
          .from('ai_response_feedback')
          .insert({
            user_id: user.id,
            response_type: feedback.response_type,
            response_id: feedback.response_id,
            rating: feedback.rating,
            feedback_text: feedback.feedback_text,
            was_helpful: feedback.was_helpful,
            improvement_suggestions: feedback.improvement_suggestions,
          })
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to save feedback', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ success: true, data }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'get_ai_memories': {
        const { data, error } = await supabase
          .from('ai_user_memories')
          .select('*')
          .eq('user_id', user.id)
          .order('importance_score', { ascending: false })
          .order('last_accessed_at', { ascending: false })
          .limit(10)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch AI memories', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ data: data || [] }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'save_ai_memory': {
        if (!memory) {
          return new Response(
            JSON.stringify({ error: 'Missing memory data' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data, error } = await supabase
          .from('ai_user_memories')
          .insert({
            user_id: user.id,
            memory_type: memory.memory_type,
            memory_content: memory.memory_content,
            memory_context: memory.memory_context || {},
            importance_score: memory.importance_score || 5,
          })
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to save AI memory', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ success: true, data }),
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

// Helper function to generate personalized system prompt
function generatePersonalizedSystemPrompt(context: any): string {
  const { user_preferences, learning_profile } = context
  
  let prompt = "You are an expert AI tutor providing personalized learning experiences. "
  
  // Add tone preference
  const toneMap: Record<string, string> = {
    'friendly': 'Use a warm, friendly, and encouraging tone.',
    'professional': 'Use a professional yet approachable tone.',
    'playful': 'Use a playful and engaging tone with appropriate humor.',
    'encouraging': 'Use an encouraging and supportive tone, celebrating small wins.'
  }
  prompt += toneMap[user_preferences.ai_tone_preference] || toneMap['friendly']
  
  // Add interaction style
  const styleMap: Record<string, string> = {
    'detailed': 'Provide comprehensive explanations with examples and context.',
    'balanced': 'Provide balanced explanations that are informative but not overwhelming.',
    'concise': 'Provide concise, focused explanations that get straight to the point.'
  }
  prompt += ` ${styleMap[user_preferences.interaction_style] || styleMap['balanced']}`
  
  // Add learning pace
  if (user_preferences.learning_pace === 'slow') {
    prompt += " Break down complex concepts into smaller, digestible parts."
  } else if (user_preferences.learning_pace === 'fast') {
    prompt += " You can cover topics more quickly and assume the user can grasp concepts rapidly."
  }
  
  // Add difficulty level
  const difficultyMap: Record<string, string> = {
    'easy': 'Use simple language and basic concepts.',
    'medium': 'Use moderate complexity with clear explanations.',
    'hard': 'You can use advanced vocabulary and complex concepts.'
  }
  prompt += ` ${difficultyMap[user_preferences.difficulty_level] || difficultyMap['medium']}`
  
  // Add learning style
  if (learning_profile.learning_style === 'visual') {
    prompt += " Include visual descriptions and suggest visual learning aids."
  } else if (learning_profile.learning_style === 'auditory') {
    prompt += " Emphasize verbal explanations and auditory learning techniques."
  }
  
  // Add preferred content length
  if (learning_profile.preferred_content_length === 'brief') {
    prompt += " Keep responses concise and focused."
  } else if (learning_profile.preferred_content_length === 'detailed') {
    prompt += " Provide detailed, comprehensive responses."
  }
  
  // Add user interests if available
  if (learning_profile.topic_interests && Object.keys(learning_profile.topic_interests).length > 0) {
    prompt += ` The user shows interest in: ${Object.keys(learning_profile.topic_interests).join(', ')}.`
  }
  
  prompt += " Adapt your teaching style to match the user's needs and preferences."
  
  return prompt
}

