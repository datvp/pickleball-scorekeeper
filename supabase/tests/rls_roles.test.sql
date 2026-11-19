begin;

select plan(25);

insert into auth.users (id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@example.test', now(), now(), '{}', '{}'),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'co@example.test', now(), now(), '{}', '{}'),
  ('10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'keeper@example.test', now(), now(), '{}', '{}'),
  ('10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'player@example.test', now(), now(), '{}', '{}'),
  ('10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'signup@example.test', now(), now(), '{}', '{"username":"Rally_Pro"}');

select is(
  (select username from public.account_profiles where user_id = '10000000-0000-0000-0000-000000000005'),
  'Rally_Pro',
  'a password signup stores its username in the account profile table'
);

select is(
  (select count(*)::integer from public.account_profiles where user_id = '10000000-0000-0000-0000-000000000004'),
  0,
  'legacy email users without a username remain supported'
);

select throws_ok(
  $$ insert into auth.users (id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
     values ('10000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'duplicate@example.test', now(), now(), '{}', '{"username":"rally_pro"}') $$,
  '23505',
  null,
  'usernames are unique regardless of letter case'
);

select throws_ok(
  $$ insert into auth.users (id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
     values ('10000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'invalid-name@example.test', now(), now(), '{}', '{"username":"invalid name"}') $$,
  '23514',
  null,
  'invalid usernames are rejected by the signup trigger'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$ insert into public.shared_tournaments (id, name, created_by)
     values ('20000000-0000-0000-0000-000000000001', 'RLS test', auth.uid()) $$,
  'an authenticated user can create a tournament and receives its Owner membership'
);

reset role;
insert into public.shared_tournament_memberships (id, tournament_id, user_id, membership_role, setup_grant)
values
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'co_organizer', false),
  ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'scorekeeper', true);
insert into public.player_profiles (id, created_by, display_name)
values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Guest Player');
insert into public.shared_tournament_entries (tournament_id, entry_id, player_profile_id, display_name_snapshot)
values ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Guest Player');
insert into public.shared_tournament_fixtures (tournament_id, fixture_id, round_number)
values
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1),
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', 1);
insert into public.shared_scorekeeper_assignments (tournament_id, fixture_id, user_id, assigned_by)
values ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select ok(
  public.has_tournament_permission('20000000-0000-0000-0000-000000000001', 'manage_roles'),
  'Owner has role-management permission'
);
select throws_ok(
  $$ insert into public.shared_tournament_memberships (tournament_id, user_id, membership_role)
     values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'scorekeeper') $$,
  '42501',
  null,
  'new memberships cannot bypass the deferred invitation acceptance flow'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select lives_ok(
  $$ select public.request_player_profile_link('30000000-0000-0000-0000-000000000001') $$,
  'a Player can request a link to an unclaimed tournament profile'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ select public.approve_player_profile_link(request_id)
     from public.pending_player_profile_link_requests
     where player_name_snapshot = 'Guest Player' $$,
  'a tournament Owner can approve a profile-link request'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select is(
  (select count(*)::integer from public.shared_tournaments where id = '20000000-0000-0000-0000-000000000001'),
  1,
  'a linked Player can read their tournament'
);

select is(
  (select count(*)::integer from public.shared_tournament_member_list where tournament_id = '20000000-0000-0000-0000-000000000001'),
  3,
  'a Player can view member names and roles'
);

select throws_ok(
  $$ select user_id from public.shared_tournament_memberships
     where tournament_id = '20000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'member reads cannot expose authentication user IDs'
);

select lives_ok(
  $$ update public.player_profiles
     set level = '3.5', visibility = 'tournament'
     where id = '30000000-0000-0000-0000-000000000001' $$,
  'a linked account can update its own profile fields'
);

select throws_ok(
  $$ update public.player_profiles
     set linked_account_id = '10000000-0000-0000-0000-000000000001'
     where id = '30000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'a linked account cannot bypass the profile-link approval process'
);

select throws_ok(
  $$ insert into public.shared_tournament_entries (tournament_id, entry_id, player_profile_id, display_name_snapshot)
     values ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Player edit') $$,
  '42501',
  null,
  'a Player cannot modify tournament entries'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$ insert into public.shared_tournament_entries (tournament_id, entry_id, player_profile_id, display_name_snapshot)
     values ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'Co-organizer edit') $$,
  '42501',
  null,
  'a Co-organizer without Setup grant cannot change entries'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ select public.set_co_organizer_grants('60000000-0000-0000-0000-000000000002', true, false) $$,
  'the Owner can manage Co-organizer grants'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$ select public.set_co_organizer_grants('60000000-0000-0000-0000-000000000002', false, true) $$,
  '42501',
  null,
  'a Co-organizer cannot change role grants'
);
select throws_ok(
  $$ select public.revoke_tournament_membership(membership_id)
     from public.shared_tournament_member_list
     where tournament_id = '20000000-0000-0000-0000-000000000001'
       and membership_role = 'owner' $$,
  '42501',
  null,
  'a Co-organizer cannot revoke the Owner'
);

select lives_ok(
  $$ insert into public.shared_tournament_entries (tournament_id, entry_id, player_profile_id, display_name_snapshot)
     values ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'Co-organizer edit') $$,
  'a Co-organizer with Setup grant can change entries'
);

select throws_ok(
  $$ update public.shared_tournaments
     set status = 'completed'
     where id = '20000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'a Co-organizer cannot complete a tournament'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$ update public.shared_tournaments
     set status = 'completed'
     where id = '20000000-0000-0000-0000-000000000001' $$,
  'the Owner can complete a tournament'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$ insert into public.shared_tournament_results (tournament_id, fixture_id, result_data, recorded_by)
     values ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '{"winner":0}', auth.uid()) $$,
  'an assigned Scorekeeper can record their match result'
);

select throws_ok(
  $$ insert into public.shared_tournament_results (tournament_id, fixture_id, result_data, recorded_by)
     values ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '{"winner":1}', auth.uid()) $$,
  '42501',
  null,
  'a Scorekeeper cannot record an unassigned result'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$ select public.revoke_tournament_membership(membership_id)
     from public.shared_tournament_member_list
     where tournament_id = '20000000-0000-0000-0000-000000000001'
       and membership_role = 'scorekeeper' $$,
  'a Co-organizer can revoke a Scorekeeper membership'
);

select * from finish();
rollback;
