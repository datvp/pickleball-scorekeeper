create extension if not exists pgcrypto;

create table public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  linked_account_id uuid unique references auth.users(id) on delete set null,
  display_name text not null check (length(btrim(display_name)) > 0),
  level text not null default '3.0' check (length(btrim(level)) > 0),
  visibility text not null default 'private' check (visibility in ('private', 'tournament')),
  former_names text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shared_tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'ready' check (status in ('ready', 'in_progress', 'completed')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shared_tournament_memberships (
  id uuid not null unique default gen_random_uuid(),
  tournament_id uuid not null references public.shared_tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  member_display_name text not null default 'Member',
  membership_role text not null check (membership_role in ('owner', 'co_organizer', 'scorekeeper')),
  setup_grant boolean not null default true,
  corrections_grant boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (tournament_id, user_id),
  check (
    membership_role in ('owner', 'co_organizer')
    or (setup_grant and not corrections_grant)
  )
);

create unique index shared_tournament_single_owner
  on public.shared_tournament_memberships(tournament_id)
  where membership_role = 'owner';

create table public.shared_tournament_entries (
  tournament_id uuid not null references public.shared_tournaments(id) on delete cascade,
  entry_id uuid not null,
  player_profile_id uuid not null references public.player_profiles(id) on delete restrict,
  display_name_snapshot text not null check (length(btrim(display_name_snapshot)) > 0),
  primary key (tournament_id, entry_id, player_profile_id)
);

create table public.shared_tournament_fixtures (
  tournament_id uuid not null references public.shared_tournaments(id) on delete cascade,
  fixture_id uuid not null,
  round_number integer not null check (round_number > 0),
  fixture_data jsonb not null default '{}'::jsonb,
  primary key (tournament_id, fixture_id)
);

create table public.shared_scorekeeper_assignments (
  tournament_id uuid not null,
  fixture_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (tournament_id, fixture_id),
  foreign key (tournament_id, fixture_id)
    references public.shared_tournament_fixtures(tournament_id, fixture_id) on delete cascade,
  foreign key (tournament_id, user_id)
    references public.shared_tournament_memberships(tournament_id, user_id) on delete cascade
);

create table public.shared_tournament_results (
  tournament_id uuid not null,
  fixture_id uuid not null,
  result_data jsonb not null,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  primary key (tournament_id, fixture_id),
  foreign key (tournament_id, fixture_id)
    references public.shared_tournament_fixtures(tournament_id, fixture_id) on delete cascade
);

create table public.player_profile_link_requests (
  id uuid primary key default gen_random_uuid(),
  player_profile_id uuid not null references public.player_profiles(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  player_name_snapshot text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index one_pending_profile_link_request
  on public.player_profile_link_requests(player_profile_id)
  where status = 'pending';
create unique index one_pending_profile_link_per_account
  on public.player_profile_link_requests(requester_id)
  where status = 'pending';

create or replace function public.has_tournament_permission(
  requested_tournament_id uuid,
  requested_permission text,
  requested_fixture_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when requested_permission = 'view' then
      exists (
        select 1
        from public.shared_tournament_memberships m
        where m.tournament_id = requested_tournament_id and m.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.shared_tournament_entries e
        join public.player_profiles p on p.id = e.player_profile_id
        where e.tournament_id = requested_tournament_id and p.linked_account_id = auth.uid()
      )
    when requested_permission = 'manage_roles' then
      exists (
        select 1 from public.shared_tournament_memberships m
        where m.tournament_id = requested_tournament_id
          and m.user_id = auth.uid() and m.membership_role = 'owner'
      )
    when requested_permission = 'setup' then
      exists (
        select 1 from public.shared_tournament_memberships m
        where m.tournament_id = requested_tournament_id
          and m.user_id = auth.uid()
          and (m.membership_role = 'owner' or (m.membership_role = 'co_organizer' and m.setup_grant))
      )
    when requested_permission = 'assign_scorekeeper' then
      exists (
        select 1 from public.shared_tournament_memberships m
        where m.tournament_id = requested_tournament_id
          and m.user_id = auth.uid()
          and m.membership_role in ('owner', 'co_organizer')
      )
    when requested_permission = 'correct_result' then
      exists (
        select 1 from public.shared_tournament_memberships m
        where m.tournament_id = requested_tournament_id
          and m.user_id = auth.uid()
          and (m.membership_role = 'owner' or (m.membership_role = 'co_organizer' and m.corrections_grant))
      )
    when requested_permission = 'complete_tournament' then
      exists (
        select 1 from public.shared_tournament_memberships m
        where m.tournament_id = requested_tournament_id
          and m.user_id = auth.uid() and m.membership_role = 'owner'
      )
    when requested_permission = 'record_result' then
      exists (
        select 1 from public.shared_tournament_memberships m
        where m.tournament_id = requested_tournament_id
          and m.user_id = auth.uid()
          and m.membership_role in ('owner', 'co_organizer')
      )
      or (
        requested_fixture_id is not null
        and exists (
          select 1 from public.shared_scorekeeper_assignments a
          join public.shared_tournament_memberships m
            on m.tournament_id = a.tournament_id and m.user_id = a.user_id
          where a.tournament_id = requested_tournament_id
            and a.fixture_id = requested_fixture_id
            and a.user_id = auth.uid()
            and m.membership_role = 'scorekeeper'
        )
      )
    else false
  end;
$$;

create or replace function public.can_approve_player_profile_link(requested_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.shared_tournament_entries e
    join public.shared_tournament_memberships m on m.tournament_id = e.tournament_id
    where e.player_profile_id = requested_profile_id
      and m.user_id = auth.uid()
      and m.membership_role in ('owner', 'co_organizer')
  );
$$;

create view public.shared_tournament_member_list
with (security_barrier = true)
as
select
  m.id as membership_id,
  m.tournament_id,
  m.member_display_name,
  m.membership_role
from public.shared_tournament_memberships m
where public.has_tournament_permission(m.tournament_id, 'view');

create view public.pending_player_profile_link_requests
with (security_barrier = true)
as
select
  r.id as request_id,
  r.player_name_snapshot,
  r.created_at,
  r.requester_id = auth.uid() as is_own_request
from public.player_profile_link_requests r
where r.status = 'pending'
  and (
    r.requester_id = auth.uid()
    or public.can_approve_player_profile_link(r.player_profile_id)
  );

create or replace function public.add_tournament_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.shared_tournament_memberships (
    tournament_id, user_id, member_display_name, membership_role, setup_grant, corrections_grant
  ) values (new.id, new.created_by, 'Owner', 'owner', true, true);
  return new;
end;
$$;

create trigger shared_tournament_owner_membership
  after insert on public.shared_tournaments
  for each row execute function public.add_tournament_owner_membership();

create or replace function public.enforce_tournament_status_owner()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status is distinct from new.status
     and not public.has_tournament_permission(old.id, 'complete_tournament') then
    raise exception 'only the Owner can change tournament status' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger shared_tournament_status_owner
  before update on public.shared_tournaments
  for each row execute function public.enforce_tournament_status_owner();

create or replace function public.request_player_profile_link(requested_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_id uuid;
  requested_name text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.player_profiles p where p.linked_account_id = auth.uid()
  ) then
    raise exception 'account already linked to a player profile' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.player_profile_link_requests r
    where r.requester_id = auth.uid() and r.status = 'pending'
  ) then
    raise exception 'account already has a pending profile link request' using errcode = '23505';
  end if;
  select p.display_name into requested_name
  from public.player_profiles p
  where p.id = requested_profile_id and p.linked_account_id is null;
  if requested_name is null then
    raise exception 'profile unavailable' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.shared_tournament_entries e
    where e.player_profile_id = requested_profile_id
  ) then
    raise exception 'profile is not associated with a shared tournament' using errcode = 'P0002';
  end if;
  insert into public.player_profile_link_requests (
    player_profile_id, requester_id, player_name_snapshot
  ) values (requested_profile_id, auth.uid(), requested_name)
  returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.approve_player_profile_link(link_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  pending_request public.player_profile_link_requests%rowtype;
begin
  select * into pending_request
  from public.player_profile_link_requests r
  where r.id = link_request_id and r.status = 'pending'
  for update;
  if not found or not public.can_approve_player_profile_link(pending_request.player_profile_id) then
    raise exception 'profile link request cannot be approved' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.player_profiles p
    where p.linked_account_id = pending_request.requester_id
       or (p.id = pending_request.player_profile_id and p.linked_account_id is not null)
  ) then
    raise exception 'profile or account already linked' using errcode = '23505';
  end if;
  update public.player_profiles
  set linked_account_id = pending_request.requester_id, updated_at = now()
  where id = pending_request.player_profile_id;
  update public.player_profile_link_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = pending_request.id;
end;
$$;

create or replace function public.reject_player_profile_link(link_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  pending_request public.player_profile_link_requests%rowtype;
begin
  select * into pending_request
  from public.player_profile_link_requests r
  where r.id = link_request_id and r.status = 'pending'
  for update;
  if not found or not public.can_approve_player_profile_link(pending_request.player_profile_id) then
    raise exception 'profile link request cannot be rejected' using errcode = '42501';
  end if;
  update public.player_profile_link_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  where id = pending_request.id;
end;
$$;

create or replace function public.set_co_organizer_grants(
  requested_membership_id uuid,
  allow_setup boolean,
  allow_corrections boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.shared_tournament_memberships%rowtype;
begin
  select * into target
  from public.shared_tournament_memberships m
  where m.id = requested_membership_id;
  if not found or target.membership_role <> 'co_organizer'
     or not public.has_tournament_permission(target.tournament_id, 'manage_roles') then
    raise exception 'Co-organizer grants cannot be changed' using errcode = '42501';
  end if;
  update public.shared_tournament_memberships
  set setup_grant = allow_setup, corrections_grant = allow_corrections
  where id = requested_membership_id;
end;
$$;

create or replace function public.revoke_tournament_membership(requested_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.shared_tournament_memberships%rowtype;
begin
  select * into target
  from public.shared_tournament_memberships m
  where m.id = requested_membership_id;
  if not found or target.membership_role = 'owner'
     or not (
       public.has_tournament_permission(target.tournament_id, 'manage_roles')
       or (
         target.membership_role = 'scorekeeper'
         and public.has_tournament_permission(target.tournament_id, 'assign_scorekeeper')
       )
     ) then
    raise exception 'Membership cannot be revoked' using errcode = '42501';
  end if;
  delete from public.shared_tournament_memberships where id = requested_membership_id;
end;
$$;

alter table public.player_profiles enable row level security;
alter table public.shared_tournaments enable row level security;
alter table public.shared_tournament_memberships enable row level security;
alter table public.shared_tournament_entries enable row level security;
alter table public.shared_tournament_fixtures enable row level security;
alter table public.shared_scorekeeper_assignments enable row level security;
alter table public.shared_tournament_results enable row level security;
alter table public.player_profile_link_requests enable row level security;

revoke all on public.player_profiles, public.shared_tournaments,
  public.shared_tournament_memberships, public.shared_tournament_entries,
  public.shared_tournament_fixtures, public.shared_scorekeeper_assignments,
  public.shared_tournament_results,
  public.player_profile_link_requests from anon, authenticated;
revoke all on public.shared_tournament_member_list from anon, authenticated;
revoke all on public.pending_player_profile_link_requests from anon, authenticated;

grant select, insert on public.player_profiles to authenticated;
grant update (display_name, level, visibility, updated_at) on public.player_profiles to authenticated;
grant select, insert, delete on public.shared_tournaments to authenticated;
grant update (name, status, config, updated_at) on public.shared_tournaments to authenticated;
grant select, insert, update, delete on public.shared_tournament_entries to authenticated;
grant select, insert, update, delete on public.shared_tournament_fixtures to authenticated;
grant select, insert, update, delete on public.shared_scorekeeper_assignments to authenticated;
grant select, insert on public.shared_tournament_results to authenticated;
grant select on public.shared_tournament_member_list to authenticated;
grant select on public.pending_player_profile_link_requests to authenticated;

create policy "Profiles are private to their creator or linked account"
  on public.player_profiles for select to authenticated
  using (created_by = auth.uid() or linked_account_id = auth.uid());
create policy "Authenticated users create unclaimed profiles"
  on public.player_profiles for insert to authenticated
  with check (created_by = auth.uid() and linked_account_id is null);
create policy "Profile owner or creator updates permitted profile fields"
  on public.player_profiles for update to authenticated
  using (linked_account_id = auth.uid() or (created_by = auth.uid() and linked_account_id is null))
  with check (linked_account_id = auth.uid() or (created_by = auth.uid() and linked_account_id is null));

create policy "Shared tournaments visible to members and linked players"
  on public.shared_tournaments for select to authenticated
  using (public.has_tournament_permission(id, 'view'));
create policy "Authenticated user creates a shared tournament"
  on public.shared_tournaments for insert to authenticated
  with check (created_by = auth.uid());
create policy "Owner or Setup grantee edits shared tournament"
  on public.shared_tournaments for update to authenticated
  using (public.has_tournament_permission(id, 'setup'))
  with check (public.has_tournament_permission(id, 'setup'));
create policy "Only Owner deletes shared tournament"
  on public.shared_tournaments for delete to authenticated
  using (public.has_tournament_permission(id, 'manage_roles'));

create policy "Tournament members see memberships and linked Players see role list"
  on public.shared_tournament_memberships for select to authenticated
  using (public.has_tournament_permission(tournament_id, 'view'));
create policy "Owner updates Co-organizer grants"
  on public.shared_tournament_memberships for update to authenticated
  using (public.has_tournament_permission(tournament_id, 'manage_roles') and membership_role = 'co_organizer')
  with check (public.has_tournament_permission(tournament_id, 'manage_roles') and membership_role = 'co_organizer');
create policy "Owner or Co-organizer revokes a non-owner membership"
  on public.shared_tournament_memberships for delete to authenticated
  using (
    membership_role <> 'owner'
    and (
      public.has_tournament_permission(tournament_id, 'manage_roles')
      or (
        membership_role = 'scorekeeper'
        and public.has_tournament_permission(tournament_id, 'assign_scorekeeper')
      )
    )
  );

create policy "Tournament entries are visible to permitted viewers"
  on public.shared_tournament_entries for select to authenticated
  using (public.has_tournament_permission(tournament_id, 'view'));
create policy "Owner or Setup grantee manages entries"
  on public.shared_tournament_entries for all to authenticated
  using (public.has_tournament_permission(tournament_id, 'setup'))
  with check (public.has_tournament_permission(tournament_id, 'setup'));

create policy "Tournament fixtures are visible to permitted viewers"
  on public.shared_tournament_fixtures for select to authenticated
  using (public.has_tournament_permission(tournament_id, 'view'));
create policy "Owner or Setup grantee manages fixtures"
  on public.shared_tournament_fixtures for all to authenticated
  using (public.has_tournament_permission(tournament_id, 'setup'))
  with check (public.has_tournament_permission(tournament_id, 'setup'));

create policy "Tournament members see scorekeeper assignments"
  on public.shared_scorekeeper_assignments for select to authenticated
  using (public.has_tournament_permission(tournament_id, 'view'));
create policy "Owner or Co-organizer assigns scorekeepers"
  on public.shared_scorekeeper_assignments for all to authenticated
  using (public.has_tournament_permission(tournament_id, 'assign_scorekeeper'))
  with check (
    public.has_tournament_permission(tournament_id, 'assign_scorekeeper')
    and exists (
      select 1 from public.shared_tournament_memberships m
      where m.tournament_id = shared_scorekeeper_assignments.tournament_id
        and m.user_id = shared_scorekeeper_assignments.user_id
        and m.membership_role = 'scorekeeper'
    )
  );

create policy "Tournament viewers see recorded results"
  on public.shared_tournament_results for select to authenticated
  using (public.has_tournament_permission(tournament_id, 'view'));
create policy "Owner Co-organizer or assigned Scorekeeper records a result"
  on public.shared_tournament_results for insert to authenticated
  with check (
    recorded_by = auth.uid()
    and public.has_tournament_permission(tournament_id, 'record_result', fixture_id)
  );

create policy "Requester and tournament managers see profile link requests"
  on public.player_profile_link_requests for select to authenticated
  using (requester_id = auth.uid() or public.can_approve_player_profile_link(player_profile_id));

revoke all on function public.has_tournament_permission(uuid, text, uuid) from public, anon;
revoke all on function public.can_approve_player_profile_link(uuid) from public, anon;
revoke all on function public.request_player_profile_link(uuid) from public, anon;
revoke all on function public.approve_player_profile_link(uuid) from public, anon;
revoke all on function public.reject_player_profile_link(uuid) from public, anon;
revoke all on function public.set_co_organizer_grants(uuid, boolean, boolean) from public, anon;
revoke all on function public.revoke_tournament_membership(uuid) from public, anon;
grant execute on function public.has_tournament_permission(uuid, text, uuid) to authenticated;
grant execute on function public.can_approve_player_profile_link(uuid) to authenticated;
grant execute on function public.request_player_profile_link(uuid) to authenticated;
grant execute on function public.approve_player_profile_link(uuid) to authenticated;
grant execute on function public.reject_player_profile_link(uuid) to authenticated;
grant execute on function public.set_co_organizer_grants(uuid, boolean, boolean) to authenticated;
grant execute on function public.revoke_tournament_membership(uuid) to authenticated;
