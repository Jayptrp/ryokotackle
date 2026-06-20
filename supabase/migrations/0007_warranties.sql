-- Ryoko Tackle — product warranties (การรับประกันและการเคลมสินค้า)
-- Adds:
--   1. warranties        — the warranty types; each doubles as a product tag and
--                          carries the detail text shown on the public warranty page.
--   2. product_warranties — M:N join between products and warranty types (a product
--                          may have 0..n warranty tags).
--   3. warranty_page      — singleton row holding the public page's title + subtitle.
-- RLS mirrors the homepage tables (0003): world-readable, admin-only write.

-- 1. Warranty types
create table if not exists public.warranties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  detail text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists warranties_sort_idx on public.warranties(sort_order);

drop trigger if exists warranties_set_updated_at on public.warranties;
create trigger warranties_set_updated_at
  before update on public.warranties
  for each row execute function public.set_updated_at();

alter table public.warranties enable row level security;
create policy "warranties_read" on public.warranties for select using (true);
create policy "warranties_admin_write" on public.warranties for all
  using (public.is_admin()) with check (public.is_admin());

-- Seed the 4 current warranty types (idempotent). Detail is a visible placeholder
-- the admin replaces from the warranty admin page.
insert into public.warranties (name, detail, sort_order)
select v.name, v.detail, v.sort_order
from (values
  ('ไม่มีประกัน / ไม่มีอะไหล่',        'detail for ไม่มีประกัน / ไม่มีอะไหล่', 10),
  ('ไม่มีประกัน / มีอะไหล่',           'detail for ไม่มีประกัน / มีอะไหล่', 20),
  ('ประกัน 60 40',                     'detail for ประกัน 60 40', 30),
  ('ประกันค่าแรงฟรี / มีอะไหล่',       'detail for ประกันค่าแรงฟรี / มีอะไหล่', 40)
) as v(name, detail, sort_order)
where not exists (select 1 from public.warranties);

-- 2. Product ↔ warranty join
create table if not exists public.product_warranties (
  product_id uuid not null references public.products(id) on delete cascade,
  warranty_id uuid not null references public.warranties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, warranty_id)
);
create index if not exists product_warranties_warranty_idx
  on public.product_warranties(warranty_id);

alter table public.product_warranties enable row level security;
create policy "product_warranties_read" on public.product_warranties for select
  using (true);
create policy "product_warranties_admin_write" on public.product_warranties for all
  using (public.is_admin()) with check (public.is_admin());

-- 3. Singleton page heading (title + subtitle)
create table if not exists public.warranty_page (
  id int primary key default 1 check (id = 1),
  title text,
  subtitle text,
  updated_at timestamptz not null default now()
);

drop trigger if exists warranty_page_set_updated_at on public.warranty_page;
create trigger warranty_page_set_updated_at
  before update on public.warranty_page
  for each row execute function public.set_updated_at();

alter table public.warranty_page enable row level security;
create policy "warranty_page_read" on public.warranty_page for select using (true);
create policy "warranty_page_admin_write" on public.warranty_page for all
  using (public.is_admin()) with check (public.is_admin());

insert into public.warranty_page (id, title, subtitle)
values (
  1,
  'การรับประกันและการเคลมสินค้า',
  'รายละเอียดเงื่อนไขการรับประกันสินค้าแต่ละประเภทของ Ryoko Tackle'
)
on conflict (id) do nothing;
