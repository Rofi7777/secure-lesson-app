// Supabase Edge Function: Gemini API Proxy
// This function protects your Gemini API key by handling all API calls server-side

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''

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

    // Initialize Supabase client
    // In Supabase Edge Functions, these are automatically available
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

    // Parse request body
    const payload: RequestPayload = await req.json()
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

