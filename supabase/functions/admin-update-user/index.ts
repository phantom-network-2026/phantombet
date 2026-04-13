const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OWNER_USERNAME = "ItsYaBoyEms";
const OWNER_PROTECTION_CODE = "040817";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: roles } = await adminClient.from('user_roles').select('role').eq('user_id', user.id)
    const callerRoles = roles?.map((r: any) => r.role) || [];
    const isAdmin = callerRoles.includes('admin') || callerRoles.includes('owner');
    const isOwner = callerRoles.includes('owner');

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { target_user_id, email, password, action, protection_code } = body

    if (!target_user_id) {
      return new Response(JSON.stringify({ error: 'target_user_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if target is the owner account
    const { data: targetProfile } = await adminClient.from('profiles').select('username').eq('user_id', target_user_id).single();
    const { data: targetRoles } = await adminClient.from('user_roles').select('role').eq('user_id', target_user_id);
    const targetIsOwner = targetRoles?.some((r: any) => r.role === 'owner');

    // Protect owner account - only owner themselves with code can modify email/password
    if (targetIsOwner && (email || password || action === 'delete')) {
      if (!isOwner) {
        return new Response(JSON.stringify({ error: 'Cannot modify owner account' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      // Even owner needs protection code for email/password changes
      if ((email || password) && protection_code !== OWNER_PROTECTION_CODE) {
        return new Response(JSON.stringify({ error: 'Invalid protection code' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Non-owner admins cannot change email or password of ANY user
    if (!isOwner && (email || password)) {
      return new Response(JSON.stringify({ error: 'Only owner can change email and password. You can change usernames only.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Prevent self-deletion
    if (action === 'delete' && target_user_id === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Handle delete action
    if (action === 'delete') {
      await adminClient.from('user_presence').delete().eq('user_id', target_user_id)
      await adminClient.from('user_roles').delete().eq('user_id', target_user_id)
      await adminClient.from('profiles').delete().eq('user_id', target_user_id)

      const { error } = await adminClient.auth.admin.deleteUser(target_user_id)
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ success: true, deleted: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Handle update action
    const updates: Record<string, string> = {}
    if (email && typeof email === 'string' && email.includes('@')) updates.email = email
    if (password && typeof password === 'string' && password.length >= 1) updates.password = password

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'No valid updates provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data, error } = await adminClient.auth.admin.updateUserById(target_user_id, updates)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, user: { id: data.user.id, email: data.user.email } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
