-- Ryoko Tackle — product-backed carousel slides
-- A slide can now be backed by a product instead of an uploaded image. For such
-- slides the image is the product's primary image and the title is the product
-- name (resolved at read time, not stored — so it can't be edited and never goes
-- stale). The subtitle stays freely editable. image_url therefore becomes
-- nullable (null for product slides). Deleting the product removes its slides.

alter table public.carousel_slides
  alter column image_url drop not null,
  add column if not exists product_id uuid
    references public.products(id) on delete cascade;

create index if not exists carousel_slides_product_idx
  on public.carousel_slides(product_id);
