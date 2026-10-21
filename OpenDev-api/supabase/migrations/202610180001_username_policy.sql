-- Usernames are lowercase display names: allow Unicode and punctuation, 1-30 characters.
-- Existing case-insensitive uniqueness is preserved; user RLS policies are unchanged.
create function public.valid_profile_username(value text) returns boolean
language sql immutable strict set search_path = '' as $$
 select char_length(value) between 1 and 30
    and value = btrim(value)
    and value = lower(value)
$$;

-- The existing lower(username) unique index makes this normalization collision-safe.
alter table public.profiles drop constraint profiles_username_check;
update public.profiles set username = lower(username) where username <> lower(username);
alter table public.profiles add constraint profiles_username_check
 check (public.valid_profile_username(username));

create or replace function public.complete_onboarding(payload jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
 current_id uuid := auth.uid();
 chosen_interests text[];
 chosen_tags text[];
 saved public.profiles;
begin
 if current_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 if jsonb_typeof(payload) <> 'object'
 or not public.valid_profile_username(payload->>'username')
 or char_length(btrim(coalesce(payload->>'first_name',''))) not between 1 and 50
 or char_length(btrim(coalesce(payload->>'last_name',''))) not between 1 and 50
 or char_length(btrim(coalesce(payload->>'full_name',''))) not between 1 and 100
 or char_length(btrim(coalesce(payload->>'headline',''))) not between 1 and 140
 or char_length(coalesce(payload->>'bio','')) > 1000
 or char_length(coalesce(payload->>'location','')) > 100 then
   raise exception 'Invalid profile' using errcode = '23514';
 end if;
 if exists (select 1 from unnest(array['avatar_url','website_url','github_url']) key
   where payload->>key is not null and
   (char_length(payload->>key)>2048 or payload->>key !~ '^https?://[^[:space:]]+$')) then
   raise exception 'Invalid profile URL' using errcode = '23514';
 end if;
 select array_agg(value) into chosen_interests from jsonb_array_elements_text(payload->'interests');
 select array_agg(value) into chosen_tags from jsonb_array_elements_text(payload->'tags');
 if coalesce(cardinality(chosen_tags),0) not between 1 and 10
 or not public.valid_profile_skills(chosen_tags) then
   raise exception 'Invalid technologies' using errcode = '23514';
 end if;
 insert into public.profile_preferences(user_id, interests) values (current_id, chosen_interests)
 on conflict (user_id) do update set interests = excluded.interests;
 update public.profiles set username = payload->>'username',
 first_name = btrim(payload->>'first_name'), last_name = btrim(payload->>'last_name'),
 full_name = btrim(payload->>'full_name'), headline = btrim(payload->>'headline'),
 bio = coalesce(payload->>'bio',''), location = coalesce(payload->>'location',''),
 company = coalesce(payload->>'company',''), school = coalesce(payload->>'school',''),
 experience_level = coalesce(payload->>'experience_level',''),
 avatar_url = payload->>'avatar_url', website_url = payload->>'website_url', github_url = payload->>'github_url',
 tags = chosen_tags, onboarding_completed_at = coalesce(onboarding_completed_at, now())
 where id = current_id returning * into saved;
 if not found then raise exception 'Profile missing' using errcode = 'P0002'; end if;
 delete from public.onboarding_drafts where user_id = current_id;
 return to_jsonb(saved);
end $$;

create or replace function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare chosen_username text;
begin
 chosen_username := lower(btrim(coalesce(new.raw_user_meta_data->>'username','')));
 if chosen_username = '' then chosen_username := 'user-' || left(replace(new.id::text,'-',''),12);
 elsif not public.valid_profile_username(chosen_username) then
   raise exception 'Invalid username' using errcode = '23514';
 end if;
 insert into public.profiles(id, username, first_name, last_name, full_name, headline, bio, location)
 values (new.id, chosen_username,
 left(btrim(coalesce(new.raw_user_meta_data->>'first_name','')),50),
 left(btrim(coalesce(new.raw_user_meta_data->>'last_name','')),50),
 left(btrim(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name','')),100),
 left(btrim(coalesce(new.raw_user_meta_data->>'headline','')),140),
 left(btrim(coalesce(new.raw_user_meta_data->>'bio','')),1000),
 left(btrim(coalesce(new.raw_user_meta_data->>'location','')),100))
 on conflict(id) do nothing;
 return new;
end $$;

