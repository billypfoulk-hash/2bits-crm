import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

// Singleton — safe to call in any Client Component or client-side util.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
