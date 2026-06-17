'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { formatDate, STATUS_CONFIG } from '@/lib/utils';
import { ArrowLeft, FileVideo, Image as ImageIcon, CheckCircle, Clock, TrendingUp } from 'lucide-react';

const TYPE_ICONS = { video: FileVideo, graphic: ImageIcon, copy: FileVideo, photo: ImageIcon };

export default function ClientCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { profile, campaigns } = useAppStore();

  const campaign = campaigns.find(c => c.id === id && c.clientIds.includes(profile?.clientId || ''));
  if (!campaign) return <div className="p-8 text-[#6B6B8A]">Campaign not found or access denied.</div>;

  const approved = campaign.deliverables.filter(d => d.status === 'approved' || d.status === 'posted');
  const inReview = campaign.deliverables.filter(d => d.status === 'in_review');
  const upcoming = campaign.deliverables.filter(d => d.status === 'todo' || d.status === 'in_progress');

  return (
    <div className="p-8 max-w-4xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[#6B6B8A] hover:text-[#F0F0F8] text-sm mb-6 transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      <h1 className="text-2xl font-bold mb-1">{campaign.title}</h1>
      <p className="text-[#6B6B8A] text-sm mb-6">{formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}</p>

      {campaign.description && (
        <p className="text-[#6B6B8A] mb-8 max-w-2xl leading-relaxed">{campaign.description}</p>
      )}

      {/* KPIs */}
      {campaign.kpis.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-10">
          {campaign.kpis.map(kpi => (
            <div key={kpi.label} className="rounded-2xl border border-[#1E1E2A] bg-[#13131A] p-4 text-center">
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="text-[#6B6B8A] text-xs mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Needs Review */}
      {inReview.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold mb-4 flex items-center gap-2 text-amber-400">
            <Clock size={16} /> Needs Your Review ({inReview.length})
          </h2>
          <div className="space-y-3">
            {inReview.map(del => {
              const href = del.type === 'video' ? `/client/review/video/${del.id}` : `/client/review/image/${del.id}`;
              const Icon = TYPE_ICONS[del.type] || FileVideo;
              return (
                <Link key={del.id} href={href} className="flex items-center gap-4 p-4 rounded-xl border border-amber-800/40 bg-amber-900/10 hover:bg-amber-900/20 transition-all group">
                  {del.thumbnailUrl ? (
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={del.thumbnailUrl} alt={del.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[#1E1E2A] flex items-center justify-center flex-shrink-0">
                      <Icon size={20} className="text-[#6B6B8A]" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-sm group-hover:text-[#E8FF47] transition-colors">{del.title}</div>
                    <div className="text-xs text-[#6B6B8A] mt-0.5">Due {formatDate(del.dueDate)}</div>
                  </div>
                  <span className="text-xs bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full flex-shrink-0">Review →</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Approved */}
      {approved.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold mb-4 flex items-center gap-2 text-emerald-400">
            <CheckCircle size={16} /> Approved ({approved.length})
          </h2>
          <div className="space-y-2">
            {approved.map(del => {
              const cfg = STATUS_CONFIG[del.status];
              return (
                <div key={del.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#1E1E2A] bg-[#13131A]">
                  {del.thumbnailUrl ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={del.thumbnailUrl} alt={del.title} className="w-full h-full object-cover" />
                    </div>
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{del.title}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Coming up */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="font-bold mb-4 text-[#6B6B8A]">Coming Up ({upcoming.length})</h2>
          <div className="space-y-2">
            {upcoming.map(del => {
              const cfg = STATUS_CONFIG[del.status];
              return (
                <div key={del.id} className="flex items-center gap-3 p-3 rounded-xl border border-[#1E1E2A] bg-[#0A0A0F]">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#6B6B8A] truncate">{del.title}</div>
                    <div className="text-xs text-[#6B6B8A] mt-0.5">Due {formatDate(del.dueDate)}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
