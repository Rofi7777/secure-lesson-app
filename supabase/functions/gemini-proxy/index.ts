// Supabase Edge Function: Gemini API Proxy
// This function protects your Gemini API key by handling all API calls server-side

// deno-lint-ignore-file no-explicit-any
// @deno-types="https://esm.sh/@supabase/supabase-js@2.42.3"

// Type declarations for Deno globals
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

// Deno provides Web API globals
declare const Response: typeof globalThis.Response
declare const fetch: typeof globalThis.fetch
declare const console: typeof globalThis.console

// @ts-ignore - Deno import (works at runtime in Supabase Edge Functions)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-ignore - ESM import (works at runtime in Supabase Edge Functions)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.3";

const GEMINI_API_KEY = (typeof Deno !== "undefined" && Deno?.env?.get?.('GEMINI_API_KEY')) || '';

interface RequestPayload {
  endpoint: string
  model?: string
  contents?: any
  systemInstruction?: any
  generationConfig?: any
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

  // CORS headers helper
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Initialize Supabase client for user authentication
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
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Check if user is authorized to use the service
    // Use service_role key to bypass RLS for this check
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not set')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: authorizedUser, error: authCheckError } = await supabaseAdmin
      .from('authorized_users')
      .select('id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (authCheckError || !authorizedUser) {
      return new Response(
        JSON.stringify({ 
          error: 'Access denied',
          message: '您的帳號尚未獲得使用權限，請聯繫管理員。'
        }),
        { 
          status: 403, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Parse request body with error handling
    let payload: RequestPayload
    try {
      const bodyText = await req.text()
      if (!bodyText || bodyText.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'Request body is empty' }),
          { 
            status: 400, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            } 
          }
        )
      }
      payload = JSON.parse(bodyText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : 'Unknown error'
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    const { endpoint, model, contents, systemInstruction, generationConfig } = payload

    if (!endpoint || !model) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint or model' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      )
    }

    // Build Gemini API request
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${GEMINI_API_KEY}`
    
    const geminiPayload: any = {}
    if (contents) {
      geminiPayload.contents = contents
    }
    if (systemInstruction) {
      geminiPayload.systemInstruction = systemInstruction
    }
    if (generationConfig) {
      geminiPayload.generationConfig = generationConfig
    }

    // Call Gemini API
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiPayload),
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      return new Response(
        JSON.stringify({ 
          error: 'Gemini API error',
          details: errorText 
        }),
        { 
          status: geminiResponse.status,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      )
    }

    const result = await geminiResponse.json()

    // Return response with CORS headers
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  }
})

