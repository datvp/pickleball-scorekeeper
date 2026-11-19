create table public.account_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,30}$'),
  created_at timestamptz not null default now()
);

create unique index account_profiles_username_ci_key
  on public.account_profiles (lower(username));

alter table public.account_profiles enable row level security;

revoke all on public.account_profiles from anon, authenticated;
grant select on public.account_profiles to authenticated;

create policy "Users can read their own account profile"
  on public.account_profiles for select to authenticated
  using (user_id = auth.uid());

create or replace function public.create_account_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  if not (new.raw_user_meta_data ? 'username') then
    return new;
  end if;

  requested_username := new.raw_user_meta_data ->> 'username';
  if requested_username is null
     or requested_username !~ '^[A-Za-z0-9_]{3,30}$' then
    raise exception 'username must contain 3 to 30 letters, numbers, or underscores'
      using errcode = '23514';
  end if;

  insert into public.account_profiles (user_id, username)
  values (new.id, requested_username);
  return new;
end;
$$;

revoke all on function public.create_account_profile_for_auth_user() from public, anon, authenticated;

create trigger create_account_profile_after_auth_signup
  after insert on auth.users
  for each row execute function public.create_account_profile_for_auth_user();
