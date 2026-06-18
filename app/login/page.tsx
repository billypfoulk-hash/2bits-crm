'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

 async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError(authError.message);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setError(userError?.message ?? 'Unable to resolve authenticated user.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle() as { data: Pick<ProfileRow, 'role'> | null; error: { message: string } | null };

      if (profileError) {
        setError(`Profile lookup failed: ${profileError.message}`);
        return;
      }

      if (!profile) {
        setError('No profile found for this account. Contact your admin.');
        return;
      }

      const dest =
        profile.role === 'client_athlete' || profile.role === 'client_brand'
          ? '/client'
          : '/internal';

      router.push(dest);
      router.refresh(); // flush server component cache with new session
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong signing in.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded bg-[#E8FF47] flex items-center justify-center">
            <span className="text-black font-black text-sm">2B</span>
          </div>
          <span className="text-xl font-bold tracking-tight">2 Bits Creative</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Sign in</h1>
        <p className="text-[#6B6B8A] text-sm">Enter your credentials to access the platform.</p>
      </div>

      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#6B6B8A] mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="you@2bitscreative.com"
            className="w-full px-4 py-2.5 bg-[#13131A] border border-[#1E1E2A] rounded-lg text-sm focus:outline-none focus:border-[#E8FF47]/50 placeholder:text-[#6B6B8A]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B6B8A] mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 pr-10 bg-[#13131A] border border-[#1E1E2A] rounded-lg text-sm focus:outline-none focus:border-[#E8FF47]/50 placeholder:text-[#6B6B8A]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B8A] hover:text-[#F0F0F8] transition-colors"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-900/20 border border-red-800/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-[#E8FF47] text-black font-bold text-sm rounded-lg hover:bg-[#d4eb3a] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-[#6B6B8A] text-xs text-center">
        Forgot your password?{' '}
        <a href="mailto:admin@2bitscreative.com" className="text-[#E8FF47] hover:underline">
          Contact your admin.
        </a>
      </p>
    </div>
  );
}
