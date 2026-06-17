-- =============================================================================
-- 2 Bits Creative — Full Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";


-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
create type user_role         as enum ('admin', 'internal', 'client_athlete', 'client_brand');
create type contact_type      as enum ('athlete', 'brand', 'partner');
create type pipeline_stage    as enum ('lead', 'in_talks', 'contract', 'active', 'completed');
create type campaign_type     as enum ('nil_deal', 'game_day', 'sponsorship', 'season_retainer', 'brand_activation');
create type campaign_status   as enum ('planning', 'active', 'in_review', 'completed');
create type deliverable_type  as enum ('video', 'graphic', 'copy', 'photo');
create type deliverable_status as enum ('todo', 'in_progress', 'in_review', 'approved', 'posted');
create type activity_type     as enum ('call', 'email', 'meeting', 'note');


-- ---------------------------------------------------------------------------
-- 2. Profiles  (one row per auth.users row)
-- ---------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null,
  role        user_role not null default 'internal',
  -- For client roles: points to the contact record that represents them.
  client_id   uuid,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile stub when a new auth user is confirmed.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'internal')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ---------------------------------------------------------------------------
-- 3. Contacts  (athletes, brands, partners)
-- ---------------------------------------------------------------------------
create table contacts (
  id              uuid primary key default uuid_generate_v4(),
  type            contact_type not null,
  name            text not null,
  sport           text,
  school          text,
  league          text,
  email           text not null,
  phone           text,
  -- [{ platform: string, handle: string }]
  social_handles  jsonb not null default '[]',
  notes           text not null default '',
  tags            text[] not null default '{}',
  stage           pipeline_stage not null default 'lead',
  deal_value      numeric(12, 2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Keep updated_at current automatically.
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function touch_updated_at();

-- Add the FK from profiles.client_id now that contacts exists.
alter table profiles
  add constraint profiles_client_id_fkey
  foreign key (client_id) references contacts (id) on delete set null;


-- ---------------------------------------------------------------------------
-- 4. Deals  (deal history per contact)
-- ---------------------------------------------------------------------------
create table deals (
  id          uuid primary key default uuid_generate_v4(),
  contact_id  uuid not null references contacts (id) on delete cascade,
  title       text not null,
  value       numeric(12, 2) not null default 0,
  stage       pipeline_stage not null default 'lead',
  start_date  date not null,
  end_date    date,
  notes       text,
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 5. Activity logs  (calls, emails, meetings, notes per contact)
-- ---------------------------------------------------------------------------
create table activity_logs (
  id          uuid primary key default uuid_generate_v4(),
  contact_id  uuid not null references contacts (id) on delete cascade,
  type        activity_type not null,
  summary     text not null,
  date        timestamptz not null default now(),
  user_id     uuid not null references profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 6. Campaigns
-- ---------------------------------------------------------------------------
create table campaigns (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  type        campaign_type not null,
  status      campaign_status not null default 'planning',
  start_date  date not null,
  end_date    date not null,
  description text,
  tags        text[] not null default '{}',
  deal_value  numeric(12, 2),
  -- [{ label, value, unit?, trend? }]
  kpis        jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

-- Junction: which contacts are part of each campaign.
create table campaign_contacts (
  campaign_id  uuid not null references campaigns (id) on delete cascade,
  contact_id   uuid not null references contacts (id) on delete cascade,
  primary key (campaign_id, contact_id)
);


-- ---------------------------------------------------------------------------
-- 7. Deliverables
-- ---------------------------------------------------------------------------
create table deliverables (
  id             uuid primary key default uuid_generate_v4(),
  campaign_id    uuid not null references campaigns (id) on delete cascade,
  title          text not null,
  type           deliverable_type not null,
  status         deliverable_status not null default 'todo',
  assignee_id    uuid references profiles (id) on delete set null,
  due_date       date not null,
  file_url       text,
  thumbnail_url  text,
  created_at     timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 8. Comments  (timestamped for video, pinned for image)
-- ---------------------------------------------------------------------------
create table comments (
  id                uuid primary key default uuid_generate_v4(),
  deliverable_id    uuid not null references deliverables (id) on delete cascade,
  user_id           uuid not null references profiles (id) on delete cascade,
  body              text not null,
  resolved          boolean not null default false,
  -- Video: seconds from start
  timestamp_seconds numeric(10, 3),
  -- Image: percentage coords (0–100)
  pin_x             numeric(6, 3),
  pin_y             numeric(6, 3),
  created_at        timestamptz not null default now()
);

create table comment_replies (
  id          uuid primary key default uuid_generate_v4(),
  comment_id  uuid not null references comments (id) on delete cascade,
  user_id     uuid not null references profiles (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 9. Indexes
-- ---------------------------------------------------------------------------
create index on contacts (stage);
create index on contacts (type);
create index on deals (contact_id);
create index on activity_logs (contact_id);
create index on activity_logs (date desc);
create index on campaigns (status);
create index on campaign_contacts (contact_id);
create index on deliverables (campaign_id);
create index on deliverables (status);
create index on deliverables (assignee_id);
create index on comments (deliverable_id);
create index on comments (user_id);
create index on comment_replies (comment_id);


-- ---------------------------------------------------------------------------
-- 10. Row-Level Security
-- ---------------------------------------------------------------------------
alter table profiles         enable row level security;
alter table contacts         enable row level security;
alter table deals            enable row level security;
alter table activity_logs    enable row level security;
alter table campaigns        enable row level security;
alter table campaign_contacts enable row level security;
alter table deliverables     enable row level security;
alter table comments         enable row level security;
alter table comment_replies  enable row level security;

-- Helper: get the role of the currently authenticated user.
create or replace function my_role()
returns user_role language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

-- Helper: get the client_id of the currently authenticated user.
create or replace function my_client_id()
returns uuid language sql security definer stable as $$
  select client_id from profiles where id = auth.uid()
$$;

-- ---- profiles ----
-- Users can read their own profile; admin/internal can read all.
create policy "profiles: read own" on profiles
  for select using (id = auth.uid());

create policy "profiles: internal read all" on profiles
  for select using (my_role() in ('admin', 'internal'));

create policy "profiles: update own" on profiles
  for update using (id = auth.uid());

create policy "profiles: admin full" on profiles
  for all using (my_role() = 'admin');

-- ---- contacts ----
create policy "contacts: internal full" on contacts
  for all using (my_role() in ('admin', 'internal'));

-- Clients can read the contact record that represents them.
create policy "contacts: client read self" on contacts
  for select using (id = my_client_id());

-- ---- deals ----
create policy "deals: internal full" on deals
  for all using (my_role() in ('admin', 'internal'));

create policy "deals: client read own" on deals
  for select using (contact_id = my_client_id());

-- ---- activity_logs ----
create policy "activity_logs: internal full" on activity_logs
  for all using (my_role() in ('admin', 'internal'));

-- ---- campaigns ----
create policy "campaigns: internal full" on campaigns
  for all using (my_role() in ('admin', 'internal'));

-- Clients can read campaigns they are a contact of.
create policy "campaigns: client read own" on campaigns
  for select using (
    exists (
      select 1 from campaign_contacts cc
      where cc.campaign_id = id
        and cc.contact_id = my_client_id()
    )
  );

-- ---- campaign_contacts ----
create policy "campaign_contacts: internal full" on campaign_contacts
  for all using (my_role() in ('admin', 'internal'));

create policy "campaign_contacts: client read own" on campaign_contacts
  for select using (contact_id = my_client_id());

-- ---- deliverables ----
create policy "deliverables: internal full" on deliverables
  for all using (my_role() in ('admin', 'internal'));

create policy "deliverables: client read own campaign" on deliverables
  for select using (
    exists (
      select 1 from campaign_contacts cc
      where cc.campaign_id = campaign_id
        and cc.contact_id = my_client_id()
    )
  );

-- ---- comments ----
create policy "comments: internal full" on comments
  for all using (my_role() in ('admin', 'internal'));

-- Clients can read + insert comments on their deliverables.
create policy "comments: client read own deliverable" on comments
  for select using (
    exists (
      select 1
      from deliverables d
      join campaign_contacts cc on cc.campaign_id = d.campaign_id
      where d.id = deliverable_id
        and cc.contact_id = my_client_id()
    )
  );

create policy "comments: client insert own deliverable" on comments
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1
      from deliverables d
      join campaign_contacts cc on cc.campaign_id = d.campaign_id
      where d.id = deliverable_id
        and cc.contact_id = my_client_id()
    )
  );

-- Clients can resolve their own comments.
create policy "comments: client update own" on comments
  for update using (user_id = auth.uid());

-- ---- comment_replies ----
create policy "comment_replies: internal full" on comment_replies
  for all using (my_role() in ('admin', 'internal'));

create policy "comment_replies: client read own" on comment_replies
  for select using (
    exists (
      select 1
      from comments c
      join deliverables d on d.id = c.deliverable_id
      join campaign_contacts cc on cc.campaign_id = d.campaign_id
      where c.id = comment_id
        and cc.contact_id = my_client_id()
    )
  );

create policy "comment_replies: client insert own" on comment_replies
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1
      from comments c
      join deliverables d on d.id = c.deliverable_id
      join campaign_contacts cc on cc.campaign_id = d.campaign_id
      where c.id = comment_id
        and cc.contact_id = my_client_id()
    )
  );
