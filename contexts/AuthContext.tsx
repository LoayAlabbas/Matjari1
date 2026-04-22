// Powered by OnSpace.AI
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getSupabaseClient } from '@/template';
import { AppUser, UserRole } from '@/types';

const STORE_EMAIL_DOMAIN = '@matjari.store';

interface AuthContextType {
  currentUser: AppUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (authUid: string, email: string) => {
    try {
      const sb = getSupabaseClient();
      const { data } = await sb
        .from('store_users')
        .select('*')
        .eq('auth_uid', authUid)
        .single();

      if (data) {
        setCurrentUser({
          id: data.id,
          email,
          username: data.username,
          role: data.role as UserRole,
        });
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    const sb = getSupabaseClient();

    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id, session.user.email || '').finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user.id, session.user.email || '');
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  const login = useCallback(async (username: string, password: string): Promise<{ error: string | null }> => {
    try {
      const sb = getSupabaseClient();
      const email = `${username.trim().toLowerCase()}${STORE_EMAIL_DOMAIN}`;
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };

      // Check if user is active
      const { data: storeUser } = await sb
        .from('store_users')
        .select('*')
        .eq('auth_uid', data.user.id)
        .single();

      if (!storeUser) {
        await sb.auth.signOut();
        return { error: 'المستخدم غير موجود في النظام' };
      }

      if (!storeUser.is_active) {
        await sb.auth.signOut();
        return { error: 'هذا الحساب موقوف. تواصل مع المسؤول' };
      }

      setCurrentUser({
        id: storeUser.id,
        email: data.user.email || '',
        username: storeUser.username,
        role: storeUser.role as UserRole,
      });

      return { error: null };
    } catch {
      return { error: 'حدث خطأ أثناء تسجيل الدخول' };
    }
  }, []);

  const logout = useCallback(async () => {
    const sb = getSupabaseClient();
    await sb.auth.signOut();
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      login,
      logout,
      isAdmin: currentUser?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}
