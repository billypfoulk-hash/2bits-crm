import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';
import ProfileProvider from '@/components/ProfileProvider';
import type { Profile } from '@/lib/store';
import type { Database } from '@/lib/supabase/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, role, client_id, avatar_url')
      .eq('id', user.id)
      .single() as { data: ProfileRow | null; error: unknown };

    if (data) {
      profile = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        clientId: data.client_id ?? undefined,
        avatar: data.avatar_url ?? undefined,
      };
    }
  }

  return (
    <ProfileProvider profile={profile}>
      <div className="flex h-screen bg-[#0A0A0F] overflow-hidden">
        <Sidebar mode="client" />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </ProfileProvider>
  );
}
