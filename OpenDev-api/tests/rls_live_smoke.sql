-- Development smoke check. All fixtures and writes are rolled back.
begin;
set local statement_timeout = '20s';
select set_config('opendev.test_user_a', gen_random_uuid()::text, true);
select set_config('opendev.test_user_b', gen_random_uuid()::text, true);
select set_config('opendev.test_community', gen_random_uuid()::text, true);
select set_config('opendev.test_post', gen_random_uuid()::text, true);
insert into auth.users (id, raw_user_meta_data)
values (current_setting('opendev.test_user_a')::uuid, '{"full_name":"Integration test A"}'),
       (current_setting('opendev.test_user_b')::uuid, '{"full_name":"Integration test B"}');

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('opendev.test_user_a'), true);
insert into public.communities (id, slug, name, description, created_by)
values (current_setting('opendev.test_community')::uuid,
        'integration-' || current_setting('opendev.test_community'),
        'Transactional integration check', 'Fixture rolled back at the end', auth.uid());
insert into public.posts (id, author_id, community_id, title, body)
values (current_setting('opendev.test_post')::uuid, auth.uid(),
        current_setting('opendev.test_community')::uuid, 'Integration check', 'Original body');

select set_config('request.jwt.claim.sub', current_setting('opendev.test_user_b'), true);
do $$
declare affected integer;
begin
    update public.posts set body = 'Unauthorized edit'
    where id = current_setting('opendev.test_post')::uuid;
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'Another author can modify this post'; end if;
    begin
        insert into public.posts (author_id, community_id, title, body)
        values (auth.uid(), current_setting('opendev.test_community')::uuid, 'Blocked', 'Non-member');
        raise exception 'A non-member can publish in the community';
    exception when insufficient_privilege then null;
    end;
end $$;
insert into public.community_members (community_id, user_id, role)
values (current_setting('opendev.test_community')::uuid, auth.uid(), 'member');
insert into public.posts (author_id, community_id, title, body)
values (auth.uid(), current_setting('opendev.test_community')::uuid, 'Member post', 'Allowed');
insert into public.comments (post_id, author_id, body)
values (current_setting('opendev.test_post')::uuid, auth.uid(), 'A real database reply');
insert into public.post_reactions (post_id, user_id)
values (current_setting('opendev.test_post')::uuid, auth.uid());
do $$
begin
    if not exists (select 1 from public.post_directory
                   where id = current_setting('opendev.test_post')::uuid
                     and body = 'Original body' and comment_count = 1 and like_count = 1)
    then raise exception 'Feed aggregation or author isolation failed'; end if;
end $$;
rollback;
select 'PASS: member publishing, author isolation, replies and likes; fixtures rolled back' as result;
