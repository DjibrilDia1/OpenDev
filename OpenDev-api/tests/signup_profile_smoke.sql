-- Development only: all accounts and changes are rolled back.
begin;
set local statement_timeout = '20s';
select set_config('opendev.signup_user', gen_random_uuid()::text, true);
insert into auth.users (id, raw_user_meta_data)
values (
    current_setting('opendev.signup_user')::uuid,
    '{"full_name":"  Ada Lovelace  ","headline":"  Développeuse  ",
      "bio":"Une bio enregistrée","location":"Londres","role":"admin","username":"ada.lovelace"}'
);
do $$
begin
    if not exists (
        select 1 from public.profiles
        where id = current_setting('opendev.signup_user')::uuid
          and full_name = 'Ada Lovelace' and headline = 'Développeuse'
          and bio = 'Une bio enregistrée' and location = 'Londres'
          and username = 'ada.lovelace'
    ) then raise exception 'Registration metadata was not safely persisted'; end if;
end $$;
-- OAuth accounts without a headline remain incomplete, ready for onboarding.
select set_config('opendev.oauth_user', gen_random_uuid()::text, true);
insert into auth.users (id, raw_user_meta_data)
values (current_setting('opendev.oauth_user')::uuid, '{"name":"OAuth member"}');
do $$
begin
    if not exists (select 1 from public.profiles
                   where id = current_setting('opendev.oauth_user')::uuid
                     and full_name = 'OAuth member' and headline = '')
    then raise exception 'OAuth default profile is incorrect'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('opendev.oauth_user'), true);
update public.profiles set headline = 'Développeur Python'
where id = auth.uid();
do $$
declare affected integer;
begin
    update public.profiles set headline = 'Unauthorized'
    where id = current_setting('opendev.signup_user')::uuid;
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'Another member can modify this profile'; end if;
end $$;
rollback;
select 'PASS: signup fields, OAuth onboarding and profile isolation; no fixtures retained' as result;
