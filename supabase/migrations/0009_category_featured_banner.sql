-- Ryoko Tackle — per-category banner for the homepage "สินค้าแนะนำ" section.
-- The featured-products block on the homepage is now grouped by top-level
-- category; each group shows an optional 3:1 banner above its product list.
-- Admins upload the banner per category in the "แก้ไขสินค้าแนะนำ" admin page.
alter table public.categories
  add column if not exists featured_banner_url text;
