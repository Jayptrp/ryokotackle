-- Add qr_code_url column to warranty_page table
alter table public.warranty_page add column if not exists qr_code_url text;
