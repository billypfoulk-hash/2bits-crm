'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { formatCurrency, STATUS_CONFIG, STAGE_CONFIG } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Users, Megaphone, CheckSquare, DollarSign, ArrowRight, Loader2 } from 'lucide-react';

type ContactRow = Database['public']['Tables']['contacts']['Row'];

function TrendIcon({ trend }: { trend?: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <TrendingUp size={12} className="text-emerald-400" />;
  if (trend === 'down') return <TrendingDown size={12} className="text-red-400" />;
  return <Minus size={12} className="text-zinc-500" />;
}

export default function InternalDashboard() {
  const { profile, campaigns } = useAppStore();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const allDeliverables = campaigns.flatMap(c => c.deliverables);
  const inReview = allDeliverables.filter(d => d.status === 'in_review');
  const totalDealValue = useMemo(() => contacts.reduce((sum, c) => sum + Number(c.deal_value ?? 0), 0), [contacts]);
  const pipelineContacts = useMemo(() => contacts.filter(c => c.stage !== 'completed'), [contacts]);

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      setError(null);
      const contactsClient = supabase.from('contacts' as const) as any;
      const { data, error: fetchError } = await contactsClient
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setContacts([]);
      } else {
        setContacts(data ?? []);
      }
      setLoading(false);
    };

    void fetchContacts();
  }, [supabase]);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Good morning, {profile?.name.split(' ')[0]} 👋</h1>
        <p className="text-[#6B6B8A] text-sm mt-1">Here's what's happening across your accounts.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Campaigns', value: activeCampaigns.length, icon: Megaphone, color: 'text-[#E8FF47]', bg: 'bg-[#E8FF47]/5' },
          { label: 'In Review', value: inReview.length, icon: CheckSquare, color: 'text-[#00C2FF]', bg: 'bg-[#00C2FF]/5' },
          { label: 'Pipeline Contacts', value: pipelineContacts.length, icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/5' },
          { label: 'Total Deal Value', value: formatCurrency(totalDealValue), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/5' },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border border-[#1E1E2A] p-5 ${kpi.bg}`}>
            <div className={`${kpi.color} mb-3`}><kpi.icon size={18} /></div>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div className="text-[#6B6B8A] text-xs mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Active Campaigns */}
        <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E2A]">
            <h2 className="font-semibold text-sm">Active Campaigns</h2>
            <Link href="/internal/campaigns" className="text-[#E8FF47] text-xs flex items-center gap-1 hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-[#1E1E2A]">
            {activeCampaigns.map(camp => {
              const total = camp.deliverables.length;
              const done = camp.deliverables.filter(d => d.status === 'approved' || d.status === 'posted').length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <Link key={camp.id} href={`/internal/campaigns/${camp.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-[#1a1a24] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{camp.title}</div>
                    <div className="text-[#6B6B8A] text-xs mt-0.5">{camp.clientNames.join(' × ')}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-[#6B6B8A]">{done}/{total} done</div>
                    <div className="w-20 h-1 bg-[#1E1E2A] rounded-full mt-1">
                      <div className="h-1 bg-[#E8FF47] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Review Queue */}
        <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E2A]">
            <h2 className="font-semibold text-sm">Review Queue</h2>
            <Link href="/internal/review" className="text-[#E8FF47] text-xs flex items-center gap-1 hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-[#1E1E2A]">
            {inReview.length === 0 && (
              <div className="px-5 py-6 text-[#6B6B8A] text-sm text-center">All clear — nothing pending review.</div>
            )}
            {inReview.map(del => {
              const open = del.comments.filter(c => !c.resolved).length;
              return (
                <Link
                  key={del.id}
                  href={del.type === 'video' ? `/internal/review/video/${del.id}` : `/internal/review/image/${del.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[#1a1a24] transition-colors"
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${del.type === 'video' ? 'bg-purple-900/40 text-purple-300' : 'bg-blue-900/40 text-blue-300'}`}>
                    {del.type === 'video' ? 'VID' : 'IMG'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{del.title}</div>
                    <div className="text-[#6B6B8A] text-xs">{del.assigneeName}</div>
                  </div>
                  {open > 0 && (
                    <span className="text-xs bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full flex-shrink-0">{open} open</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* CRM Pipeline */}
        <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A] col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E2A]">
            <h2 className="font-semibold text-sm">Pipeline</h2>
            <Link href="/internal/crm" className="text-[#E8FF47] text-xs flex items-center gap-1 hover:underline">
              Full CRM <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-5 grid grid-cols-5 gap-3">
            {(['lead', 'in_talks', 'contract', 'active', 'completed'] as const).map(stage => {
              const stageContacts = contacts.filter(c => c.stage === stage);
              const cfg = STAGE_CONFIG[stage];
              return (
                <div key={stage}>
                  <div className={`text-xs font-medium px-2 py-1 rounded mb-2 inline-block ${cfg.color}`}>{cfg.label}</div>
                  <div className="space-y-2">
                    {loading ? (
                      <div className="text-[#6B6B8A] text-xs py-2 px-1">Loading...</div>
                    ) : stageContacts.length > 0 ? (
                      stageContacts.map(c => (
                        <Link key={c.id} href={`/internal/crm/${c.id}`} className="block p-2.5 rounded-lg bg-[#0A0A0F] border border-[#1E1E2A] hover:border-[#E8FF47]/30 transition-colors">
                          <div className="text-xs font-medium truncate">{c.name}</div>
                          <div className="text-[10px] text-[#6B6B8A] mt-0.5 truncate">{c.sport || c.type}</div>
                          {c.deal_value ? <div className="text-[10px] text-emerald-400 mt-1">{formatCurrency(Number(c.deal_value))}</div> : null}
                        </Link>
                      ))
                    ) : (
                      <div className="text-[#6B6B8A] text-xs py-2 px-1">—</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
