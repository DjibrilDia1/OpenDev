-- Development verification. Every fixture and write is rolled back.
begin;
set local statement_timeout = '20s';
select set_config('opendev.onboarding_a', gen_random_uuid()::text, true);
select set_config('opendev.onboarding_b', gen_random_uuid()::text, true);
insert into auth.users (id, raw_user_meta_data) values
 (current_setting('opendev.onboarding_a')::uuid, '{}'),
 (current_setting('opendev.onboarding_b')::uuid, '{}');
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('opendev.onboarding_a'), true);
insert into public.onboarding_drafts(user_id, step, data) values(auth.uid(), 2, '{"tags":["React"]}');
insert into public.profile_preferences(user_id, interests) values(auth.uid(), array['Frontend']);
insert into public.follows(follower_id, followed_id) values(auth.uid(), current_setting('opendev.onboarding_b')::uuid);

select set_config('request.jwt.claim.sub', current_setting('opendev.onboarding_b'), true);
do $$
declare affected integer;
begin
 if exists(select 1 from public.onboarding_drafts) or exists(select 1 from public.profile_preferences)
    or exists(select 1 from public.follows) then raise exception 'Private data visible to another user'; end if;
 update public.onboarding_drafts set step=5 where user_id=current_setting('opendev.onboarding_a')::uuid;
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'Foreign draft modified'; end if;
 delete from public.follows where follower_id=current_setting('opendev.onboarding_a')::uuid;
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'Foreign follow deleted'; end if;
 begin
   insert into public.follows(follower_id,followed_id) values(current_setting('opendev.onboarding_a')::uuid,auth.uid());
   raise exception 'Spoofed follower accepted';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.follows(follower_id,followed_id) values(auth.uid(),auth.uid());
   raise exception 'Self-follow accepted';
 exception when check_violation then null; end;
end $$;

select set_config('request.jwt.claim.sub', current_setting('opendev.onboarding_a'), true);
do $$
declare payload jsonb;
begin
 payload := jsonb_build_object('username','e2e-'||left(auth.uid()::text,8),
 'first_name','Ada','last_name','Lovelace','full_name','Ada Lovelace','headline','Developer',
 'tags',jsonb_build_array('React'),'interests',jsonb_build_array('Frontend'));
 begin
   perform public.complete_onboarding(payload || '{"interests":["not-in-catalog"]}'::jsonb);
   raise exception 'Invalid preference accepted';
 exception when check_violation then null; end;
 if not exists(select 1 from public.onboarding_drafts where user_id=auth.uid())
 or exists(select 1 from public.profiles where id=auth.uid() and onboarding_completed_at is not null)
 then raise exception 'Failed completion was not atomic'; end if;
 perform public.complete_onboarding(payload);
 if exists(select 1 from public.onboarding_drafts where user_id=auth.uid())
 or not exists(select 1 from public.profiles where id=auth.uid() and onboarding_completed_at is not null and tags=array['React'])
 then raise exception 'Completion did not persist atomically'; end if;
 delete from public.follows where follower_id=auth.uid();
 if exists(select 1 from public.follows) then raise exception 'Own unfollow failed'; end if;
end $$;
rollback;
select 'PASS: draft/preference privacy, follow ownership, self-follow guard, atomic completion; rolled back' as result;
