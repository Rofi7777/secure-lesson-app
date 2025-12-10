// Supabase Edge Function: Admin Management
// This function handles admin operations for user authorization management

// @deno-types="https://esm.sh/@supabase/supabase-js@2.42.3"

// Type declarations for Deno globals
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

const ADMIN_EMAIL = 'rofi90@hotmail.com';

interface RequestPayload {
  action: 'get_pending_users' | 'get_authorized_users' | 'approve_user' | 'update_user_status' | 'check_admin'
  user_id?: string
  email?: string
  is_active?: boolean
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
        { status: 401, headers: corsHeaders }
      )
    }

    // Check if user is admin
    if (user.email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin only.' }),
        { status: 403, headers: corsHeaders }
      )
    }

    // Get service role key for admin operations
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not set')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: corsHeaders }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Parse request body
    const payload: RequestPayload = await req.json()
    const { action, user_id, email, is_active } = payload

    switch (action) {
      case 'check_admin':
        return new Response(
          JSON.stringify({ is_admin: true }),
          { status: 200, headers: corsHeaders }
        )

      case 'get_pending_users': {
        // Get all users from auth.users who are not in authorized_users
        const { data: allUsersData, error: allUsersError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (allUsersError) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch users', details: allUsersError.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        if (!allUsersData || !allUsersData.users) {
          return new Response(
            JSON.stringify({ error: 'Invalid response from auth API' }),
            { status: 500, headers: corsHeaders }
          )
        }

        // Get all authorized user IDs
        const { data: authorizedUsers, error: authorizedError } = await supabaseAdmin
          .from('authorized_users')
          .select('user_id')

        if (authorizedError) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch authorized users', details: authorizedError.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        const authorizedUserIds = new Set(
          authorizedUsers?.map(au => au.user_id) || []
        )

        // Filter out admin and already authorized users
        const pendingUsers = allUsersData.users
          .filter(u => u.email && u.email !== ADMIN_EMAIL && !authorizedUserIds.has(u.id))
          .map(u => ({
            id: u.id,
            email: u.email || '未知',
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
          }))

        return new Response(
          JSON.stringify({ users: pendingUsers }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'get_authorized_users': {
        const { data: authorizedUsers, error: authorizedError } = await supabaseAdmin
          .from('authorized_users')
          .select('*')
          .order('created_at', { ascending: false })

        if (authorizedError) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch authorized users', details: authorizedError.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ users: authorizedUsers || [] }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'approve_user': {
        if (!user_id || !email) {
          return new Response(
            JSON.stringify({ error: 'Missing user_id or email' }),
            { status: 400, headers: corsHeaders }
          )
        }

        // Insert or update authorized_users
        const { data, error } = await supabaseAdmin
          .from('authorized_users')
          .upsert({
            user_id,
            email,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to approve user', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ success: true, user: data }),
          { status: 200, headers: corsHeaders }
        )
      }

      case 'update_user_status': {
        if (!user_id || typeof is_active !== 'boolean') {
          return new Response(
            JSON.stringify({ error: 'Missing user_id or is_active' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data, error } = await supabaseAdmin
          .from('authorized_users')
          .update({
            is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user_id)
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to update user status', details: error.message }),
            { status: 500, headers: corsHeaders }
          )
        }

        return new Response(
          JSON.stringify({ success: true, user: data }),
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

