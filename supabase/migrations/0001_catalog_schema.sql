-- Ryoko Tackle — normalized catalog schema
-- Catalog model (no prices/cart). Brands as filterable attribute, hierarchical
-- categories, admin-authored content (summary + Tiptap rich description), unified
-- image/video carousel, marketplace channel links. RLS: public reads published rows,
-- admins write.

-- 0. Drop the disposable mock products table from earlier prototyping.
drop table if exists public.products cascade;

-- 1. Enums
do $$ begin
  create type public.product_status as enum ('published', 'hidden', 'draft');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_type as enum ('image', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_provider as enum ('upload', 'youtube', 'facebook', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sales_channel as enum
    ('shopee', 'lazada', 'tiktok', 'facebook', 'line', 'website', 'other');
exception when duplicate_object then null; end $$;

-- 2. Helper: updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- 3. Admin membership + is_admin() helper
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- 4. Brands
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- 5. Categories (self-referencing hierarchy)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  name_th text,
  parent_id uuid references public.categories(id) on delete set null,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists categories_parent_idx on public.categories(parent_id);

-- 6. Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  name_th text,
  summary text,
  description text,
  brand_id uuid references public.brands(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  status public.product_status not null default 'published',
  is_featured boolean not null default false,
  legacy_category text,
  search tsvector generated always as (
    to_tsvector('simple',
      coalesce(name, '') || ' ' || coalesce(name_th, '') || ' ' || coalesce(summary, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_brand_idx on public.products(brand_id);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_status_idx on public.products(status);
create index if not exists products_search_idx on public.products using gin(search);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- 7. Product media (unified image/video carousel)
create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  type public.media_type not null default 'image',
  provider public.media_provider,
  url text not null,
  alt text,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists product_media_product_idx
  on public.product_media(product_id, sort_order);

-- 8. Product marketplace channels
create table if not exists public.product_channels (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  channel public.sales_channel not null,
  url text not null,
  sort_order int not null default 0,
  unique (product_id, channel)
);
create index if not exists product_channels_product_idx
  on public.product_channels(product_id);

-- 9. Row Level Security
alter table public.brands           enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_media    enable row level security;
alter table public.product_channels enable row level security;
alter table public.admin_users      enable row level security;

-- Lookups: world-readable
create policy "brands_read"     on public.brands     for select using (true);
create policy "categories_read" on public.categories for select using (true);

-- Products: published visible to everyone, all statuses visible to admins
create policy "products_read" on public.products for select
  using (status = 'published' or public.is_admin());

-- Child tables visible when the parent product is visible
create policy "product_media_read" on public.product_media for select
  using (exists (
    select 1 from public.products p
    where p.id = product_id and (p.status = 'published' or public.is_admin())
  ));
create policy "product_channels_read" on public.product_channels for select
  using (exists (
    select 1 from public.products p
    where p.id = product_id and (p.status = 'published' or public.is_admin())
  ));

-- Writes: admins only (service role bypasses RLS for the import script)
create policy "brands_admin_write"     on public.brands     for all
  using (public.is_admin()) with check (public.is_admin());
create policy "categories_admin_write" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());
create policy "products_admin_write"   on public.products   for all
  using (public.is_admin()) with check (public.is_admin());
create policy "product_media_admin_write" on public.product_media for all
  using (public.is_admin()) with check (public.is_admin());
create policy "product_channels_admin_write" on public.product_channels for all
  using (public.is_admin()) with check (public.is_admin());
create policy "admin_users_read" on public.admin_users for select
  using (public.is_admin());

-- 10. Storage bucket for admin-uploaded media (carousel + inline content images)
insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

drop policy if exists "product_media_public_read" on storage.objects;
create policy "product_media_public_read" on storage.objects for select
  using (bucket_id = 'product-media');

drop policy if exists "product_media_admin_write" on storage.objects;
create policy "product_media_admin_write" on storage.objects for all
  using (bucket_id = 'product-media' and public.is_admin())
  with check (bucket_id = 'product-media' and public.is_admin());

-- 11. Seed canonical category taxonomy
insert into public.categories (slug, name, name_th, icon, sort_order) values
  ('reels',         'Reels',            'รอก',            'rebase_edit', 10),
  ('rods',          'Rods',             'คันเบ็ด',         'phishing',    20),
  ('lines',         'Lines & Leaders',  'สายเอ็น',         'cable',       30),
  ('lures-jigs',    'Lures & Jigs',     'เหยื่อปลอม',      'pets',        40),
  ('hooks-rigging', 'Hooks & Rigging',  'ตาเบ็ด',          'anchor',      50),
  ('tackle-boxes',  'Tackle Boxes & Bags', 'กล่อง/กระเป๋า', 'backpack',  60),
  ('accessories',   'Accessories & Gear',  'อุปกรณ์เสริม',  'build',      70),
  ('apparel',       'Apparel',          'เครื่องแต่งกาย',  'checkroom',   80),
  ('parts',         'Parts & Components',  'อะไหล่',        'settings',   90)
on conflict (slug) do nothing;

-- Subcategories
insert into public.categories (slug, name, name_th, parent_id, sort_order)
select v.slug, v.name, v.name_th,
       (select id from public.categories where slug = v.parent), v.sort_order
from (values
  ('rods-lure-casting',  'Lure Casting Rods', 'คันตีเหยื่อปลอม', 'rods', 21),
  ('rods-jigging-popping','Jigging & Popping Rods', 'คันจิ๊ก/ป๊อป', 'rods', 22),
  ('rods-big-game',      'Big Game Rods',     'คันปลาบึก',       'rods', 23),
  ('rods-surf',          'Surf & Shore Rods', 'คันชายฝั่ง',      'rods', 24),
  ('rods-electric-reel', 'Electric Reel Rods','คันใส่รอกไฟฟ้า',  'rods', 25),
  ('rods-other',         'Other Rods',        'คันอื่นๆ',        'rods', 26),
  ('lines-pe-braid',     'PE Braid',          'สาย PE',          'lines', 31),
  ('lines-fluoro-nylon', 'Fluorocarbon & Nylon', 'ฟลูออโร/ไนลอน', 'lines', 32)
) as v(slug, name, name_th, parent, sort_order)
on conflict (slug) do nothing;
