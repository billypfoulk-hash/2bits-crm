'use client';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { formatDate, STATUS_CONFIG } from '@/lib/utils';
import { CheckCircle, Clock, FileVideo, Image as ImageIcon, TrendingUp } from 'lucide-react';

export default function ClientDashboard() {
  const { profile, campaigns } = useAppStore();
  // clientId comes from the authenticated profile

  // Strict data isolation: client sees only their campaigns
  const myCampaigns = campaigns.filter(c => c.clientIds.includes(profile?.clientId || ''));
  const allDeliverables = myCampaigns.flatMap(c => c.deliverables);
  const approved = allDeliverables.filter(d => d.status === 'approved' || d.status === 'posted').length;
  const inReview = allDeliverables.filter(d => d.status === 'in_review');
  const allKpis = myCampaigns.flatMap(c => c.kpis);

  return (
    <div className="p-8 max-w-5xl">
      {/* Welcome header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs text-[#6B6B8A] mb-3 bg-[#13131A] border border-[#1E1E2A] px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8FF47]" />
          Client Portal
        </div>
        <h1 className="text-3xl font-bold mb-1">Hey, {profile?.name.split(' ')[0]} 👋</h1>
        <p className="text-[#6B6B8A]">Here's everything happening across your campaigns with 2 Bits Creative.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="rounded-2xl border border-[#1E1E2A] bg-[#13131A] p-6">
          <CheckCircle size={20} className="text-emerald-400 mb-3" />
          <div className="text-3xl font-bold">{approved}</div>
          <div className="text-[#6B6B8A] text-sm mt-1">Approved Deliverables</div>
        </div>
        <div className="rounded-2xl border border-[#1E1E2A] bg-[#13131A] p-6">
          <Clock size={20} className="text-amber-400 mb-3" />
          <div className="text-3xl font-bold">{inReview.length}</div>
          <div className="text-[#6B6B8A] text-sm mt-1">Awaiting Your Review</div>
        </div>
        <div className="rounded-2xl border border-[#1E1E2A] bg-[#13131A] p-6">
          <TrendingUp size={20} className="text-[#00C2FF] mb-3" />
          <div className="text-3xl font-bold">{myCampaigns.length}</div>
          <div className="text-[#6B6B8A] text-sm mt-1">Active Campaigns</div>
        </div>
      </div>

      {/* Needs your review */}
      {inReview.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Needs Your Review
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {inReview.map(del => {
              const camp = myCampaigns.find(c => c.id === del.campaignId);
              const openComments = del.comments.filter(c => !c.resolved).length;
              const href = del.type === 'video'
                ? `/client/review/video/${del.id}`
                : `/client/review/image/${del.id}`;
              return (
                <Link key={del.id} href={href} className="flex gap-4 p-5 rounded-2xl border border-amber-800/40 bg-amber-900/10 hover:bg-amber-900/20 transition-all group">
                  {del.thumbnailUrl ? (
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#1E1E2A]">
                      <img src={del.thumbnailUrl} alt={del.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={`w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 ${del.type === 'video' ? 'bg-purple-900/30' : 'bg-blue-900/30'}`}>
                      {del.type === 'video' ? <FileVideo size={28} className="text-purple-400" /> : <ImageIcon size={28} className="text-blue-400" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm group-hover:text-[#E8FF47] transition-colors leading-snug">{del.title}</div>
                    <div className="text-[#6B6B8A] text-xs mt-1">{camp?.title}</div>
                    <div className="text-[#6B6B8A] text-xs mt-0.5">Due {formatDate(del.dueDate)}</div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full">Review needed</span>
                      {openComments > 0 && (
                        <span className="text-xs text-[#6B6B8A]">{openComments} comment{openComments !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Campaign KPIs */}
      {allKpis.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-bold mb-4">Campaign Performance</h2>
          <div className="grid grid-cols-4 gap-4">
            {allKpis.map((kpi, i) => (
              <div key={i} className="rounded-2xl border border-[#1E1E2A] bg-[#13131A] p-5">
                <div className="text-[#6B6B8A] text-xs mb-2">{kpi.label}</div>
                <div className="text-2xl font-bold">{kpi.value}{kpi.unit}</div>
                {kpi.trend === 'up' && <div className="text-xs text-emerald-400 mt-1">↑ trending up</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaigns list */}
      <div>
        <h2 className="text-lg font-bold mb-4">Your Campaigns</h2>
        <div className="space-y-3">
          {myCampaigns.map(camp => {
            const total = camp.deliverables.length;
            const done = camp.deliverables.filter(d => d.status === 'approved' || d.status === 'posted').length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <Link key={camp.id} href={`/client/campaigns/${camp.id}`} className="flex items-center gap-5 p-5 rounded-2xl border border-[#1E1E2A] bg-[#13131A] hover:border-[#E8FF47]/30 transition-all group">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold group-hover:text-[#E8FF47] transition-colors">{camp.title}</div>
                  <div className="text-[#6B6B8A] text-sm mt-0.5">{formatDate(camp.startDate)} – {formatDate(camp.endDate)}</div>
                </div>
                <div className="text-right flex-shrink-0 w-36">
                  <div className="text-xs text-[#6B6B8A] mb-1.5">{done}/{total} deliverables</div>
                  <div className="w-full h-2 bg-[#1E1E2A] rounded-full">
                    <div className="h-2 bg-[#E8FF47] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-[#6B6B8A] mt-1">{pct}% complete</div>
                </div>
              </Link>
            );
          })}
          {myCampaigns.length === 0 && (
            <div className="rounded-2xl border border-[#1E1E2A] bg-[#13131A] p-10 text-center text-[#6B6B8A]">
              No campaigns yet. Your team will set these up shortly.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
