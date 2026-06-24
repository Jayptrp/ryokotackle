-- Editable "ติดต่อเรา" (Contact) page content. Single-row settings table so the
-- admin can edit the intro, contact details, store logo, address and map pin
-- without a deploy. Public reads; admins write (same is_admin() RLS as the rest).

create table if not exists public.contact_page (
  id            smallint primary key default 1,
  intro         text,
  phone         text,
  mobile        text,
  email         text,
  line          text,
  logo_url      text,
  location_desc text,
  address       text,
  map_lat       double precision,
  map_lng       double precision,
  updated_at    timestamptz not null default now(),
  constraint contact_page_singleton check (id = 1)
);

alter table public.contact_page enable row level security;

create policy "contact_page_read" on public.contact_page
  for select using (true);
create policy "contact_page_admin_write" on public.contact_page
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed the single row with the values that were previously hard-coded.
insert into public.contact_page
  (id, intro, phone, mobile, email, line, location_desc, address, map_lat, map_lng)
values (
  1,
  'Ryoko Tackle พร้อมมอบบริการระดับพรีเมียมและการสนับสนุนจากทีมงานมืออาชีพ เพื่อตอบโจทย์ทุกความต้องการของนักตกปลา',
  '+66-2-183-7857',
  '+66-95-951-4519',
  'info@trytackle.com',
  '@ryokothailand',
  'แวะมาพูดคุยกับทีมงานและลองจับอุปกรณ์ตกปลาด้วยตัวคุณเองที่ร้านของเรา',
  E'บริษัท ที.อาร์.วาย.ฟิชชิ่ง แทคเคิล จำกัด\n289/11 หมู่ 13 ซ.กิ่งแก้ว 25/1\nต.ราชาเทวะ อ.บางพลี จ.สมุทรปราการ 10540',
  13.6812373,
  100.7127972
)
on conflict (id) do nothing;
