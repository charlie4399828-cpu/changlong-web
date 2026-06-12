-- 昌隆茶舍 CMS 云端数据表（在 Supabase SQL Editor 中执行）

create table if not exists public.site_content (
  id int primary key default 1,
  content jsonb not null default '{}'::jsonb,
  edit_password text not null default '',
  updated_at timestamptz not null default now(),
  constraint site_content_single_row check (id = 1)
);

alter table public.site_content enable row level security;

create policy "site_content_public_read"
  on public.site_content for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.site_content from anon, authenticated;

insert into public.site_content (id, content, edit_password)
values (1, '{}'::jsonb, '')
on conflict (id) do nothing;

-- 媒体存储桶（图片/视频）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'changlong-cms',
  'changlong-cms',
  true,
  83886080,
  array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','video/mp4','video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "changlong_cms_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'changlong-cms');

create policy "changlong_cms_anon_upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'changlong-cms');

create policy "changlong_cms_anon_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'changlong-cms')
  with check (bucket_id = 'changlong-cms');
