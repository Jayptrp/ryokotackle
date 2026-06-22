-- Ryoko Tackle — admin-controlled warranty badge icon + color.
-- Makes the per-type icon/color rename-proof (previously matched by name on the
-- public page). `icon` is a Material Symbols ligature; `color` is a key from
-- src/lib/warranty-style.ts (blue | red | navy | accent | neutral).

alter table public.warranties
  add column if not exists icon text not null default 'verified_user',
  add column if not exists color text not null default 'blue';

-- Backfill the originally name-matched styling for the seeded types.
update public.warranties set icon = 'gpp_bad', color = 'red'
  where name = 'ไม่มีประกัน / ไม่มีอะไหล่';
update public.warranties set icon = 'shield', color = 'blue'
  where name = 'ไม่มีประกัน / มีอะไหล่';
