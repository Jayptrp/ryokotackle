-- Ryoko Tackle — admin-editable homepage content
-- Two additions powering the new "แก้ไขหน้าแรก" admin section:
--   1. carousel_slides — the hero carousel was hardcoded in the component; this
--      table makes slides (image + title + subtitle) admin-editable & orderable.
--   2. categories.image_url / image_product_id — per-category background image for
--      the redesigned category cards. Admin either uploads an image (image_url) or
--      points at a product whose primary image is used (image_product_id). When
--      neither is set the frontend auto-picks a product image from the category.
-- RLS mirrors the existing pattern: world-readable (homepage content), admin write.

-- 1. Hero carousel slides
create table if not exists public.carousel_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  subtitle text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists carousel_slides_sort_idx
  on public.carousel_slides(sort_order);

drop trigger if exists carousel_slides_set_updated_at on public.carousel_slides;
create trigger carousel_slides_set_updated_at
  before update on public.carousel_slides
  for each row execute function public.set_updated_at();

alter table public.carousel_slides enable row level security;

create policy "carousel_slides_read" on public.carousel_slides for select
  using (true);
create policy "carousel_slides_admin_write" on public.carousel_slides for all
  using (public.is_admin()) with check (public.is_admin());

-- Seed the two slides that previously lived in hero-carousel.tsx (idempotent).
insert into public.carousel_slides (image_url, title, subtitle, sort_order)
select v.image_url, v.title, v.subtitle, v.sort_order
from (values
  ('https://lh3.googleusercontent.com/aida-public/AB6AXuAOD-P8X7ullFR4dKhcbqBboXo8t6u-6tAVP8scPzYnrGfzRS9WW_gUUUMq-bTC5UagRz0iJBz-V0TQtvAcWNtpL8DOjPHQV6Z5UGx997ycnb1rOxMEips8-TLP_fDgRDf6l0CdQR3HezT0pejTz6E5oAgPes4t9I5Vdrs6W1dBXoKjLYsiXCwkSwiPLNYVZV2g4izNMU2Wo_npDbECROICKc8h2CKeHf9SyxuyAOZ56nV_dNdM0dMdDUPPmn9vmtvTLG5mxZf9YyI',
   'Ultimate Precision in Every Cast',
   'สัมผัสประสบการณ์ตกปลาระดับพรีเมียมด้วยเทคโนโลยีจากญี่ปุ่น', 10),
  ('https://lh3.googleusercontent.com/aida-public/AB6AXuAYqJ8DE1vlpVivWseIFT9CF0HC82261ZPrGPE3GavGvFi38lC5Vf3QbQdPbiv1MsI422Ww8eXhwzOOw_cJEDeMRQcoqLZ0_C7giolt-sD9QDmZvwFTjVYIFW9p-AU7wgfZ0AyCkD3wUEuUXR8HngeC-t0Wa6HRK3E0NuF7XpyLAr4rWwreRD9Ez316U44sjtTi1_IcMChc0pYm8pg-V7842dX8Eu6ZY1qflhg1MekGoUd4qRfjfg03wY6lv8s-G8o-3ffduvXF6m4',
   'Master the Ocean''s Rhythm',
   'คันเบ็ดคุณภาพสูงที่ออกแบบมาเพื่อการควบคุมที่แม่นยำ', 20)
) as v(image_url, title, subtitle, sort_order)
where not exists (select 1 from public.carousel_slides);

-- 2. Per-category background image for the homepage category cards
alter table public.categories
  add column if not exists image_url text,
  add column if not exists image_product_id uuid
    references public.products(id) on delete set null;
