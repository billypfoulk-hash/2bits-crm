'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LayoutGrid, List, TrendingUp, Plus, Edit3, Trash2, X, Loader2 } from 'lucide-react';
import type { Campaign, KPI, Deliverable, DeliverableStatus } from '@/lib/types';

const STATUS_COLORS: Record<Campaign['status'], string> = {
  planning: 'bg-blue-900/60 text-blue-300',
  active: 'bg-emerald-900/60 text-emerald-300',
  in_review: 'bg-amber-900/60 text-amber-300',
  completed: 'bg-zinc-700 text-zinc-300',
};

const TYPE_LABELS: Record<Campaign['type'], string> = {
  nil_deal: 'NIL Deal',
  game_day: 'Game Day',
  sponsorship: 'Sponsorship',
  season_retainer: 'Season Retainer',
  brand_activation: 'Brand Activation',
};

const TYPE_OPTIONS: Campaign['type'][] = ['nil_deal', 'game_day', 'sponsorship', 'season_retainer', 'brand_activation'];
const STATUS_OPTIONS: Campaign['status'][] = ['planning', 'active', 'in_review', 'completed'];

const emptyCampaignForm = {
  title: '',
  type: 'nil_deal' as Campaign['type'],
  status: 'planning' as Campaign['status'],
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  description: '',
  tags: '',
  dealValue: '',
};

type CampaignForm = typeof emptyCampaignForm;

type CampaignRow = Database['public']['Tables']['campaigns']['Row'];

type DeliverableRow = Database['public']['Tables']['deliverables']['Row'];

type CommentRow = Database['public']['Tables']['comments']['Row'];

