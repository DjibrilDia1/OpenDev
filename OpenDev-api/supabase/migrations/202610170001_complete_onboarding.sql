-- Public profile additions; interests and unfinished drafts remain private.
alter table public.profiles
  add column first_name text not null default '' check (char_length(first_name) <= 50),
  add column last_name text not null default '' check (char_length(last_name) <= 50),
  add column company text not null default '' check (char_length(company) <= 100),
  add column school text not null default '' check (char_length(school) <= 100),
  add column experience_level text not null default ''
    check (experience_level in ('', 'student', 'junior', 'intermediate', 'senior', 'lead'));

create table public.technology_catalog (
  name text primary key check (char_length(name) between 1 and 40),
  category text not null
);
create table public.interest_catalog (
  name text primary key check (char_length(name) between 1 and 60),
  position integer not null
);
insert into public.technology_catalog (name, category) values
 ('JavaScript','Langages'),('TypeScript','Langages'),('Python','Langages'),('Java','Langages'),
 ('C#','Langages'),('C++','Langages'),('Go','Langages'),('Rust','Langages'),('PHP','Langages'),
 ('Ruby','Langages'),('Swift','Langages'),('Kotlin','Langages'),('Dart','Langages'),
 ('HTML','Web'),('CSS','Web'),('React','Web'),('Vue','Web'),('Angular','Web'),('Svelte','Web'),
 ('Next.js','Web'),('Node.js','Backend'),('Express','Backend'),('FastAPI','Backend'),
 ('Django','Backend'),('Flask','Backend'),('Spring','Backend'),('Laravel','Backend'),
 ('PostgreSQL','Données'),('MySQL','Données'),('MongoDB','Données'),('Redis','Données'),
 ('Supabase','Données'),('SQL','Données'),('Docker','Infrastructure'),('Kubernetes','Infrastructure'),
 ('AWS','Infrastructure'),('Azure','Infrastructure'),('Google Cloud','Infrastructure'),
 ('Terraform','Infrastructure'),('Git','Outils'),('Linux','Outils'),('Figma','Design'),
 ('Flutter','Mobile'),('React Native','Mobile'),('TensorFlow','IA'),('PyTorch','IA'),
 ('Unity','Jeux'),('Unreal Engine','Jeux'),('Solidity','Web3'),('Tailwind CSS','Web'),
 ('Spring Boot','Backend'),('Machine Learning','IA'),('Deep Learning','IA'),
 ('NLP','IA'),('Computer Vision','IA'),('DevOps','Infrastructure');
insert into public.interest_catalog (name, position)
select name, ordinality from unnest(array[
 'Frontend','Backend','Full Stack','Intelligence artificielle','Machine Learning','Data Science',
 'DevOps','Cloud','Cybersécurité','Mobile','Open Source','UI/UX','Gaming','Web','Web3',
 'Startups','Entrepreneuriat','Architecture logicielle'
]) with ordinality as topics(name, ordinality);
alter table public.technology_catalog enable row level security;
alter table public.interest_catalog enable row level security;
revoke all on public.technology_catalog, public.interest_catalog from anon, authenticated;
grant select on public.technology_catalog, public.interest_catalog to anon, authenticated;
create policy technology_catalog_read on public.technology_catalog for select to anon, authenticated using (true);
create policy interest_catalog_read on public.interest_catalog for select to anon, authenticated using (true);

-- Validate against the catalog rather than maintaining a second topic list.
alter table public.profile_preferences drop constraint profile_interests_valid;
alter table public.profile_preferences add constraint profile_interests_valid check (
 cardinality(interests) between 1 and 8 and array_ndims(interests) = 1
 and array_position(interests, null) is null
);
create function public.check_profile_interests() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
 if exists (select 1 from unnest(new.interests) i
            where not exists (select 1 from public.interest_catalog c where c.name = i)) then
   raise exception 'Unknown interest' using errcode = '23514';
 end if;
 return new;
end $$;
create trigger validate_profile_interests before insert or update on public.profile_preferences
for each row execute function public.check_profile_interests();

create table public.onboarding_drafts (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 step smallint not null check (step between 0 and 5),
 data jsonb not null default '{}' check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 16384),
 updated_at timestamptz not null default now()
);
alter table public.onboarding_drafts enable row level security;
revoke all on public.onboarding_drafts from anon, authenticated;
grant select, insert, update, delete on public.onboarding_drafts to authenticated;
create policy onboarding_draft_own on public.onboarding_drafts for all to authenticated
 using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create function public.touch_onboarding_draft() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger onboarding_draft_updated before update on public.onboarding_drafts
for each row execute function public.touch_onboarding_draft();

create table public.follows (
 follower_id uuid not null references public.profiles(id) on delete cascade,
 followed_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (follower_id, followed_id),
 check (follower_id <> followed_id)
);
create index follows_followed_idx on public.follows (followed_id);
alter table public.follows enable row level security;
revoke all on public.follows from anon, authenticated;
grant select, insert, delete on public.follows to authenticated;
create policy follows_read_own on public.follows for select to authenticated using (follower_id = (select auth.uid()));
create policy follows_insert_own on public.follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy follows_delete_own on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

-- One invoker transaction: profile, preferences and draft cleanup succeed together.
create function public.complete_onboarding(payload jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
 current_id uuid := auth.uid();
 chosen_interests text[];
 chosen_tags text[];
 saved public.profiles;
begin
 if current_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 if jsonb_typeof(payload) <> 'object'
 or coalesce(payload->>'username','') !~ '^[a-z0-9_.-]{3,30}$'
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

create or replace view public.people_directory with (security_invoker = true) as
select p.id, p.username, p.full_name, p.headline, p.bio, p.avatar_url, p.location,
 (select count(*)::integer from public.posts post where post.author_id = p.id) as post_count,
 (select count(*)::integer from public.community_members cm where cm.user_id = p.id) as community_count,
 p.tags, p.cover_url, p.website_url, p.github_url,
 p.first_name, p.last_name, p.company, p.school, p.experience_level
from public.profiles p;
revoke all on function public.complete_onboarding(jsonb) from public, anon;
grant execute on function public.complete_onboarding(jsonb) to authenticated;

-- User metadata supplies public profile fields only, never permissions or completion.
create or replace function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare chosen_username text;
begin
 chosen_username := lower(btrim(coalesce(new.raw_user_meta_data->>'username','')));
 if chosen_username = '' then chosen_username := 'user-' || left(replace(new.id::text,'-',''),12);
 elsif chosen_username !~ '^[a-z0-9_.-]{3,30}$' then
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

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('profile-avatars','profile-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy profile_avatar_insert_own on storage.objects for insert to authenticated
with check (bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_avatar_select_own on storage.objects for select to authenticated
using (bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy profile_avatar_delete_own on storage.objects for delete to authenticated
using (bucket_id='profile-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
