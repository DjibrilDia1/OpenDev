-- Company profiles share the existing member permissions and RLS policies.
-- `company` remains the optional employer of an individual; company_name is identity.
alter table public.profiles
 add column account_type text not null default 'individual'
   check (account_type in ('individual', 'company')),
 add column company_name text;

create function public.normalize_profile_account_identity() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if new.account_type = 'company' then
   new.company_name := btrim(new.company_name);
   if new.company_name is null or char_length(new.company_name) not between 1 and 100
   or new.company_name !~ '[^[:space:]]' then
     raise exception 'A company name (1-100 characters) is required' using errcode = '23514';
   end if;
   new.full_name := new.company_name;
   new.first_name := '';
   new.last_name := '';
   new.experience_level := '';
   new.company := '';
 elsif new.account_type = 'individual' then
   new.company_name := null;
 end if;
 return new;
end $$;

create trigger normalize_profile_account_identity
before insert or update on public.profiles
for each row execute function public.normalize_profile_account_identity();

alter table public.profiles add constraint profile_account_identity_valid check (
 (account_type = 'individual' and company_name is null)
 or (account_type = 'company' and company_name is not null
     and char_length(company_name) between 1 and 100 and company_name = btrim(company_name)
     and company_name ~ '[^[:space:]]'
     and full_name = company_name and first_name = '' and last_name = ''
     and experience_level = '' and company = '')
);

-- Incomplete company names are allowed in owner-only drafts, as in the API.
alter table public.onboarding_drafts add constraint onboarding_draft_account_identity_valid check (
 (not (data ? 'account_type') or data->'account_type' = 'null'::jsonb
   or data->>'account_type' in ('individual', 'company'))
 and (not (data ? 'company_name') or data->'company_name' = 'null'::jsonb
   or (jsonb_typeof(data->'company_name') = 'string'
       and char_length(data->>'company_name') <= 100))
);

-- Auth metadata only supplies public identity. It never grants administration,
-- verification, moderation privileges or onboarding completion.
create or replace function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
 chosen_username text;
 chosen_account_type text := coalesce(new.raw_user_meta_data->>'account_type', 'individual');
 chosen_company_name text := btrim(new.raw_user_meta_data->>'company_name');
begin
 if chosen_account_type not in ('individual', 'company') then
   raise exception 'Invalid account type' using errcode = '23514';
 end if;
 if chosen_account_type = 'company' and
   (jsonb_typeof(new.raw_user_meta_data->'company_name') is distinct from 'string'
    or chosen_company_name is null or char_length(chosen_company_name) not between 1 and 100
    or chosen_company_name !~ '[^[:space:]]') then
   raise exception 'A company name (1-100 characters) is required' using errcode = '23514';
 end if;
 chosen_username := lower(btrim(coalesce(new.raw_user_meta_data->>'username','')));
 if chosen_username = '' then chosen_username := 'user-' || left(replace(new.id::text,'-',''),12);
 elsif not public.valid_profile_username(chosen_username) then
   raise exception 'Invalid username' using errcode = '23514';
 end if;
 insert into public.profiles(
   id, username, first_name, last_name, full_name, headline, bio, location,
   account_type, company_name
 ) values (
   new.id, chosen_username,
   left(btrim(coalesce(new.raw_user_meta_data->>'first_name','')),50),
   left(btrim(coalesce(new.raw_user_meta_data->>'last_name','')),50),
   case when chosen_account_type = 'company' then chosen_company_name
     else left(btrim(coalesce(new.raw_user_meta_data->>'full_name',
                             new.raw_user_meta_data->>'name','')),100) end,
   left(btrim(coalesce(new.raw_user_meta_data->>'headline','')),140),
   left(btrim(coalesce(new.raw_user_meta_data->>'bio','')),1000),
   left(btrim(coalesce(new.raw_user_meta_data->>'location','')),100),
   chosen_account_type,
   case when chosen_account_type = 'company' then chosen_company_name else null end
 ) on conflict(id) do nothing;
 return new;
end $$;

