-- Make the contact info cards admin-managed (add/remove/edit/reorder, custom
-- icon + label + value), like warranty types. Seed from the previously fixed
-- phone/mobile/email/line, then drop those columns and the store logo.

create table if not exists public.contact_cards (
  id         uuid primary key default gen_random_uuid(),
  icon       text not null default 'info',
  label      text not null,
  value      text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.contact_cards enable row level security;
create policy "contact_cards_read" on public.contact_cards
  for select using (true);
create policy "contact_cards_admin_write" on public.contact_cards
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed from the existing singleton values (only non-empty ones).
insert into public.contact_cards (icon, label, value, sort_order)
select v.icon, v.label, v.value, v.sort_order
from (values
  ('phone',      'โทรศัพท์', (select phone  from public.contact_page where id = 1), 10),
  ('smartphone', 'มือถือ',   (select mobile from public.contact_page where id = 1), 20),
  ('mail',       'อีเมล',    (select email  from public.contact_page where id = 1), 30),
  ('chat',       'LINE',     (select line   from public.contact_page where id = 1), 40)
) as v(icon, label, value, sort_order)
where v.value is not null and btrim(v.value) <> ''
  and not exists (select 1 from public.contact_cards);

-- Drop the now-unused fixed columns + logo.
alter table public.contact_page
  drop column if exists phone,
  drop column if exists mobile,
  drop column if exists email,
  drop column if exists line,
  drop column if exists logo_url;