function mapDeliverableRow(del: DeliverableRow & { comments?: CommentRow[] }): Deliverable {
  return {
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
    comments: (del.comments ?? []).map((comment) => ({
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
  };
}

function mapCampaignRow(row: CampaignWithContacts): Campaign {
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
    clientIds: contacts.map((contact) => contact.contact_id),
    clientNames: contacts.map((contact) => contact.contacts?.name ?? ''),
    deliverables: (row.deliverables ?? []).map(mapDeliverableRow),
  };
}

export default function CampaignsPage() {
  const { setCampaigns } = useAppStore();
  const [campaigns, setLocalCampaigns] = useState<Campaign[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CampaignForm>(emptyCampaignForm);

  const supabase = createClient();

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    const campaignClient = supabase.from('campaigns' as const) as any;
    const { data, error: fetchError } = await campaignClient
      .select('*, deliverables(*, comments(*)), campaign_contacts(*, contacts(id, name))')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLocalCampaigns([]);
      setCampaigns([]);
    } else {
      const mappedCampaigns = (data ?? []).map(mapCampaignRow);
      setLocalCampaigns(mappedCampaigns);
      setCampaigns(mappedCampaigns);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchCampaigns();
  }, []);

  const openNewCampaign = () => {
    setEditingId(null);
    setFormData(emptyCampaignForm);
    setFormOpen(true);
  };

  const openEditCampaign = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setFormData({
      title: campaign.title,
      type: campaign.type,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      description: campaign.description ?? '',
      tags: campaign.tags.join(', '),
      dealValue: campaign.dealValue ? String(campaign.dealValue) : '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormData(emptyCampaignForm);
  };

  const handleChange = (field: keyof CampaignForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      title: formData.title,
      type: formData.type,
      status: formData.status,
      start_date: formData.startDate,
      end_date: formData.endDate,
      description: formData.description,
      tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      deal_value: formData.dealValue ? Number(formData.dealValue) : null,
      kpis: [],
    } as any;

    const campaignClient = supabase.from('campaigns' as const) as any;

    if (editingId) {
      const { error: updateError } = await campaignClient
        .update(payload)
        .eq('id', editingId);

      if (updateError) {
        setError(updateError.message);
      } else {
        await fetchCampaigns();
        closeForm();
      }
    } else {
      const { error: insertError } = await campaignClient.insert(payload);
      if (insertError) {
        setError(insertError.message);
      } else {
        await fetchCampaigns();
        closeForm();
      }
    }

    setSaving(false);
  };

  const handleDelete = async (campaignId: string) => {
    if (!window.confirm('Delete this campaign?')) return;
    setLoading(true);
    setError(null);
    const campaignClient = supabase.from('campaigns' as const) as any;
    const { error: deleteError } = await campaignClient.delete().eq('id', campaignId);
    if (deleteError) {
      setError(deleteError.message);
    } else {
      await fetchCampaigns();
    }
    setLoading(false);
  };

  const campaignCount = campaigns.length;
  const campaignSummary = useMemo(
    () => campaigns.map((camp) => ({
      ...camp,
      total: camp.deliverables.length,
      done: camp.deliverables.filter((d) => d.status === 'approved' || d.status === 'posted').length,
    })),
    [campaigns]
  );

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-[#6B6B8A] text-sm mt-1">{campaignCount} campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-[#1E1E2A] rounded-lg overflow-hidden">
            <button onClick={() => setView('grid')} className={`p-2 transition-colors ${view === 'grid' ? 'bg-[#1E1E2A] text-[#E8FF47]' : 'text-[#6B6B8A] hover:text-[#F0F0F8]'}`}><LayoutGrid size={15} /></button>
            <button onClick={() => setView('list')} className={`p-2 transition-colors ${view === 'list' ? 'bg-[#1E1E2A] text-[#E8FF47]' : 'text-[#6B6B8A] hover:text-[#F0F0F8]'}`}><List size={15} /></button>
          </div>
          <button onClick={openNewCampaign} className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8FF47] text-black text-sm font-semibold rounded-lg hover:bg-[#d4eb3a] transition-colors">
            <Plus size={14} /> New Campaign
          </button>
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-rose-400">{error}</div> : null}
      {loading ? (
        <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A] p-8 text-center text-[#6B6B8A] flex items-center justify-center gap-3">
          <Loader2 className="animate-spin" size={18} /> Loading campaigns...
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-3 gap-4">
          {campaignSummary.map((camp) => {
            const pct = camp.total > 0 ? Math.round((camp.done / camp.total) * 100) : 0;
            return (
              <div key={camp.id} className="group relative rounded-xl border border-[#1E1E2A] bg-[#13131A] p-5 hover:border-[#E8FF47]/30 transition-all">
                <div className="absolute right-3 top-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditCampaign(camp)} className="rounded-full border border-[#1E1E2A] p-2 text-[#A7F0A1] hover:border-[#E8FF47]/50"><Edit3 size={14} /></button>
                  <button onClick={() => void handleDelete(camp.id)} className="rounded-full border border-[#1E1E2A] p-2 text-[#F57A7A] hover:border-[#F57A7A]/70"><Trash2 size={14} /></button>
                </div>
                <Link href={`/internal/campaigns/${camp.id}`} className="block">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[camp.status]}`}>{camp.status}</span>
                    <span className="text-xs text-[#6B6B8A]">{TYPE_LABELS[camp.type]}</span>
                  </div>
                  <h3 className="font-semibold text-sm leading-snug mb-1 group-hover:text-[#E8FF47] transition-colors">{camp.title}</h3>
                  <p className="text-xs text-[#6B6B8A] mb-4">{camp.clientNames.join(' × ')}</p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {camp.tags.slice(0,3).map((t) => (
                      <span key={t} className="text-[10px] bg-[#1E1E2A] text-[#6B6B8A] px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                  <div className="border-t border-[#1E1E2A] pt-3">
                    <div className="flex items-center justify-between text-xs text-[#6B6B8A] mb-1.5">
                      <span>Progress</span>
                      <span>{camp.done}/{camp.total} deliverables</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1E1E2A] rounded-full">
                      <div className="h-1.5 bg-[#E8FF47] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  {camp.dealValue ? (
                    <div className="mt-3 text-xs text-emerald-400 font-medium">{formatCurrency(camp.dealValue)}</div>
                  ) : null}
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1E1E2A] text-[#6B6B8A] text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Campaign</th>
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Dates</th>
                <th className="text-left px-5 py-3 font-medium">Deliverables</th>
                <th className="text-left px-5 py-3 font-medium">Value</th>
                <th className="text-left px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E2A]">
              {campaignSummary.map((camp) => (
                <tr key={camp.id} className="hover:bg-[#1a1a24] transition-colors group">
                  <td className="px-5 py-3">
                    <Link href={`/internal/campaigns/${camp.id}`} className="group-hover:text-[#E8FF47] font-medium text-sm transition-colors">{camp.title}</Link>
                    <div className="text-xs text-[#6B6B8A]">{camp.clientNames.join(' × ')}</div>
                  </td>
                  <td className="px-5 py-3 text-sm text-[#6B6B8A]">{TYPE_LABELS[camp.type]}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[camp.status]}`}>{camp.status}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-[#6B6B8A]">{formatDate(camp.startDate)} – {formatDate(camp.endDate)}</td>
                  <td className="px-5 py-3 text-sm">{camp.done}/{camp.total}</td>
                  <td className="px-5 py-3 text-sm text-emerald-400">{camp.dealValue ? formatCurrency(camp.dealValue) : '—'}</td>
                  <td className="px-5 py-3 text-sm text-[#6B6B8A] whitespace-nowrap flex flex-wrap gap-2">
                    <button onClick={() => openEditCampaign(camp)} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#1E1E2A] text-[#A7F0A1] hover:border-[#E8FF47]/50"><Edit3 size={12} /> Edit</button>
                    <button onClick={() => void handleDelete(camp.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#1E1E2A] text-[#F57A7A] hover:border-[#F57A7A]/70"><Trash2 size={12} /> Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-[#2D2D38] bg-[#0B0B11] p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-semibold">{editingId ? 'Edit Campaign' : 'New Campaign'}</h2>
                <p className="text-sm text-[#8C8CA7] mt-1">Save campaign details to Supabase.</p>
              </div>
              <button onClick={closeForm} className="rounded-full p-2 text-[#6B6B8A] hover:bg-white/5"><X size={18} /></button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Title
                <input value={formData.title} onChange={(e) => handleChange('title', e.target.value)} className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50" placeholder="Campaign title" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Type
                <select value={formData.type} onChange={(e) => handleChange('type', e.target.value)} className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50">
                  {TYPE_OPTIONS.map((type) => (<option key={type} value={type}>{TYPE_LABELS[type]}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Status
                <select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50">
                  {STATUS_OPTIONS.map((status) => (<option key={status} value={status}>{status.replace('_', ' ')}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Start Date
                <input type="date" value={formData.startDate} onChange={(e) => handleChange('startDate', e.target.value)} className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                End Date
                <input type="date" value={formData.endDate} onChange={(e) => handleChange('endDate', e.target.value)} className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Deal Value
                <input type="number" value={formData.dealValue} onChange={(e) => handleChange('dealValue', e.target.value)} className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50" placeholder="0" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47] md:col-span-2">
                Tags
                <input value={formData.tags} onChange={(e) => handleChange('tags', e.target.value)} className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50" placeholder="tag1, tag2" />
              </label>
            </div>

            <label className="mt-4 flex flex-col gap-2 text-sm text-[#E8FF47]">
              Description
              <textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} className="min-h-[120px] w-full rounded-xl border border-[#1E1E2A] bg-[#13131A] px-3 py-3 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50" placeholder="Add campaign description." />
            </label>

            <div className="mt-6 flex flex-wrap items-center gap-3 justify-end">
              <button type="button" onClick={closeForm} className="rounded-lg border border-[#1E1E2A] px-4 py-2 text-sm text-[#6B6B8A] hover:border-[#E8FF47]/50">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#E8FF47] px-4 py-2 text-sm font-semibold text-black hover:bg-[#d4eb3a] transition-colors disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {editingId ? 'Save Campaign' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
