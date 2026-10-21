-- Profile fields remain protected by the existing owner-only update policy.
create function public.valid_profile_skills(skills text[])
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(cardinality(skills) <= 10
    and (array_ndims(skills) is null or array_ndims(skills) = 1)
    and not exists (
      select 1 from unnest(skills) skill
      where skill is null or char_length(btrim(skill)) not between 1 and 40
    ), false);
$$;

alter table public.profiles
  add column tags text[] not null default '{}'::text[],
  add column cover_url text,
  add constraint profile_skills_valid check (public.valid_profile_skills(tags)),
  add constraint profile_cover_url_valid check (
    cover_url is null or (char_length(cover_url) <= 2048 and cover_url ~ '^https?://')
  );

-- Append columns to preserve the existing view's column ordering and grants.
create or replace view public.people_directory with (security_invoker = true) as
select p.id, p.username, p.full_name, p.headline, p.bio, p.avatar_url, p.location,
       (select count(*)::integer from public.posts post where post.author_id = p.id) as post_count,
       (select count(*)::integer from public.community_members cm where cm.user_id = p.id) as community_count,
       p.tags, p.cover_url, p.website_url, p.github_url
from public.profiles p;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-covers', 'profile-covers', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy profile_cover_insert_own on storage.objects
for insert to authenticated with check (
  bucket_id = 'profile-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy profile_cover_select_own on storage.objects
for select to authenticated using (
  bucket_id = 'profile-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy profile_cover_delete_own on storage.objects
for delete to authenticated using (
  bucket_id = 'profile-covers'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
