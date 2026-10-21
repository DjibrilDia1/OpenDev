-- Run on an isolated local OpenDev database before provisioning its real catalogue.
-- Every account/community below is transactional and all writes are rolled back.
begin;
set local statement_timeout = '20s';
do $$
begin
    if exists (select 1 from public.communities where slug in (
        'react', 'python', 'design-systems', 'open-source', 'typescript', 'fastapi',
        'ia-data', 'devops-cloud', 'mobile', 'creative-coding', 'gamedev', 'security')) then
        raise exception 'Run this fixture on an isolated local database before provisioning';
    end if;
    begin
        perform public.provision_official_communities(null);
        raise exception 'Bootstrap accepted a missing administrator';
    exception when invalid_parameter_value then null;
    end;
end $$;
select set_config('opendev.official_owner', gen_random_uuid()::text, true);
select set_config('opendev.official_member', gen_random_uuid()::text, true);
insert into auth.users (id, raw_user_meta_data)
values (current_setting('opendev.official_owner')::uuid, '{"full_name":"Official owner fixture"}'),
       (current_setting('opendev.official_member')::uuid, '{"full_name":"Official member fixture"}');

-- A pre-existing member community must never be silently claimed by the operator.
insert into public.communities (slug, name, description, created_by)
values ('react', 'Member-owned fixture', 'Must not be claimed',
        current_setting('opendev.official_member')::uuid);
do $$
begin
    begin
        perform public.provision_official_communities(current_setting('opendev.official_owner')::uuid);
        raise exception 'Bootstrap claimed a pre-existing member community';
    exception when unique_violation then null;
    end;
    if (select count(*) from public.communities where created_by =
            current_setting('opendev.official_owner')::uuid) <> 0 then
        raise exception 'A conflicting bootstrap partially inserted the catalogue';
    end if;
end $$;
delete from public.communities
where slug = 'react' and created_by = current_setting('opendev.official_member')::uuid;

do $$
declare created_count integer;
begin
    select count(*) into created_count
    from public.provision_official_communities(current_setting('opendev.official_owner')::uuid)
    where created;
    if created_count <> 12 then raise exception 'The catalogue must create 12 communities'; end if;
    select count(*) into created_count
    from public.provision_official_communities(current_setting('opendev.official_owner')::uuid)
    where created;
    if created_count <> 0 then raise exception 'Bootstrap is not idempotent'; end if;
    begin
        perform public.provision_official_communities(current_setting('opendev.official_member')::uuid);
        raise exception 'Bootstrap transferred existing official communities to a different owner';
    exception when unique_violation then null;
    end;
    if (select count(*) from public.community_members m join public.communities c on c.id = m.community_id
        where c.is_official and c.created_by = current_setting('opendev.official_owner')::uuid
          and m.user_id = c.created_by and m.role = 'owner') <> 12 then
        raise exception 'Official owner memberships are missing';
    end if;
    if exists (select 1 from public.posts where author_id in (
        current_setting('opendev.official_owner')::uuid,
        current_setting('opendev.official_member')::uuid)) then
        raise exception 'Bootstrap created synthetic posts';
    end if;
end $$;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
    if (select count(*) from public.community_directory where is_official and category is not null) <> 12 then
        raise exception 'Anonymous discovery cannot read the official catalogue';
    end if;
    if has_function_privilege(current_user, 'public.provision_official_communities(uuid)', 'EXECUTE') then
        raise exception 'Anonymous users can invoke operator provisioning';
    end if;
    if has_function_privilege('service_role', 'public.provision_official_communities(uuid)', 'EXECUTE') then
        raise exception 'The API service role can invoke operator provisioning';
    end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('opendev.official_member'), true);
select set_config('request.jwt.claims', json_build_object(
    'sub', current_setting('opendev.official_member'), 'role', 'authenticated')::text, true);
do $$
declare affected integer;
begin
    begin
        perform public.provision_official_communities(auth.uid());
        raise exception 'An authenticated user can invoke operator provisioning';
    exception when insufficient_privilege then null;
    end;
    update public.communities set description = 'Unauthorized'
    where slug = 'react';
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'A member edited the official community'; end if;
    delete from public.communities where slug = 'react';
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'A member deleted the official community'; end if;
    begin
        insert into public.communities (slug, name, description, created_by, is_official)
        values ('spoof-' || auth.uid(), 'Spoof fixture', 'Should be denied', auth.uid(), true);
        raise exception 'An authenticated user forged an official badge';
    exception when insufficient_privilege then null;
    end;
end $$;
insert into public.communities (slug, name, description, created_by)
values ('ordinary-' || auth.uid(), 'Ordinary fixture', 'Normal community', auth.uid());
do $$
begin
    begin
        update public.communities set is_official = true where created_by = auth.uid();
        raise exception 'An ordinary owner promoted their community to official';
    exception when insufficient_privilege then null;
    end;
end $$;
insert into public.community_members (community_id, user_id, role)
select id, auth.uid(), 'member' from public.communities where slug = 'react';
do $$
begin
    if not exists (select 1 from public.community_directory where slug = 'react' and member_count = 2) then
        raise exception 'Real member counts were not updated after joining';
    end if;
end $$;
delete from public.community_members
where user_id = auth.uid() and community_id = (select id from public.communities where slug = 'react');
do $$
begin
    if not exists (select 1 from public.community_directory where slug = 'react' and member_count = 1) then
        raise exception 'A user could not leave the official community';
    end if;
end $$;

select set_config('request.jwt.claim.sub', current_setting('opendev.official_owner'), true);
select set_config('request.jwt.claims', json_build_object(
    'sub', current_setting('opendev.official_owner'), 'role', 'authenticated')::text, true);
do $$
declare affected integer;
begin
    update public.communities set description = 'Edited by the administrator', category = 'Frontend'
    where slug = 'react';
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'The administrator could not edit their community'; end if;
    begin
        update public.communities set is_official = false where slug = 'react';
        raise exception 'An authenticated owner changed operator-controlled official status';
    exception when insufficient_privilege then null;
    end;
end $$;
reset role;
-- Replay must not overwrite a description edited through the ordinary owner API.
select count(*) from public.provision_official_communities(current_setting('opendev.official_owner')::uuid);
do $$
begin
    if not exists (select 1 from public.communities where slug = 'react'
                   and description = 'Edited by the administrator') then
        raise exception 'Bootstrap replay overwrote an administrator edit';
    end if;
end $$;
rollback;
select 'PASS: official catalogue, operator-only bootstrap, collision safety, owner isolation, join/leave; fixtures rolled back' as result;
