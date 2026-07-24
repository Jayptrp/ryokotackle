-- Site-wide SEO / business settings, moved out of code (src/lib/seo.ts) into the
-- database so a non-technical admin can edit them without a developer or a deploy.
--
-- IMPORTANT (see docs/seo-panel.md): this table is the SOURCE OF TRUTH once seeded.
-- The seed below is INSERT ... ON CONFLICT DO NOTHING so it only fills an empty
-- row — it must NEVER overwrite admin edits, and a rebuild/redeploy never re-runs
-- an already-applied migration. Editing the seo.ts constants does NOT change the
-- live site; they are only fallback defaults used when a field here is null.
--
-- RLS: world-readable (values end up in public HTML anyway); admin-only writes.

-- ─────────────────────────────────────────────────────────── site_settings ──
create table if not exists public.site_settings (
  id                     smallint primary key default 1,

  -- Global metadata (home / default title + description + keywords)
  site_name              text,
  site_title             text,
  site_description       text,
  site_keywords          text[]  not null default '{}',
  og_image_url           text,

  -- Company NAP (name / address / phone) — also feeds footer + JSON-LD
  company_legal_name     text,
  company_legal_name_th  text,
  company_slogan         text,
  company_email          text,
  company_phone          text,
  company_mobile         text,
  company_fax            text,
  address_street         text,
  address_locality       text,
  address_region         text,
  address_postal_code    text,
  address_country        text,
  line_id                text,

  -- Socials: [{ "platform": "facebook", "url": "https://..." }, ...]
  socials                jsonb   not null default '[]'::jsonb,
  -- Footer quick links: [{ "label": "สินค้าทั้งหมด", "href": "/products" }, ...]
  footer_links           jsonb   not null default '[]'::jsonb,

  -- Analytics / verification (safe "paste an id" fields)
  ga4_id                 text,   -- e.g. G-XXXXXXXXXX
  gtm_id                 text,   -- e.g. GTM-XXXXXXX
  gsc_verification       text,   -- google-site-verification content value

  -- Advanced: raw code injected into <head> / end of <body>. Admin-only, powered
  -- client-side so pasted <script> snippets actually execute (see CustomCode).
  custom_head_html       text,
  custom_body_html       text,

  -- AI answer-engine crawler policy (robots.txt). Default allow — the catalog
  -- WANTS to appear in ChatGPT / Perplexity / Gemini / Google AI answers.
  allow_gptbot           boolean not null default true,  -- OpenAI ChatGPT
  allow_claudebot        boolean not null default true,  -- Anthropic Claude
  allow_perplexitybot    boolean not null default true,  -- Perplexity
  allow_google_extended  boolean not null default true,  -- Google Gemini/Vertex

  updated_at             timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "site_settings_read" on public.site_settings
  for select using (true);
create policy "site_settings_admin_write" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed the singleton with the values currently hard-coded in src/lib/seo.ts, so
-- behaviour is unchanged until an admin edits something. Idempotent.
insert into public.site_settings (
  id, site_name, site_title, site_description, site_keywords, og_image_url,
  company_legal_name, company_legal_name_th, company_slogan,
  company_email, company_phone, company_mobile, company_fax,
  address_street, address_locality, address_region, address_postal_code, address_country,
  line_id, socials, footer_links
) values (
  1,
  'Ryoko Tackle',
  'Ryoko Tackle | อุปกรณ์ตกปลา คันเบ็ด รอก เหยื่อ',
  'ร้านอุปกรณ์ตกปลา Ryoko Tackle จำหน่ายคันเบ็ด รอก เหยื่อปลอม สายเอ็น PE และอุปกรณ์ตกปลาคุณภาพสูงครบวงจร',
  array[
    'อุปกรณ์ตกปลา','คันเบ็ดตกปลา','รอกตกปลา','เหยื่อปลอม','เหยื่อจิ๊ก','คันจิ๊ก',
    'สายเอ็น PE','เบ็ดตกปลา','กล่องอุปกรณ์ตกปลา','ร้านอุปกรณ์ตกปลา','คันเบ็ด ryoko',
    'รอก kaido','RYOKO','Ballista','Sakura','Kaido','G-Luck','Akari'
  ]::text[],
  '/og-default.png',
  'T.R.Y. Fishing Tackle Co., Ltd.',
  'บริษัท ที.อาร์.วาย.ฟิชชิ่ง แทคเคิล จำกัด',
  'คิดถึงอุปกรณ์ตกปลา คิดถึง Ryoko Tackle',
  'info@trytackle.com',
  '+66-2-183-7857',
  '+66-95-951-4519',
  '+66-2-183-7859',
  '289/11 Moo 13, Soi Kingkeaw 25/1',
  'Rachathewa, Bang Phli',
  'Samut Prakan',
  '10540',
  'TH',
  '@ryokothailand',
  $json$[
    {"platform":"facebook","url":"https://www.facebook.com/ryoko.tackle"},
    {"platform":"tiktok","url":"https://www.tiktok.com/@ryoko.tackle"},
    {"platform":"youtube","url":"https://www.youtube.com/@ryoko.tackle"},
    {"platform":"instagram","url":"https://www.instagram.com/ryoko.tackle"}
  ]$json$::jsonb,
  $json$[
    {"label":"สินค้าทั้งหมด","href":"/products"},
    {"label":"ติดต่อเรา","href":"/contact"},
    {"label":"ประกันและอะไหล่","href":"/warranty"}
  ]$json$::jsonb
)
on conflict (id) do nothing;

-- ───────────────────────────────────── per-page meta overrides (optional) ──
-- Blank/null = keep today's smart auto-derived value; set = manual control.
alter table public.products   add column if not exists meta_title       text;
alter table public.products   add column if not exists meta_description  text;
alter table public.categories add column if not exists meta_title       text;
alter table public.categories add column if not exists meta_description  text;

-- Meta overrides for the fixed (non-catalog) routes. Seeded with a Thai label so
-- the settings UI can list them; values start null (auto-derived until edited).
create table if not exists public.page_seo (
  path             text primary key,
  label            text not null,
  meta_title       text,
  meta_description text,
  updated_at       timestamptz not null default now()
);

drop trigger if exists page_seo_set_updated_at on public.page_seo;
create trigger page_seo_set_updated_at
  before update on public.page_seo
  for each row execute function public.set_updated_at();

alter table public.page_seo enable row level security;

create policy "page_seo_read" on public.page_seo
  for select using (true);
create policy "page_seo_admin_write" on public.page_seo
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.page_seo (path, label) values
  ('/',         'หน้าแรก'),
  ('/products', 'สินค้าทั้งหมด'),
  ('/about',    'เกี่ยวกับเรา'),
  ('/contact',  'ติดต่อเรา'),
  ('/warranty', 'ประกันและอะไหล่')
on conflict (path) do nothing;
