
create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table public.app_settings enable row level security;

create policy "Anyone can read settings" on public.app_settings for select using (true);

create policy "Admins can update settings" on public.app_settings for update to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert settings" on public.app_settings for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

insert into public.app_settings (key, value) values ('ai_provider', 'lovable');
