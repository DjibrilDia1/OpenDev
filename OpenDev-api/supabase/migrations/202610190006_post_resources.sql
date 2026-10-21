-- Public post attachments are immutable objects. Existing posts keep [] and
-- all ordinary post operations retain the caller's identity and existing RLS.
alter table public.posts add column resources jsonb not null default '[]'::jsonb
 check (jsonb_typeof(resources) = 'array' and jsonb_array_length(resources) <= 6);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-resources', 'post-resources', true, 10485760,
 array['image/jpeg','image/png','image/webp','application/pdf','text/plain','text/markdown']);

create policy post_resource_insert_own on storage.objects for insert to authenticated
with check (
 bucket_id = 'post-resources'
 and (storage.foldername(name))[1] = (select auth.uid())::text
 and owner_id = (select auth.uid())::text
 and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf|txt|md)$'
);
create policy post_resource_public_read on storage.objects for select to anon, authenticated
using (bucket_id = 'post-resources');
-- Deliberately no UPDATE or DELETE policy for this bucket: published references
-- cannot be replaced or broken by another upload, overwrite or cleanup request.

create function public.validate_post_resources() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
 resource jsonb;
 resource_kind text;
 resource_path text;
 resource_mime text;
 resource_size bigint;
 object_metadata jsonb;
 image_count integer := 0;
 document_count integer := 0;
 seen_paths text[] := '{}';
begin
 if new.resources is null or jsonb_typeof(new.resources) is distinct from 'array'
 or jsonb_array_length(new.resources) > 6 then
   raise exception 'A post supports at most 6 resources' using errcode = '23514';
 end if;
 for resource in select value from jsonb_array_elements(new.resources)
 loop
   if jsonb_typeof(resource) is distinct from 'object' then
     raise exception 'Invalid post resource' using errcode = '23514';
   end if;
   resource_kind := resource->>'kind';
   if resource_kind = 'link' then
     if resource - array['kind','url','title'] <> '{}'::jsonb
     or jsonb_typeof(resource->'url') is distinct from 'string'
     or char_length(resource->>'url') > 2048
     or resource->>'url' !~ '^https?://[^/?#[:space:]<>"]+([/?#][^[:space:]<>"]*)?$'
     or jsonb_typeof(resource->'title') is distinct from 'string'
     or char_length(btrim(resource->>'title')) not between 1 and 180
     or resource->>'title' !~ '[^[:space:]]' then
       raise exception 'Invalid post link' using errcode = '23514';
     end if;
   elsif resource_kind in ('image', 'document') then
     if resource - array['kind','path','name','mime_type','size'] <> '{}'::jsonb
     or jsonb_typeof(resource->'path') is distinct from 'string'
     or jsonb_typeof(resource->'name') is distinct from 'string'
     or char_length(btrim(resource->>'name')) not between 1 and 180
     or resource->>'name' !~ '[^[:space:]]'
     or jsonb_typeof(resource->'mime_type') is distinct from 'string'
     or jsonb_typeof(resource->'size') is distinct from 'number'
     or resource->>'size' !~ '^[1-9][0-9]{0,7}$' then
       raise exception 'Invalid post file' using errcode = '23514';
     end if;
     resource_path := resource->>'path';
     resource_mime := resource->>'mime_type';
     resource_size := (resource->>'size')::bigint;
     if resource_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf|txt|md)$'
     or split_part(resource_path, '/', 1) <> new.author_id::text
     or resource_path = any(seen_paths) then
       raise exception 'Invalid post file path' using errcode = '23514';
     end if;
     seen_paths := array_append(seen_paths, resource_path);
     if resource_kind = 'image' then
       image_count := image_count + 1;
       if image_count > 4 or resource_size > 5242880
       or not ((resource_mime = 'image/jpeg' and resource_path ~ '\.(jpg|jpeg)$')
         or (resource_mime = 'image/png' and resource_path ~ '\.png$')
         or (resource_mime = 'image/webp' and resource_path ~ '\.webp$')) then
         raise exception 'Invalid image or image limit exceeded' using errcode = '23514';
       end if;
     else
       document_count := document_count + 1;
       if document_count > 2 or resource_size > 10485760
       or not ((resource_mime = 'application/pdf' and resource_path ~ '\.pdf$')
         or (resource_mime = 'text/plain' and resource_path ~ '\.txt$')
         or (resource_mime = 'text/markdown' and resource_path ~ '\.md$')) then
         raise exception 'Invalid document or document limit exceeded' using errcode = '23514';
       end if;
     end if;
     -- This narrow definer lookup sees Storage metadata without transferring a
     -- privileged key to the application. An object must exist and belong to
     -- the post's author; a copied public URL/path never establishes ownership.
     select o.metadata into object_metadata from storage.objects o
       where o.bucket_id = 'post-resources' and o.name = resource_path
         and o.owner_id = new.author_id::text;
     if not found then
       raise exception 'Post file is missing or belongs to another account' using errcode = '23514';
     end if;
     if object_metadata->>'mimetype' is distinct from resource_mime
     or coalesce(object_metadata->>'size','') !~ '^[1-9][0-9]{0,7}$' then
       raise exception 'Post file metadata mismatch' using errcode = '23514';
     end if;
     if (object_metadata->>'size')::bigint <> resource_size then
       raise exception 'Post file size mismatch' using errcode = '23514';
     end if;
   else
     raise exception 'Unknown post resource kind' using errcode = '23514';
   end if;
 end loop;
 return new;
end $$;
revoke all on function public.validate_post_resources()
 from public, anon, authenticated, service_role;
create trigger posts_validate_resources before insert or update on public.posts
 for each row execute function public.validate_post_resources();

create or replace view public.post_directory with (security_invoker = true) as
select p.id, p.author_id, profile.username as author_username, profile.full_name as author_name,
 profile.avatar_url as author_avatar_url, p.community_id, community.slug as community_slug,
 community.name as community_name, p.post_type, p.title, p.body, p.code_language,
 p.code_snippet, p.tags, p.created_at, p.updated_at,
 (select count(*)::integer from public.comments c where c.post_id = p.id) as comment_count,
 (select count(*)::integer from public.post_reactions r where r.post_id = p.id) as like_count,
 community.archived_at as community_archived_at,
 p.resources
from public.posts p join public.profiles profile on profile.id = p.author_id
left join public.communities community on community.id = p.community_id;

-- saved_post_page already builds to_jsonb(post_directory), including new fields.
notify pgrst, 'reload schema';
