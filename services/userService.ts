// Powered by OnSpace.AI
import { getSupabaseClient } from '@/template';
import { StoreUser, UserRole } from '@/types';
import { FunctionsHttpError } from '@supabase/supabase-js';

export async function fetchStoreUsers(): Promise<StoreUser[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from('store_users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapStoreUser);
}

export async function createStoreUser(
  username: string,
  password: string,
  role: UserRole
): Promise<{ error: string | null; user?: StoreUser }> {
  const sb = getSupabaseClient();
  const { data, error } = await sb.functions.invoke('manage-user', {
    body: { action: 'create', username, password, role },
  });

  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const text = await error.context?.text();
        const parsed = JSON.parse(text || '{}');
        msg = parsed.error || msg;
      } catch { /* ignore */ }
    }
    return { error: msg };
  }

  return { error: null, user: data?.user ? mapStoreUser(data.user) : undefined };
}

export async function deleteStoreUser(
  userId: string,
  authUid?: string
): Promise<{ error: string | null }> {
  const sb = getSupabaseClient();
  const { error } = await sb.functions.invoke('manage-user', {
    body: { action: 'delete', userId, authUid },
  });

  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const text = await error.context?.text();
        const parsed = JSON.parse(text || '{}');
        msg = parsed.error || msg;
      } catch { /* ignore */ }
    }
    return { error: msg };
  }
  return { error: null };
}

export async function updateStoreUser(
  userId: string,
  authUid: string | undefined,
  updates: { newPassword?: string; role?: UserRole; isActive?: boolean }
): Promise<{ error: string | null }> {
  const sb = getSupabaseClient();
  const { error } = await sb.functions.invoke('manage-user', {
    body: { action: 'update', userId, authUid, ...updates },
  });

  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const text = await error.context?.text();
        const parsed = JSON.parse(text || '{}');
        msg = parsed.error || msg;
      } catch { /* ignore */ }
    }
    return { error: msg };
  }
  return { error: null };
}

function mapStoreUser(r: any): StoreUser {
  return {
    id: r.id,
    username: r.username,
    role: r.role as UserRole,
    isActive: r.is_active,
    authUid: r.auth_uid,
    createdAt: r.created_at,
  };
}
