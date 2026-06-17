'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { formatCurrency, STAGE_CONFIG } from '@/lib/utils';
import { Search, Users, Plus, Edit3, Trash2, X, Loader2 } from 'lucide-react';

type ContactRow = Database['public']['Tables']['contacts']['Row'];

type ContactForm = {
  id?: string;
  type: ContactRow['type'];
  name: string;
  sport: string;
  school: string;
  league: string;
  email: string;
  phone: string;
  stage: ContactRow['stage'];
  dealValue: string;
  tags: string;
  notes: string;
};

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type UserForm = {
  contactId: string;
  name: string;
  email: string;
  password: string;
  role: 'client_athlete' | 'client_brand';
};

const TYPE_LABELS = { athlete: 'Athlete', brand: 'Brand/Sponsor', partner: 'Partner' };
const TYPE_OPTIONS: ContactRow['type'][] = ['athlete', 'brand', 'partner'];
const STAGE_OPTIONS: ContactRow['stage'][] = ['lead', 'in_talks', 'contract', 'active', 'completed'];

const initialForm: ContactForm = {
  type: 'athlete',
  name: '',
  sport: '',
  school: '',
  league: '',
  email: '',
  phone: '',
  stage: 'lead',
  dealValue: '',
  tags: '',
  notes: '',
};

