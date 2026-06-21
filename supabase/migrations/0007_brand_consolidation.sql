-- Consolidate brands to RYOKO + Ballista.
-- Everything that isn't Ballista becomes RYOKO; the remaining brand records are
-- removed; brand_id becomes mandatory and defaults to RYOKO.

-- 1. Reassign every non-Ballista product (including unbranded ones) to RYOKO.
update public.products
set brand_id = (select id from public.brands where slug = 'ryoko')
where brand_id is distinct from (select id from public.brands where slug = 'ballista');

-- 2. Drop the now-unused brand records — only RYOKO and Ballista remain.
delete from public.brands
where slug not in ('ryoko', 'ballista');

-- 3. brand_id is now required and defaults to RYOKO.
--    (DEFAULT must be a literal — this is the RYOKO brands.id.)
alter table public.products
  alter column brand_id set default 'c6233d06-271f-4872-8c9c-3048d3eabba2',
  alter column brand_id set not null;
