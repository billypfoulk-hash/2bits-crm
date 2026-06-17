'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_ACTIVITY, MOCK_CAMPAIGNS } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import type { ActivityLog } from '@/lib/types';
import { formatCurrency, formatDate, STAGE_CONFIG } from '@/lib/utils';
import { ArrowLeft, Phone, Mail, Globe, Plus, Calendar, MessageSquare, PhoneCall, Loader2 } from 'lucide-react';
import Link from 'next/link';

const ACTIVITY_ICONS = {
  call: PhoneCall,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
};

export default function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [contact, setContact] = useState<Database['public']['Tables']['contacts']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: 'call' as ActivityLog['type'],
    summary: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const mapActivityRow = (row: any): ActivityLog => ({
    id: row.id,
    contactId: row.contact_id,
    type: row.type,
    summary: row.summary,
    date: row.date,
    userId: row.user_id,
    userName: row.profiles?.name ?? row.user_id,
  });

  const fetchActivityLogs = async () => {
    setActivityError(null);
    const { data, error: fetchError } = await (supabase.from('activity_logs' as const) as any)
      .select('*, profiles(name)')
      .eq('contact_id', id)
      .order('date', { ascending: false });

    if (fetchError) {
      setActivityError(fetchError.message);
      setActivityLogs([]);
    } else {
      setActivityLogs((data ?? []).map(mapActivityRow));
    }
  };

  useEffect(() => {
    const fetchContact = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setContact(null);
      } else {
        setContact(data);
      }
      setLoading(false);
    };

    void fetchContact();
    void fetchActivityLogs();
  }, [id, supabase]);

  const handleActivityInput = (field: 'type' | 'summary' | 'date', value: string) => {
    setActivityForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveActivity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activityForm.summary.trim()) {
      setActivityError('Please enter a summary for the activity.');
      return;
    }

    setSavingActivity(true);
    setActivityError(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setActivityError(userError?.message ?? 'Unable to identify current user.');
      setSavingActivity(false);
      return;
    }

    const userId = userData.user.id;
    const { error: insertError } = await (supabase.from('activity_logs' as const) as any).insert([
      {
        contact_id: id,
        type: activityForm.type,
        summary: activityForm.summary.trim(),
        date: new Date(activityForm.date).toISOString(),
        user_id: userId,
      },
    ]);

    if (insertError) {
      setActivityError(insertError.message);
      setSavingActivity(false);
      return;
    }

    setShowLogForm(false);
    setActivityForm({ type: 'call', summary: '', date: new Date().toISOString().slice(0, 10) });
    await fetchActivityLogs();
    setSavingActivity(false);
  };

  if (loading) {
    return (
      <div className="p-8 text-[#6B6B8A] flex items-center gap-3">
        <Loader2 className="animate-spin" size={18} /> Loading contact...
      </div>
    );
  }

  if (error || !contact) {
    return <div className="p-8 text-[#6B6B8A]">Contact not found.</div>;
  }

  const activity = activityLogs;
  const campaigns = MOCK_CAMPAIGNS.filter(c => c.clientIds.includes(id));
  const stageCfg = STAGE_CONFIG[contact.stage];
  const socialHandles = Array.isArray(contact.social_handles) ? contact.social_handles as { platform: string; handle: string }[] : [];

  const PLATFORM_ICONS: Record<string, React.ReactNode> = {
    Instagram: <Globe size={12} />,
    Twitter: <Globe size={12} />,
    TikTok: <Globe size={12} />,
  };

  return (
    <div className="p-8 max-w-5xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[#6B6B8A] hover:text-[#F0F0F8] text-sm mb-6 transition-colors">
        <ArrowLeft size={14} /> Back to CRM
      </button>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Contact card */}
        <div className="col-span-1 space-y-4">
          <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A] p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#E8FF47]/10 flex items-center justify-center">
                <span className="text-[#E8FF47] font-bold">
                  {contact.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                </span>
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">{contact.name}</h1>
                <div className="text-[#6B6B8A] text-xs capitalize">{contact.type === 'athlete' ? `${contact.sport ?? ''} · ${contact.school ?? ''}` : contact.type}</div>
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${stageCfg.color}`}>{stageCfg.label}</span>
            {contact.deal_value ? (
              <div className="mt-3 pt-3 border-t border-[#1E1E2A]">
                <div className="text-[#6B6B8A] text-xs">Deal Value</div>
                <div className="text-lg font-bold text-emerald-400">{formatCurrency(Number(contact.deal_value))}</div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A] p-5 space-y-3">
            <h3 className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider">Contact Info</h3>
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm hover:text-[#E8FF47] transition-colors">
              <Mail size={13} className="text-[#6B6B8A]" /> {contact.email}
            </a>
            {contact.phone && (
              <div className="flex items-center gap-2 text-sm text-[#6B6B8A]">
                <Phone size={13} /> {contact.phone}
              </div>
            )}
            {socialHandles.map(s => (
              <div key={s.platform} className="flex items-center gap-2 text-sm text-[#6B6B8A]">
                {PLATFORM_ICONS[s.platform] || <Globe size={12} />}
                <span className="text-[#F0F0F8]">{s.handle}</span>
                <span className="text-[10px] text-[#6B6B8A]">{s.platform}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A] p-5">
            <h3 className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider mb-3">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map(tag => (
                <span key={tag} className="text-xs bg-[#1E1E2A] text-[#6B6B8A] px-2 py-0.5 rounded">{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Tabs area */}
        <div className="col-span-2 space-y-5">
          {/* Notes */}
          <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A] p-5">
            <h3 className="text-sm font-semibold mb-2">Notes</h3>
            <p className="text-sm text-[#6B6B8A] leading-relaxed">{contact.notes || 'No notes yet.'}</p>
          </div>

          {/* Campaigns */}
          <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Campaigns ({campaigns.length})</h3>
              <Link href="/internal/campaigns" className="text-xs text-[#E8FF47] hover:underline">View all</Link>
            </div>
            {campaigns.length === 0 && <p className="text-sm text-[#6B6B8A]">No campaigns yet.</p>}
            <div className="space-y-2">
              {campaigns.map(camp => (
                <Link key={camp.id} href={`/internal/campaigns/${camp.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0A0F] border border-[#1E1E2A] hover:border-[#E8FF47]/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{camp.title}</div>
                    <div className="text-xs text-[#6B6B8A]">{formatDate(camp.startDate)} – {formatDate(camp.endDate)}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${camp.status === 'active' ? 'bg-emerald-900/60 text-emerald-300' : camp.status === 'planning' ? 'bg-blue-900/60 text-blue-300' : 'bg-zinc-700 text-zinc-300'}`}>
                    {camp.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Activity Log</h3>
              <button
                type="button"
                onClick={() => setShowLogForm((prev) => !prev)}
                className="text-xs text-[#E8FF47] flex items-center gap-1 hover:underline"
              >
                <Plus size={12} /> {showLogForm ? 'Cancel' : 'Log activity'}
              </button>
            </div>
            {showLogForm && (
              <form onSubmit={handleSaveActivity} className="space-y-3 mb-4 border border-[#1E1E2A] rounded-xl bg-[#0A0A0F] p-4">
                <div className="grid grid-cols-3 gap-3">
                  <label className="col-span-1 text-[11px] uppercase tracking-wider text-[#6B6B8A]">Type</label>
                  <select
                    value={activityForm.type}
                    onChange={(event) => handleActivityInput('type', event.target.value)}
                    className="col-span-2 rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white outline-none focus:border-[#E8FF47]"
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="note">Note</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <label className="col-span-1 text-[11px] uppercase tracking-wider text-[#6B6B8A]">Date</label>
                  <input
                    type="date"
                    value={activityForm.date}
                    onChange={(event) => handleActivityInput('date', event.target.value)}
                    className="col-span-2 rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white outline-none focus:border-[#E8FF47]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <label className="col-span-1 text-[11px] uppercase tracking-wider text-[#6B6B8A]">Summary</label>
                  <textarea
                    value={activityForm.summary}
                    onChange={(event) => handleActivityInput('summary', event.target.value)}
                    rows={3}
                    className="col-span-2 w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white outline-none focus:border-[#E8FF47]"
                    placeholder="Add a quick summary of the activity..."
                  />
                </div>

                {activityError ? <div className="text-sm text-rose-400">{activityError}</div> : null}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingActivity}
                    className="rounded-lg bg-[#E8FF47] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingActivity ? 'Saving…' : 'Save activity'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogForm(false)}
                    className="text-xs text-[#6B6B8A] hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {activityError && !showLogForm ? <p className="text-sm text-rose-400 mb-3">{activityError}</p> : null}
            {activity.length === 0 ? <p className="text-sm text-[#6B6B8A]">No activity logged yet.</p> : null}
            <div className="space-y-3">
              {activity.map(log => {
                const Icon = ACTIVITY_ICONS[log.type];
                return (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#1E1E2A] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={12} className="text-[#6B6B8A]" />
                    </div>
                    <div>
                      <p className="text-sm">{log.summary}</p>
                      <div className="text-xs text-[#6B6B8A] mt-0.5">{log.userName} · {formatDate(log.date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
