-- Ryoko Tackle — carousel slide click-through link
-- A slide can link to a product on click, independent of whether its image is
-- backed by that same product. Defaults to the backing product when a slide is
-- added via "add from product"; left null (no link) for uploaded slides until
-- an admin picks one. Nullable FK named explicitly since carousel_slides will
-- have two FKs to products (product_id for image backing, link_product_id for
-- the click target) — PostgREST embeds need the explicit constraint name.

alter table public.carousel_slides
  add column if not exists link_product_id uuid
    references public.products(id) on delete set null;

create index if not exists carousel_slides_link_product_idx
  on public.carousel_slides(link_product_id);