-- One transaction under the caller's identity still saves profile, preferences
-- and draft cleanup together; individual requirements remain unchanged.
create or replace function public.complete_onboarding(payload jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
 current_id uuid := auth.uid();
 chosen_interests text[];
 chosen_tags text[];
 chosen_account_type text := coalesce(payload->>'account_type', 'individual');
 chosen_company_name text := btrim(payload->>'company_name');
 chosen_full_name text;
 saved public.profiles;
begin
 if current_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 if jsonb_typeof(payload) is distinct from 'object'
 or public.valid_profile_username(payload->>'username') is not true
 or chosen_account_type not in ('individual', 'company')
 or char_length(btrim(coalesce(payload->>'headline',''))) not between 1 and 140
 or char_length(coalesce(payload->>'bio','')) > 1000
 or char_length(coalesce(payload->>'location','')) > 100
 or char_length(coalesce(payload->>'company','')) > 100
 or char_length(coalesce(payload->>'school','')) > 100 then
   raise exception 'Invalid profile' using errcode = '23514';
 end if;
 if chosen_account_type = 'company' then
   if jsonb_typeof(payload->'company_name') is distinct from 'string'
   or chosen_company_name is null or char_length(chosen_company_name) not between 1 and 100
   or chosen_company_name !~ '[^[:space:]]' then
     raise exception 'A company name (1-100 characters) is required' using errcode = '23514';
   end if;
   chosen_full_name := chosen_company_name;
 else
   if char_length(btrim(coalesce(payload->>'first_name',''))) not between 1 and 50
   or char_length(btrim(coalesce(payload->>'last_name',''))) not between 1 and 50
   or char_length(btrim(coalesce(payload->>'full_name',''))) not between 1 and 100 then
     raise exception 'Invalid profile' using errcode = '23514';
   end if;
   chosen_full_name := btrim(payload->>'full_name');
 end if;
 if exists (select 1 from unnest(array['avatar_url','website_url','github_url']) key
   where payload->>key is not null and
   (char_length(payload->>key)>2048 or payload->>key !~ '^https?://[^[:space:]]+$')) then
   raise exception 'Invalid profile URL' using errcode = '23514';
 end if;
 if jsonb_typeof(payload->'interests') is distinct from 'array'
 or jsonb_typeof(payload->'tags') is distinct from 'array' then
   raise exception 'Invalid preferences' using errcode = '23514';
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
 account_type = chosen_account_type,
 company_name = case when chosen_account_type = 'company' then chosen_company_name else null end,
 first_name = case when chosen_account_type = 'company' then '' else btrim(payload->>'first_name') end,
 last_name = case when chosen_account_type = 'company' then '' else btrim(payload->>'last_name') end,
 full_name = chosen_full_name, headline = btrim(payload->>'headline'),
 bio = coalesce(payload->>'bio',''), location = coalesce(payload->>'location',''),
 company = case when chosen_account_type = 'company' then '' else coalesce(payload->>'company','') end,
 school = coalesce(payload->>'school',''),
 experience_level = case when chosen_account_type = 'company' then ''
   else coalesce(payload->>'experience_level','') end,
 avatar_url = payload->>'avatar_url', website_url = payload->>'website_url',
 github_url = payload->>'github_url',
 tags = chosen_tags, onboarding_completed_at = coalesce(onboarding_completed_at, now())
 where id = current_id returning * into saved;
 if not found then raise exception 'Profile missing' using errcode = 'P0002'; end if;
 delete from public.onboarding_drafts where user_id = current_id;
 return to_jsonb(saved);
end $$;

create or replace view public.people_directory with (security_invoker = true) as
select p.id, p.username, p.full_name, p.headline, p.bio, p.avatar_url, p.location,
 (select count(*)::integer from public.posts post where post.author_id = p.id) as post_count,
 (select count(*)::integer from public.community_members cm where cm.user_id = p.id) as community_count,
 p.tags, p.cover_url, p.website_url, p.github_url,
 p.first_name, p.last_name, p.company, p.school, p.experience_level,
 p.account_type, p.company_name
from public.profiles p;

revoke all on function public.complete_onboarding(jsonb) from public, anon;
grant execute on function public.complete_onboarding(jsonb) to authenticated;
notify pgrst, 'reload schema';
