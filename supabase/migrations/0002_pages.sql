-- Ryoko Tackle — editable static pages (About, etc.)
-- A small CMS table for admin-authored informational pages. Body is stored as
-- the same sanitized Tiptap HTML used by product descriptions, so the existing
-- admin editor (TiptapEditor) and frontend renderer (RichContent) apply as-is.
-- RLS: public reads published pages, admins write.

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  title_th text,
  content text,                       -- Tiptap rich-text HTML
  status public.product_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.pages enable row level security;

-- Published pages are world-readable; admins additionally see drafts/hidden.
create policy "pages_read" on public.pages for select
  using (status = 'published' or public.is_admin());

-- Writes: admins only.
create policy "pages_admin_write" on public.pages for all
  using (public.is_admin()) with check (public.is_admin());

-- Seed the About page (idempotent). Content is initial Thai copy the admin can
-- freely edit later from /admin/pages/about.
insert into public.pages (slug, title, title_th, status, content) values (
  'about',
  'About Ryoko Tackle',
  'เกี่ยวกับเรา',
  'published',
  $html$<p>Ryoko Tackle คือร้านจำหน่ายอุปกรณ์ตกปลาพรีเมียมสำหรับนักตกปลาชาวไทยที่มองหาคุณภาพและประสิทธิภาพในทุกการออกทริป เราคัดสรรคันเบ็ด รอก สายเอ็น เหยื่อปลอม และอุปกรณ์เสริมจากแบรนด์ชั้นนำ เพื่อให้คุณมั่นใจได้ในทุกหมายและทุกสภาพการตกปลา</p>
<h2>เรื่องราวของเรา</h2>
<p>จากความหลงใหลในการตกปลาสู่การเป็นแหล่งรวมอุปกรณ์ที่นักตกปลาไว้วางใจ ทีมงาน Ryoko Tackle เข้าใจดีว่าอุปกรณ์ที่ดีคือหัวใจของทุกการตกปลา เราจึงตั้งใจคัดเลือกสินค้าที่ผ่านการใช้งานจริงและตอบโจทย์นักตกปลาทุกระดับ</p>
<h2>ทำไมต้องเลือกเรา</h2>
<ul>
<li><strong>สินค้าคุณภาพ</strong> — คัดสรรจากแบรนด์ที่เชื่อถือได้ พร้อมรายละเอียดสเปกครบถ้วน</li>
<li><strong>ครอบคลุมทุกประเภท</strong> — ตั้งแต่คันเบ็ด รอก สายเอ็น ไปจนถึงเหยื่อปลอมและอุปกรณ์เสริม</li>
<li><strong>ทีมงานมืออาชีพ</strong> — พร้อมให้คำแนะนำและบริการด้วยความใส่ใจ</li>
</ul>
<h2>ติดต่อเรา</h2>
<p>มีคำถามเกี่ยวกับสินค้าหรือต้องการคำแนะนำ ทักหาเราได้ทุกช่องทาง ทีมงาน Ryoko Tackle ยินดีให้บริการ</p>$html$
)
on conflict (slug) do nothing;
