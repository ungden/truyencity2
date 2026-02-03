import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Lazy-load env vars to avoid build-time errors
const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  }

  return { url, key };
};

export const createServerClient = async () => {
  const { url, key } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // In development, silently ignore cookie setting errors
          if (process.env.NODE_ENV === 'development') {
            return;
          }
          try {
            cookieStore.set(name, value, {
              ...options,
              path: '/',
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax'
            });
          } catch (error) {
            // Safe to ignore in Server Components
            console.warn('Failed to set cookie:', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          // In development, silently ignore cookie removal errors
          if (process.env.NODE_ENV === 'development') {
            return;
          }
          try {
            cookieStore.set(name, '', {
              ...options,
              maxAge: 0,
              path: '/',
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax'
            });
          } catch (error) {
            // Safe to ignore in Server Components
            console.warn('Failed to remove cookie:', error);
          }
        },
      },
    }
  );
};
