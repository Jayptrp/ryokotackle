-- Per-locale translations for product copy.
--
-- Thai stays the source of truth in `summary` / `description`. These jsonb
-- columns hold the non-Thai locales, shaped as:
--   { "en": "<html>", "vi": "<html>", "id": "<html>", "ms": "<html>" }
-- A missing locale key (or empty string) falls back to Thai at render time.
-- Product *names* are not translated here — non-Thai locales show the English
-- `name` column. See src/lib/i18n/.
alter table products
  add column if not exists summary_i18n     jsonb not null default '{}'::jsonb,
  add column if not exists description_i18n jsonb not null default '{}'::jsonb;
