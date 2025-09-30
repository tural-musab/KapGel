'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';

import type { Role } from 'lib/rbac';
import { createClient } from 'lib/supabase/client';

export type AuthContextState = {
  user: User | null;
  role: Role;
  courierId: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthContextState>({
    user: null,
    role: null,
    courierId: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    if (!supabase) {
      setState({ user: null, role: null, courierId: null, loading: false });
      return;
    }

    let isMounted = true;

    const loadAuthState = async () => {
      setState((prev) => ({ ...prev, loading: true }));

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (userError || !user) {
          setState({ user: null, role: null, courierId: null, loading: false });
          return;
        }

        let role: Role = null;
        let courierId: string | null = null;

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (profileError) {
          console.error('AuthProvider: failed to load user profile', profileError);
        }

        const profileRole = (profile?.role as Role | null | undefined) ?? null;
        role = profileRole;

        if (role === 'courier') {
          const { data: courier, error: courierError } = await supabase
            .from('couriers')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!isMounted) return;

          if (courierError) {
            console.error('AuthProvider: failed to load courier row', courierError);
          }
          const courierRecordId = (courier?.id as string | null | undefined) ?? null;
          courierId = courierRecordId;
        }

        if (!isMounted) return;

        setState({ user, role, courierId, loading: false });
      } catch (error) {
        if (!isMounted) return;
        console.error('AuthProvider: unexpected error', error);
        setState({ user: null, role: null, courierId: null, loading: false });
      }
    };

    void loadAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadAuthState();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
