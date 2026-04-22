import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const STORE_EMAIL_DOMAIN = '@matjari.store';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the caller is authenticated and is admin
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check caller is admin
    const { data: callerData } = await supabaseUser
      .from('store_users')
      .select('role')
      .eq('auth_uid', user.id)
      .single();

    if (!callerData || callerData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'صلاحية المسؤول مطلوبة' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action } = body;

    // ─── CREATE USER ─────────────────────────────────────────────────────────────
    if (action === 'create') {
      const { username, password, role } = body;
      if (!username || !password) {
        return new Response(JSON.stringify({ error: 'اسم المستخدم وكلمة المرور مطلوبان' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check username uniqueness
      const { data: existing } = await supabaseAdmin
        .from('store_users')
        .select('id')
        .eq('username', username.trim().toLowerCase())
        .single();

      if (existing) {
        return new Response(JSON.stringify({ error: 'اسم المستخدم مستخدم بالفعل' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const email = `${username.trim().toLowerCase()}${STORE_EMAIL_DOMAIN}`;

      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        console.error('Create auth user error:', createError);
        return new Response(JSON.stringify({ error: `خطأ في إنشاء المستخدم: ${createError.message}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: storeUser, error: dbError } = await supabaseAdmin
        .from('store_users')
        .insert({
          username: username.trim().toLowerCase(),
          role: role || 'cashier',
          is_active: true,
          auth_uid: authData.user.id,
        })
        .select()
        .single();

      if (dbError) {
        // Rollback auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(JSON.stringify({ error: 'خطأ في حفظ بيانات المستخدم' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, user: storeUser }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── DELETE USER ─────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { userId, authUid } = body;
      if (!userId) {
        return new Response(JSON.stringify({ error: 'معرّف المستخدم مطلوب' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (authUid) {
        await supabaseAdmin.auth.admin.deleteUser(authUid);
      }

      await supabaseAdmin.from('store_users').delete().eq('id', userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── UPDATE USER ─────────────────────────────────────────────────────────────
    if (action === 'update') {
      const { userId, authUid, newPassword, role, isActive } = body;

      if (newPassword && authUid) {
        await supabaseAdmin.auth.admin.updateUserById(authUid, { password: newPassword });
      }

      const updateData: any = {};
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.is_active = isActive;

      if (Object.keys(updateData).length > 0) {
        await supabaseAdmin.from('store_users').update(updateData).eq('id', userId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'إجراء غير معروف' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('manage-user error:', err);
    return new Response(JSON.stringify({ error: `خطأ داخلي: ${err}` }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
