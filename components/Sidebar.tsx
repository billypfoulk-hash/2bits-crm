'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { LayoutDashboard, Users, Megaphone, FileVideo, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const INTERNAL_NAV = [
  { href: '/internal', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/internal/crm', label: 'CRM', icon: Users },
  { href: '/internal/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/internal/review', label: 'Review Queue', icon: FileVideo },
];

const CLIENT_NAV = [
  { href: '/client', label: 'My Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/client/campaigns', label: 'Campaigns', icon: Megaphone },
];

export default function Sidebar({ mode }: { mode: 'internal' | 'client' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, setProfile } = useAppStore();
  const nav = mode === 'internal' ? INTERNAL_NAV : CLIENT_NAV;

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-56 flex-shrink-0 border-r border-[#1E1E2A] bg-[#0A0A0F] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#1E1E2A]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#E8FF47] flex items-center justify-center flex-shrink-0">
            <span className="text-black font-black text-xs">2B</span>
          </div>
          <div>
            <div className="text-sm font-bold leading-none">2 Bits</div>
            <div className="text-[10px] text-[#6B6B8A] mt-0.5">
              {mode === 'internal' ? 'Internal' : 'Client Portal'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                active
                  ? 'bg-[#E8FF47]/10 text-[#E8FF47] font-medium'
                  : 'text-[#6B6B8A] hover:text-[#F0F0F8] hover:bg-[#1E1E2A]'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-[#1E1E2A]">
        {profile && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1">
            <div className="w-7 h-7 rounded-full bg-[#E8FF47]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#E8FF47] text-xs font-bold">
                {profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{profile.name}</div>
              <div className="text-[10px] text-[#6B6B8A] truncate capitalize">
                {profile.role.replace('_', ' ')}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#6B6B8A] hover:text-red-400 hover:bg-red-900/10 transition-all"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
