'use client';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function ClientCampaignsPage() {
  const { profile, campaigns } = useAppStore();
  const myCampaigns = campaigns.filter(c => c.clientIds.includes(profile?.clientId || ''));

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">Campaigns</h1>
      <p className="text-[#6B6B8A] text-sm mb-8">{myCampaigns.length} campaigns with 2 Bits Creative</p>

      <div className="space-y-4">
        {myCampaigns.map(camp => {
          const total = camp.deliverables.length;
          const done = camp.deliverables.filter(d => d.status === 'approved' || d.status === 'posted').length;
          const inReview = camp.deliverables.filter(d => d.status === 'in_review').length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <Link key={camp.id} href={`/client/campaigns/${camp.id}`} className="block rounded-2xl border border-[#1E1E2A] bg-[#13131A] p-6 hover:border-[#E8FF47]/30 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-bold text-lg group-hover:text-[#E8FF47] transition-colors leading-snug">{camp.title}</h2>
                  <div className="text-[#6B6B8A] text-sm mt-1">{formatDate(camp.startDate)} – {formatDate(camp.endDate)}</div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full capitalize flex-shrink-0 ml-4 ${camp.status === 'active' ? 'bg-emerald-900/60 text-emerald-300' : camp.status === 'completed' ? 'bg-zinc-700 text-zinc-300' : 'bg-blue-900/60 text-blue-300'}`}>
                  {camp.status}
                </span>
              </div>
              {camp.description && <p className="text-sm text-[#6B6B8A] mb-4">{camp.description}</p>}
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-[#6B6B8A]">Progress </span>
                  <span className="font-medium">{done}/{total}</span>
                </div>
                {inReview > 0 && (
                  <div className="text-amber-400 font-medium">{inReview} needs review</div>
                )}
                {camp.dealValue && (
                  <div className="text-emerald-400 font-medium ml-auto">{formatCurrency(camp.dealValue)}</div>
                )}
              </div>
              <div className="w-full h-2 bg-[#1E1E2A] rounded-full mt-3">
                <div className="h-2 bg-[#E8FF47] rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
