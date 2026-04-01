-- Tabel terpisah khusus untuk finance input checklist & comment LPJ
-- Jalankan di Supabase SQL Editor

create table if not exists public.finance_lpj_review (
  id bigint generated always as identity primary key,
  -- ref_type: 'letter' | 'addendum' | 'mutasi'
  ref_type text not null check (ref_type in ('letter', 'addendum', 'mutasi')),
  -- ref_id: id dari tabel letter, addendum, atau audit_mutasi (disimpan sebagai text agar fleksibel)
  ref_id text not null,
  checklist boolean not null default false,
  comment text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  -- 1 record per dokumen
  unique (ref_type, ref_id)
);

-- Enable RLS
alter table public.finance_lpj_review enable row level security;

-- Policy: semua user authenticated bisa read & write (bisa diperketat sesuai kebutuhan)
create policy "Finance full access" on public.finance_lpj_review
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
