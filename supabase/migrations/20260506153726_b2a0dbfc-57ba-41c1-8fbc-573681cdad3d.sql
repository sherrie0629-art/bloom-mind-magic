
insert into storage.buckets (id, name, public)
values ('mbti-poster-art', 'mbti-poster-art', true)
on conflict (id) do nothing;

create policy "Public can read mbti poster art"
on storage.objects for select
using (bucket_id = 'mbti-poster-art');
