/**
 * Shared Supabase project with evlineup.org (same origin at /compare-range/,
 * default storage key) — someone signed in on the main site is signed in here.
 *
 * The client is loaded lazily so anonymous visitors never download it: only a
 * stored session, an auth callback in the URL, or a sign-in click pulls it in.
 * The anon key is public-by-design (it ships in every page load of evlineup);
 * it comes from VITE_SUPABASE_ANON_KEY at build time.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://mesvpswjkqqogdoscyxx.supabase.co';
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
/** Sign-in UI only renders when the key was provided at build time. */
export const AUTH_ENABLED = SUPABASE_ANON_KEY.length > 0;

let clientPromise: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    // PKCE: the magic-link callback arrives as ?code=… (the hash belongs to our app state).
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { flowType: 'pkce' } }),
  );
  return clientPromise;
}

/** Cheap check (no library load): does this origin already hold a Supabase session? */
export function hasStoredSession(): boolean {
  try {
    return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.includes('auth-token'));
  } catch {
    return false;
  }
}

/** True when the page URL carries a magic-link callback that must be exchanged. */
export function hasAuthCallback(): boolean {
  return /[?&]code=/.test(window.location.search);
}
