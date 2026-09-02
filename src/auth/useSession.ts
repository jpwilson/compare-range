import { useCallback, useEffect, useState } from 'react';
import { AUTH_ENABLED, getSupabase, hasAuthCallback, hasStoredSession } from './supabase';

export interface SessionInfo {
  userId: string;
  email: string | null;
}

/**
 * Session state without the bundle cost: the Supabase client only loads when a
 * session already exists (e.g. signed in on evlineup.org), a magic-link
 * callback is in the URL, or the user asks to sign in.
 */
export function useSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    if (!AUTH_ENABLED || (!hasStoredSession() && !hasAuthCallback())) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void getSupabase().then(sb => {
      if (cancelled) return;
      void sb.auth.getSession().then(({ data }) => {
        if (!cancelled) setSession(data.session ? { userId: data.session.user.id, email: data.session.user.email ?? null } : null);
      });
      const { data } = sb.auth.onAuthStateChange((_event, s) => {
        if (!cancelled) setSession(s ? { userId: s.user.id, email: s.user.email ?? null } : null);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => { cancelled = true; unsubscribe?.(); };
  }, []);

  const signIn = useCallback(async (email: string): Promise<string | null> => {
    const sb = await getSupabase();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    return error ? error.message : null;
  }, []);

  const signOut = useCallback(async () => {
    const sb = await getSupabase();
    await sb.auth.signOut();
    setSession(null);
  }, []);

  return { session, signIn, signOut };
}
