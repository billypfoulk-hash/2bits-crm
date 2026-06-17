-- =============================================================================
-- 2 Bits Creative — Seed Data
-- Run AFTER schema.sql. Creates the same contacts/campaigns as mock-data.ts.
-- Profiles are created via auth (sign-up), not here — see README instructions.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------
insert into contacts (id, type, name, sport, school, league, email, phone, social_handles, notes, tags, stage, deal_value) values
(
  'c1000000-0000-0000-0000-000000000001',
  'athlete', 'Darius Cole', 'Basketball', 'University of Texas', 'NCAA',
  'darius@athlete.com', '512-555-0101',
  '[{"platform":"Instagram","handle":"@dcole_hoops"},{"platform":"TikTok","handle":"@dariuscole"},{"platform":"Twitter","handle":"@DCole_UT"}]',
  'Top-ranked PG. 280k IG followers. Very engaged audience, brand-safe. Game day content performs best.',
  '{"basketball","nil","high-value","ncaa"}', 'active', 25000
),
(
  'c2000000-0000-0000-0000-000000000002',
  'athlete', 'Mia Torres', 'Soccer', 'UCLA', 'NCAA / NWSL',
  'mia@athlete.com', '310-555-0202',
  '[{"platform":"Instagram","handle":"@mia_torres10"},{"platform":"TikTok","handle":"@miatorreskicks"}]',
  'Rising star. Strong female athlete brand. Best for lifestyle + apparel content.',
  '{"soccer","nil","lifestyle","womens-sports"}', 'in_talks', 30000
),
(
  'c3000000-0000-0000-0000-000000000003',
  'athlete', 'Khalil James', 'Football', 'Ohio State', 'NCAA',
  'khalil@athlete.com', '614-555-0303',
  '[{"platform":"Instagram","handle":"@kjames_osu"},{"platform":"Twitter","handle":"@KhalilJames_OSU"}]',
  'Incoming freshman. Projected starter. Early outreach — great pipeline candidate.',
  '{"football","prospect","high-value","ncaa"}', 'lead', null
),
(
  'c4000000-0000-0000-0000-000000000004',
  'brand', 'Summit Energy', null, null, null,
  'marketing@summitenergy.com', '737-555-0404',
  '[{"platform":"Instagram","handle":"@summitenergy"}]',
  'Energy drink brand. Target demo: 18-24 male athletes. Approves fast, good communicator.',
  '{"beverage","energy","sponsor","nil"}', 'active', 25000
),
(
  'c5000000-0000-0000-0000-000000000005',
  'brand', 'GatorSport Nutrition', null, null, null,
  'partnerships@gatorsport.com', '407-555-0505',
  '[]',
  'Sports nutrition. Deal in negotiation. Responsive contact: Dana Li.',
  '{"nutrition","supplement","womens-sports"}', 'in_talks', 12000
);

-- ---------------------------------------------------------------------------
-- Deals
-- ---------------------------------------------------------------------------
insert into deals (id, contact_id, title, value, stage, start_date, end_date) values
('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Summit Energy NIL Deal',       25000, 'active',    '2026-01-01', '2026-12-31'),
('d2000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002', 'Nike Apparel Campaign',        18000, 'completed', '2025-08-01', '2026-01-31'),
('d3000000-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000002', 'GatorSport Q2 Activation',     12000, 'in_talks',  '2026-06-01', null),
('d4000000-0000-0000-0000-000000000004', 'c4000000-0000-0000-0000-000000000004', 'Darius Cole NIL Activation',   25000, 'active',    '2026-01-01', '2026-12-31'),
('d5000000-0000-0000-0000-000000000005', 'c5000000-0000-0000-0000-000000000005', 'Mia Torres Q2 Sponsorship',    12000, 'in_talks',  '2026-06-01', null);

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------
insert into campaigns (id, title, type, status, start_date, end_date, description, tags, deal_value, kpis) values
(
  'ca100000-0000-0000-0000-000000000001',
  'Summit Energy x Darius Cole — Season Campaign',
  'nil_deal', 'active', '2026-01-01', '2026-12-31',
  'Full-year NIL partnership. Game-day content, product integrations, and social amplification across IG + TikTok.',
  '{"basketball","nil","season-long"}', 25000,
  '[{"label":"Total Reach","value":"2.4M","trend":"up"},{"label":"Avg Engagement Rate","value":"6.2%","trend":"up"},{"label":"Deliverables Completed","value":"8/12","trend":"flat"},{"label":"Timeline Adherence","value":"92%","trend":"up"}]'
),
(
  'ca200000-0000-0000-0000-000000000002',
  'Mia Torres — Nike Game Day Series',
  'game_day', 'completed', '2025-08-01', '2026-01-31',
  null, '{"soccer","nike","game-day"}', 18000,
  '[{"label":"Total Reach","value":"1.1M","trend":"up"},{"label":"Avg Engagement Rate","value":"8.1%","trend":"up"},{"label":"Deliverables Completed","value":"6/6","trend":"up"},{"label":"Timeline Adherence","value":"100%","trend":"up"}]'
),
(
  'ca300000-0000-0000-0000-000000000003',
  'GatorSport x Mia Torres — Q3 Activation',
  'sponsorship', 'planning', '2026-07-01', '2026-09-30',
  null, '{"soccer","nutrition","q3"}', 12000, '[]'
);

-- Campaign ↔ Contact links
insert into campaign_contacts (campaign_id, contact_id) values
('ca100000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001'),
('ca100000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000004'),
('ca200000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002'),
('ca300000-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000002'),
('ca300000-0000-0000-0000-000000000003', 'c5000000-0000-0000-0000-000000000005');

-- ---------------------------------------------------------------------------
-- Deliverables
-- ---------------------------------------------------------------------------
insert into deliverables (id, campaign_id, title, type, status, due_date, file_url, thumbnail_url) values
(
  'de100000-0000-0000-0000-000000000001',
  'ca100000-0000-0000-0000-000000000001',
  'Game Night IG Reel — March', 'video', 'in_review', '2026-06-20',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400'
),
(
  'de200000-0000-0000-0000-000000000002',
  'ca100000-0000-0000-0000-000000000001',
  'Summit x Darius — Brand Kit Static', 'graphic', 'in_review', '2026-06-22',
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=800',
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400'
),
(
  'de300000-0000-0000-0000-000000000003',
  'ca100000-0000-0000-0000-000000000001',
  'Pre-Game Story Series (x3)', 'graphic', 'approved', '2026-06-10',
  null,
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400'
),
(
  'de400000-0000-0000-0000-000000000004',
  'ca100000-0000-0000-0000-000000000001',
  'TikTok Integration — Product Sip Scene', 'video', 'todo', '2026-07-05',
  null, null
),
(
  'de500000-0000-0000-0000-000000000005',
  'ca300000-0000-0000-0000-000000000003',
  'Campaign Brief Deck', 'graphic', 'in_progress', '2026-06-25',
  null, null
);

-- ---------------------------------------------------------------------------
-- NOTE: Comments reference user_id (profiles.id) which are auth UUIDs
-- created at sign-up time. To seed comments, run the app, create your users,
-- then insert comments referencing those UUIDs. A helper script is at:
--   supabase/seed-comments.sql.example
-- ---------------------------------------------------------------------------
