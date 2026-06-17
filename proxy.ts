import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Skip auth gating when Supabase is not configured (local dev before .env.local is set).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not add logic between createServerClient and getUser().
  // A simple mistake here can cause session cookies to not be refreshed correctly.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Unauthenticated users can only reach /login and /auth/**
  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Authenticated users are sent away from /login to their dashboard.
  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null; error: unknown };

    const dest = profile?.role === 'client_athlete' || profile?.role === 'client_brand'
      ? '/client'
      : '/internal';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Prevent clients from accessing internal routes.
  if (user && pathname.startsWith('/internal')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null; error: unknown };

    if (profile?.role === 'client_athlete' || profile?.role === 'client_brand') {
      return NextResponse.redirect(new URL('/client', request.url));
    }
  }

  // Prevent internal users from accessing client routes.
  if (user && pathname.startsWith('/client')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null; error: unknown };

    if (profile?.role === 'admin' || profile?.role === 'internal') {
      return NextResponse.redirect(new URL('/internal', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