export default function CRMPage() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ContactRow['type']>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<ContactForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userForm, setUserForm] = useState<UserForm>({ contactId: '', name: '', email: '', password: '', role: 'client_athlete' });
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const supabase = createClient();

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

  const fetchProfiles = async () => {
    const profilesClient = supabase.from('profiles' as const) as any;
    const { data, error: fetchError } = await profilesClient
      .select('id, name, email, role, client_id')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setProfiles([]);
    } else {
      setProfiles(data ?? []);
    }
  };

  useEffect(() => {
    void fetchContacts();
    void fetchProfiles();
  }, []);

  const filtered = useMemo(() => {
    return contacts.filter(contact => {
      const query = search.toLowerCase();
      const matchesSearch =
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        contact.tags.some(tag => tag.toLowerCase().includes(query));
      const matchesType = typeFilter === 'all' || contact.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [contacts, search, typeFilter]);

  const clientUsersByContact = useMemo(
    () => new Map(profiles
      .filter((profile) => profile.role === 'client_athlete' || profile.role === 'client_brand')
      .map((profile) => [profile.client_id, profile])),
    [profiles]
  );

  const openNewContactForm = () => {
    setEditingId(null);
    setFormData(initialForm);
    setFormOpen(true);
  };

  const openEditContact = (contact: ContactRow) => {
    setEditingId(contact.id);
    setFormData({
      id: contact.id,
      type: contact.type,
      name: contact.name,
      sport: contact.sport ?? '',
      school: contact.school ?? '',
      league: contact.league ?? '',
      email: contact.email,
      phone: contact.phone ?? '',
      stage: contact.stage,
      dealValue: contact.deal_value ? String(contact.deal_value) : '',
      tags: contact.tags.join(', '),
      notes: contact.notes,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormData(initialForm);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const payload = {
      type: formData.type,
      name: formData.name,
      sport: formData.sport || null,
      school: formData.school || null,
      league: formData.league || null,
      email: formData.email,
      phone: formData.phone || null,
      social_handles: [],
      notes: formData.notes,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      stage: formData.stage,
      deal_value: formData.dealValue ? Number(formData.dealValue) : null,
    } as Database['public']['Tables']['contacts']['Update'];

    if (editingId) {
      const contactsClient = supabase.from('contacts' as const) as any;
      const { error: updateError } = await contactsClient
        .update(payload)
        .eq('id', editingId);

      if (updateError) {
        setError(updateError.message);
      } else {
        await fetchContacts();
        closeForm();
      }
    } else {
      const contactsClient = supabase.from('contacts' as const) as any;
      const { error: insertError } = await contactsClient
        .insert(payload as Database['public']['Tables']['contacts']['Insert']);

      if (insertError) {
        setError(insertError.message);
      } else {
        await fetchContacts();
        closeForm();
      }
    }

    setSaving(false);
  };

  const openClientUserForm = (contact: ContactRow) => {
    setUserError(null);
    setUserFormOpen(true);
    setUserForm({
      contactId: contact.id,
      name: contact.name,
      email: contact.email,
      password: '',
      role: contact.type === 'brand' ? 'client_brand' : 'client_athlete',
    });
  };

  const closeUserForm = () => {
    setUserFormOpen(false);
    setUserError(null);
    setUserForm({ contactId: '', name: '', email: '', password: '', role: 'client_athlete' });
  };

  const handleUserInput = (field: keyof UserForm, value: string) => {
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateClientUser = async () => {
    if (!userForm.contactId || !userForm.email || !userForm.password || !userForm.name) {
      setUserError('All fields are required to create a client user.');
      return;
    }

    setUserSaving(true);
    setUserError(null);

    const response = await fetch('/api/admin/client-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId: userForm.contactId,
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
      }),
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      setUserError(result.error ?? 'Unable to invite client user.');
      setUserSaving(false);
      return;
    }

    await fetchProfiles();
    setUserSaving(false);
    closeUserForm();
  };

  const handleDelete = async (contact: ContactRow) => {
    if (!window.confirm(`Delete ${contact.name}? This action cannot be undone.`)) return;
    setLoading(true);
    setError(null);

    const contactsClient = supabase.from('contacts' as const) as any;
    const { error: deleteError } = await contactsClient
      .delete()
      .eq('id', contact.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      await fetchContacts();
    }

    setLoading(false);
  };

  const handleInput = (field: keyof ContactForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <p className="text-[#6B6B8A] text-sm mt-1">{contacts.length} contacts · Athletes, Brands, Partners</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { openNewContactForm(); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8FF47] text-black text-sm font-semibold rounded-lg hover:bg-[#d4eb3a] transition-colors"
          >
            <Plus size={14} /> + Add Contact
          </button>
          <button
            onClick={() => { setUserError(null); setUserFormOpen(true); setUserForm({ contactId: '', name: '', email: '', password: '', role: 'client_athlete' }); }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#1E1E2A] text-[#E8FF47] text-sm font-semibold rounded-lg hover:border-[#E8FF47]/60 hover:bg-white/5 transition-colors"
          >
            <Users size={14} /> Invite Client User
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B8A]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts, tags..."
            className="w-full pl-9 pr-4 py-2 bg-[#13131A] border border-[#1E1E2A] rounded-lg text-sm focus:outline-none focus:border-[#E8FF47]/50 placeholder:text-[#6B6B8A]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', ...TYPE_OPTIONS] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${typeFilter === t ? 'bg-[#E8FF47]/10 text-[#E8FF47] border border-[#E8FF47]/30' : 'text-[#6B6B8A] border border-[#1E1E2A] hover:border-[#6B6B8A]'}`}
            >
              {t === 'all' ? 'All' : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-rose-400">{error}</div> : null}
      {loading ? (
        <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A] p-8 text-center text-[#6B6B8A] flex items-center justify-center gap-3">
          <Loader2 className="animate-spin" size={18} /> Loading contacts...
        </div>
      ) : (
        <div className="rounded-xl border border-[#1E1E2A] bg-[#13131A] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1E1E2A] text-[#6B6B8A] text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Contact</th>
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-5 py-3 font-medium">Sport / Category</th>
                <th className="text-left px-5 py-3 font-medium">Stage</th>
                <th className="text-left px-5 py-3 font-medium">Deal Value</th>
                <th className="text-left px-5 py-3 font-medium">Tags</th>
                <th className="text-left px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E2A]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[#6B6B8A]">No contacts match your filter.</td>
                </tr>
              ) : (
                filtered.map(contact => {
                  const stageCfg = STAGE_CONFIG[contact.stage];
                  return (
                    <tr key={contact.id} className="hover:bg-[#1a1a24] transition-colors group">
                      <td className="px-5 py-3">
                        <Link href={`/internal/crm/${contact.id}`} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#E8FF47]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[#E8FF47] text-xs font-bold">
                              {contact.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium group-hover:text-[#E8FF47] transition-colors">{contact.name}</div>
                            <div className="text-[#6B6B8A] text-xs">{contact.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-sm text-[#6B6B8A] capitalize">{TYPE_LABELS[contact.type]}</td>
                      <td className="px-5 py-3 text-sm text-[#6B6B8A]">{contact.sport || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${stageCfg.color}`}>{stageCfg.label}</span>
                      </td>
                      <td className="px-5 py-3 text-sm">{contact.deal_value ? formatCurrency(contact.deal_value) : '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.slice(0,3).map(tag => (
                            <span key={tag} className="text-[10px] bg-[#1E1E2A] text-[#6B6B8A] px-1.5 py-0.5 rounded">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-[#6B6B8A] whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditContact(contact)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#1E1E2A] text-[#A7F0A1] hover:border-[#E8FF47]/50"
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                          {clientUsersByContact.get(contact.id) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-[#1E1E2A] bg-[#0A0A0F] text-[#E8FF47] text-[10px]">
                              {clientUsersByContact.get(contact.id)?.role === 'client_brand' ? 'Brand user' : 'Athlete user'}
                            </span>
                          ) : contact.type !== 'partner' ? (
                            <button
                              type="button"
                              onClick={() => openClientUserForm(contact)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#1E1E2A] text-[#6B6B8A] hover:border-[#E8FF47]/50"
                            >
                              <Users size={12} /> Create client user
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void handleDelete(contact)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#1E1E2A] text-[#F57A7A] hover:border-[#F57A7A]/70"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-[#2D2D38] bg-[#0B0B11] p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-semibold">{editingId ? 'Edit Contact' : 'Add Contact'}</h2>
                <p className="text-sm text-[#8C8CA7] mt-1">Fill in the contact details and save to Supabase.</p>
              </div>
              <button onClick={closeForm} className="rounded-full p-2 text-[#6B6B8A] hover:bg-white/5">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Name
                <input
                  value={formData.name}
                  onChange={e => handleInput('name', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                  placeholder="Full name"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Email
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => handleInput('email', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                  placeholder="email@example.com"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Phone
                <input
                  value={formData.phone}
                  onChange={e => handleInput('phone', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                  placeholder="(555) 123-4567"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Type
                <select
                  value={formData.type}
                  onChange={e => handleInput('type', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                >
                  {TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>{TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Stage
                <select
                  value={formData.stage}
                  onChange={e => handleInput('stage', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                >
                  {STAGE_OPTIONS.map(stage => (
                    <option key={stage} value={stage}>{STAGE_CONFIG[stage].label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Deal Value
                <input
                  type="number"
                  value={formData.dealValue}
                  onChange={e => handleInput('dealValue', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                  placeholder="0"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Tags
                <input
                  value={formData.tags}
                  onChange={e => handleInput('tags', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                  placeholder="tag1, tag2"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Sport
                <input
                  value={formData.sport}
                  onChange={e => handleInput('sport', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                  placeholder="e.g. Basketball"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                School
                <input
                  value={formData.school}
                  onChange={e => handleInput('school', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                  placeholder="e.g. Ohio State"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                League
                <input
                  value={formData.league}
                  onChange={e => handleInput('league', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                  placeholder="e.g. Big Ten"
                />
              </label>
            </div>

            <label className="mt-4 flex flex-col gap-2 text-sm text-[#E8FF47]">
              Notes
              <textarea
                value={formData.notes}
                onChange={e => handleInput('notes', e.target.value)}
                className="min-h-[120px] w-full rounded-xl border border-[#1E1E2A] bg-[#13131A] px-3 py-3 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                placeholder="Add any relevant notes or contact details..."
              />
            </label>

            <div className="mt-6 flex flex-wrap items-center gap-3 justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-[#1E1E2A] px-4 py-2 text-sm text-[#6B6B8A] hover:border-[#E8FF47]/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#E8FF47] px-4 py-2 text-sm font-semibold text-black hover:bg-[#d4eb3a] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {editingId ? 'Save Changes' : 'Create Contact'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {userFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[#2D2D38] bg-[#0B0B11] p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-semibold">Invite Client User</h2>
                <p className="text-sm text-[#8C8CA7] mt-1">Link this portal user to a contact record so they only see their own campaigns.</p>
              </div>
              <button onClick={closeUserForm} className="rounded-full p-2 text-[#6B6B8A] hover:bg-white/5">
                <X size={18} />
              </button>
            </div>

            {userError ? <div className="mb-4 rounded-lg border border-rose-600 bg-rose-900/20 px-4 py-3 text-sm text-rose-300">{userError}</div> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Contact
                <select
                  value={userForm.contactId}
                  onChange={e => handleUserInput('contactId', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                >
                  <option value="">Select a contact</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>{contact.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Role
                <select
                  value={userForm.role}
                  onChange={e => handleUserInput('role', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                >
                  <option value="client_athlete">Client Athlete</option>
                  <option value="client_brand">Client Brand</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Name
                <input
                  value={userForm.name}
                  onChange={e => handleUserInput('name', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                  placeholder="Client user name"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47]">
                Email
                <input
                  type="email"
                  value={userForm.email}
                  onChange={e => handleUserInput('email', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                  placeholder="user@example.com"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-[#E8FF47] md:col-span-2">
                Password
                <input
                  type="password"
                  value={userForm.password}
                  onChange={e => handleUserInput('password', e.target.value)}
                  className="w-full rounded-lg border border-[#1E1E2A] bg-[#13131A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E8FF47]/50"
                  placeholder="Temporary password"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 justify-end">
              <button
                type="button"
                onClick={closeUserForm}
                className="rounded-lg border border-[#1E1E2A] px-4 py-2 text-sm text-[#6B6B8A] hover:border-[#E8FF47]/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateClientUser}
                disabled={userSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#E8FF47] px-4 py-2 text-sm font-semibold text-black hover:bg-[#d4eb3a] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {userSaving ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                Invite User
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
