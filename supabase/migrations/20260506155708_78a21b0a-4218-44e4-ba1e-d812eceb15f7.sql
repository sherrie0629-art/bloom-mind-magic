
insert into storage.buckets (id, name, public)
values ('assessment-cache', 'assessment-cache', false)
on conflict (id) do nothing;
