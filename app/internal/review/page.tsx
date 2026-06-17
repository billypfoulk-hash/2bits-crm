'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/store';
import { FileVideo, Image as ImageIcon, Plus, ArrowLeftRight } from 'lucide-react';
import { STATUS_CONFIG } from '@/lib/utils';

const supabase = createClient();

export default function ReviewQueuePage() {
  const { campaigns, updateDeliverableStatus } = useAppStore();
  const [selectedDeliverableId, setSelectedDeliverableId] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);

  const inReview = useMemo(
    () => campaigns.flatMap(c =>
      c.deliverables
        .filter(d => d.status === 'in_review')
        .map(d => ({ ...d, campaignTitle: c.title, campaignId: c.id }))
    ),
    [campaigns]
  );

  const availableDeliverables = useMemo(
    () => campaigns.flatMap(c =>
      c.deliverables
        .filter(d => d.status !== 'in_review')
        .map(d => ({ ...d, campaignTitle: c.title, campaignId: c.id }))
    ),
    [campaigns]
  );

  const handleAddToQueue = async () => {
    if (!selectedDeliverableId) {
      setQueueError('Select a deliverable first.');
      return;
    }

    const deliverable = availableDeliverables.find(d => d.id === selectedDeliverableId);
    if (!deliverable) {
      setQueueError('Selected deliverable is no longer available.');
      return;
    }

    setQueueError(null);
    setAdding(true);

    const { error } = await supabase
      .from('deliverables' as const)
      .update({ status: 'in_review' })
      .eq('id', selectedDeliverableId);

    if (error) {
      setQueueError(error.message);
      setAdding(false);
      return;
    }

    updateDeliverableStatus(deliverable.campaignId, selectedDeliverableId, 'in_review');
    setSelectedDeliverableId('');
    setAdding(false);
  };

  const handleRemoveFromQueue = async (campaignId: string, deliverableId: string) => {
    setQueueError(null);
    setRemovingId(deliverableId);

    const { error } = await supabase
      .from('deliverables' as const)
      .update({ status: 'in_progress' })
      .eq('id', deliverableId);

    if (error) {
      setQueueError(error.message);
      setRemovingId(null);
      return;
    }

    updateDeliverableStatus(campaignId, deliverableId, 'in_progress');
    setRemovingId(null);
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Review Queue</h1>
          <p className="text-[#6B6B8A] text-sm">{inReview.length} deliverables awaiting review</p>
        </div>
        <div className="rounded-3xl border border-[#1E1E2A] bg-[#13131A] p-4 w-full sm:w-auto">
          <label className="block text-xs text-[#6B6B8A] uppercase tracking-[0.2em] mb-2">Add to Queue</label>
          <div className="flex gap-2 flex-col sm:flex-row items-stretch">
            <select
              className="flex-1 rounded-xl border border-[#2C2C3A] bg-[#0F0F16] px-3 py-2 text-sm text-white outline-none focus:border-[#E8FF47]/50"
              value={selectedDeliverableId}
              onChange={(event) => setSelectedDeliverableId(event.target.value)}
            >
              <option value="">Select deliverable</option>
              {availableDeliverables.map(del => (
                <option key={del.id} value={del.id}>
                  {del.campaignTitle} — {del.title} ({STATUS_CONFIG[del.status]?.label ?? del.status})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E8FF47] px-4 py-2 text-sm font-semibold text-black hover:bg-[#dbde33] transition"
              onClick={handleAddToQueue}
              disabled={adding || !selectedDeliverableId}
            >
              <Plus size={16} />
              {adding ? 'Adding…' : 'Add to Queue'}
            </button>
          </div>
          {queueError && <p className="mt-2 text-sm text-rose-400">{queueError}</p>}
          {availableDeliverables.length === 0 && (
            <p className="mt-2 text-sm text-[#6B6B8A]">No deliverables available to move into review.</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {inReview.map(del => {
          const open = del.comments.filter(c => !c.resolved).length;
          const href = del.type === 'video'
            ? `/internal/review/video/${del.id}`
            : `/internal/review/image/${del.id}`;
          return (
            <div key={del.id} className="flex flex-col xl:flex-row xl:items-center gap-3 p-4 rounded-xl border border-[#1E1E2A] bg-[#13131A] hover:border-[#E8FF47]/30 transition-all">
              <Link href={href} className="flex-1 flex items-center gap-4 min-w-0">
                {del.thumbnailUrl ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#1E1E2A]">
                    <img src={del.thumbnailUrl} alt={del.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${del.type === 'video' ? 'bg-purple-900/30' : 'bg-blue-900/30'}`}>
                    {del.type === 'video' ? <FileVideo size={24} className="text-purple-400" /> : <ImageIcon size={24} className="text-blue-400" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm hover:text-[#E8FF47] transition-colors">{del.title}</div>
                  <div className="text-[#6B6B8A] text-xs mt-0.5">{del.campaignTitle}</div>
                  <div className="text-[#6B6B8A] text-xs">Assigned to {del.assigneeName}</div>
                </div>
              </Link>
              <div className="flex flex-col gap-2 xl:items-end">
                <div className="flex gap-2 items-center text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${del.type === 'video' ? 'bg-purple-900/40 text-purple-300' : 'bg-blue-900/40 text-blue-300'}`}>
                    {del.type}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300">
                    In review
                  </span>
                </div>
                {open > 0 ? (
                  <span className="text-xs bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full">{open} open</span>
                ) : del.comments.length > 0 ? (
                  <span className="text-xs bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded-full">all resolved</span>
                ) : null}
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2C2C3A] bg-[#0F0F16] px-3 py-2 text-xs font-semibold text-[#E8FF47] hover:border-[#E8FF47] transition"
                  onClick={() => handleRemoveFromQueue(del.campaignId, del.id)}
                  disabled={removingId === del.id}
                >
                  <ArrowLeftRight size={14} />
                  {removingId === del.id ? 'Removing…' : 'Send back to progress'}
                </button>
              </div>
            </div>
          );
        })}
        {inReview.length === 0 && (
          <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A] p-12 text-center text-[#6B6B8A]">
            <div className="text-4xl mb-3">✓</div>
            <div className="font-semibold">All clear — nothing in review</div>
          </div>
        )}
      </div>
    </div>
  );
}
