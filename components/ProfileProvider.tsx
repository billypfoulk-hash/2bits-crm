'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import type { Profile } from '@/lib/store';
import type { Campaign } from '@/lib/types';

// Receives the profile fetched server-side and seeds the Zustand store.
// Wrap each layout's <main> with this so every Client Component can call
// useAppStore((s) => s.profile) without an extra fetch.
export default function ProfileProvider({
  profile,
  children,
}: {
  profile: Profile | null;
  children: React.ReactNode;
}) {
  const setProfile = useAppStore((s) => s.setProfile);
  const setCampaigns = useAppStore((s) => s.setCampaigns);

  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);

  useEffect(() => {
    if (!profile) {
      setCampaigns([]);
      return;
    }

    const fetchCampaigns = async () => {
      const supabase = createClient();
      const { data, error } = await (supabase.from('campaigns' as const) as any)
        .select('*, deliverables(*, comments(*)), campaign_contacts(*, contacts(id, name))')
        .order('created_at', { ascending: false });

      if (!data || error) {
        setCampaigns([]);
        return;
      }

      const mapped = (data ?? []).map((row: any): Campaign => {
        const contacts = row.campaign_contacts ?? [];
        return {
          id: row.id,
          title: row.title,
          type: row.type,
          status: row.status,
          startDate: row.start_date,
          endDate: row.end_date,
          description: row.description ?? '',
          tags: row.tags ?? [],
          dealValue: row.deal_value !== null ? Number(row.deal_value) : undefined,
          kpis: Array.isArray(row.kpis) ? row.kpis : [],
          createdAt: row.created_at,
          clientIds: contacts.map((cc: any) => cc.contact_id),
          clientNames: contacts.map((cc: any) => cc.contacts?.name ?? ''),
          deliverables: (row.deliverables ?? []).map((del: any) => ({
            id: del.id,
            campaignId: del.campaign_id,
            title: del.title,
            type: del.type,
            status: del.status,
            assigneeId: del.assignee_id ?? undefined,
            assigneeName: undefined,
            dueDate: del.due_date,
            fileUrl: del.file_url ?? undefined,
            thumbnailUrl: del.thumbnail_url ?? undefined,
            comments: (del.comments ?? []).map((comment: any) => ({
              id: comment.id,
              deliverableId: comment.deliverable_id,
              userId: comment.user_id,
              userName: '',
              userRole: 'internal',
              body: comment.body,
              resolved: comment.resolved,
              createdAt: comment.created_at,
            })),
            createdAt: del.created_at,
          })),
        };
      });

      setCampaigns(mapped);
    };

    void fetchCampaigns();
  }, [profile, setCampaigns]);

  return <>{children}</>;
}
