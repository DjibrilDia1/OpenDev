-- Community channels subdivide existing public discussions. Caller JWTs and
-- the existing author/member policies on posts/comments remain authoritative.
create table public.community_channels (
 id uuid primary key default gen_random_uuid(),
 community_id uuid not null references public.communities(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 50
   and name = btrim(name) and name ~ '[^[:space:]]'),
 description text not null default '' check (char_length(description) <= 240),
 position integer not null default 0 check (position between 0 and 1000),
 is_default boolean not null default false,
 is_read_only boolean not null default false,
 archived_at timestamptz,
 created_at timestamptz not null default now(),
 unique (id, community_id),
 check (not is_default or archived_at is null)
);
create unique index community_channel_name_unique
 on public.community_channels (community_id, lower(btrim(name)));
create unique index community_channel_default_unique
 on public.community_channels (community_id) where is_default;
create index community_channels_list_idx
 on public.community_channels (community_id, position, created_at, id);

alter table public.community_channels enable row level security;
revoke all on public.community_channels from public, anon, authenticated;
grant select on public.community_channels to anon, authenticated;
create policy community_channels_public_read on public.community_channels
 for select to anon, authenticated using (exists (
   select 1 from public.communities c where c.id = community_id and c.archived_at is null
 ));
-- All mutations use guarded RPCs. No INSERT/UPDATE/DELETE grants or policies
-- let a direct Data API request bypass the parent lock, limits or permissions.

create function public.guard_community_channel() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if tg_op = 'DELETE' then
   -- Community deletion cascades only after its parent row has disappeared.
   if old.is_default and exists (
     select 1 from public.communities c where c.id = old.community_id
   ) then
     raise exception 'The default channel cannot be deleted' using errcode = 'PT409';
   end if;
   return old;
 end if;
 if tg_op = 'UPDATE' then
   if new.id <> old.id or new.community_id <> old.community_id
   or new.is_default <> old.is_default or new.created_at <> old.created_at then
     raise exception 'Channel identity cannot be changed' using errcode = '23514';
   end if;
   if old.is_default and new.archived_at is not null then
     raise exception 'The default channel cannot be archived' using errcode = 'PT409';
   end if;
 end if;
 -- Serializes all additions/restorations in one community, including operator
 -- writes and automatic defaults, so the 50-active-channel cap is race safe.
 perform 1 from public.communities c where c.id = new.community_id for update;
 if new.archived_at is null and (
   select count(*) from public.community_channels ch
   where ch.community_id = new.community_id and ch.archived_at is null and ch.id <> new.id
 ) >= 50 then
   raise exception 'A community supports at most 50 active channels' using errcode = 'PT409';
 end if;
 return new;
end $$;
revoke all on function public.guard_community_channel()
 from public, anon, authenticated, service_role;
create trigger community_channels_guard before insert or update or delete
 on public.community_channels for each row execute function public.guard_community_channel();

insert into public.community_channels (community_id, name, is_default)
 select c.id, 'Général', true from public.communities c;

create function public.create_default_community_channel() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.community_channels (community_id, name, is_default)
 values (new.id, 'Général', true);
 return new;
end $$;
revoke all on function public.create_default_community_channel()
 from public, anon, authenticated, service_role;
create trigger community_default_channel after insert on public.communities
 for each row execute function public.create_default_community_channel();

alter table public.posts add column channel_id uuid;
alter table public.posts add constraint post_channel_same_community
 foreign key (channel_id, community_id) references public.community_channels (id, community_id);
alter table public.posts add constraint general_feed_has_no_channel
 check (community_id is not null or channel_id is null);
create index posts_channel_created_idx on public.posts (channel_id, created_at desc, id desc)
 where channel_id is not null;

-- The existing archival guard deliberately rejects any UPDATE to an archived
-- community's post. Preserve those rows; their channel_id stays null/history.
update public.posts p set channel_id = ch.id
 from public.community_channels ch, public.communities c
 where p.community_id = c.id and c.archived_at is null
 and ch.community_id = c.id and ch.is_default and p.channel_id is null;

create function public.community_channel_check_input(p_data jsonb, p_create boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
 if jsonb_typeof(p_data) is distinct from 'object' or p_data = '{}'::jsonb
 or p_data - array['name','description','position','is_read_only','archived'] <> '{}'::jsonb
 or (p_create and (not (p_data ? 'name') or p_data ? 'archived')) then
   raise exception 'Invalid channel fields' using errcode = '23514';
 end if;
 if p_data ? 'name' and (
   jsonb_typeof(p_data->'name') is distinct from 'string'
   or char_length(btrim(p_data->>'name')) not between 1 and 50
   or p_data->>'name' !~ '[^[:space:]]'
 ) then raise exception 'Invalid channel name' using errcode = '23514'; end if;
 if p_data ? 'description' and (
   jsonb_typeof(p_data->'description') is distinct from 'string'
   or char_length(p_data->>'description') > 240
 ) then raise exception 'Invalid channel description' using errcode = '23514'; end if;
 if p_data ? 'position' then
   if jsonb_typeof(p_data->'position') is distinct from 'number'
   or p_data->>'position' !~ '^(0|[1-9][0-9]{0,3})$' then
     raise exception 'Invalid channel position' using errcode = '23514';
   end if;
   if (p_data->>'position')::integer > 1000 then
     raise exception 'Invalid channel position' using errcode = '23514';
   end if;
 end if;
 if (p_data ? 'is_read_only' and jsonb_typeof(p_data->'is_read_only') is distinct from 'boolean')
 or (p_data ? 'archived' and jsonb_typeof(p_data->'archived') is distinct from 'boolean') then
   raise exception 'Invalid channel flag' using errcode = '23514';
 end if;
end $$;
revoke all on function public.community_channel_check_input(jsonb, boolean)
 from public, anon, authenticated, service_role;

create function public.community_channel_create(p_community_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.community_channels;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 perform 1 from public.communities c where c.id = p_community_id and c.archived_at is null for update;
 if not found then raise exception 'Community not found' using errcode = 'PT404'; end if;
 if not public.community_has_permission(p_community_id, 'edit_community') then
   raise exception 'Community editing permission required' using errcode = '42501';
 end if;
 perform public.community_channel_check_input(p_data, true);
 insert into public.community_channels (community_id, name, description, position, is_read_only)
 values (p_community_id, btrim(p_data->>'name'), coalesce(p_data->>'description',''),
   coalesce((p_data->>'position')::integer,0), coalesce((p_data->>'is_read_only')::boolean,false))
 returning * into saved;
 return to_jsonb(saved);
end $$;

create function public.community_channel_update(p_community_id uuid, p_channel_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.community_channels;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 perform 1 from public.communities c where c.id = p_community_id and c.archived_at is null for update;
 if not found then raise exception 'Community not found' using errcode = 'PT404'; end if;
 if not public.community_has_permission(p_community_id, 'edit_community') then
   raise exception 'Community editing permission required' using errcode = '42501';
 end if;
 perform public.community_channel_check_input(p_data, false);
 select * into saved from public.community_channels ch
 where ch.id = p_channel_id and ch.community_id = p_community_id for update;
 if not found then raise exception 'Community channel not found' using errcode = 'PT404'; end if;
 update public.community_channels set
 name = case when p_data ? 'name' then btrim(p_data->>'name') else name end,
 description = case when p_data ? 'description' then p_data->>'description' else description end,
 position = case when p_data ? 'position' then (p_data->>'position')::integer else position end,
 is_read_only = case when p_data ? 'is_read_only' then (p_data->>'is_read_only')::boolean else is_read_only end,
 archived_at = case when p_data ? 'archived' then
   case when (p_data->>'archived')::boolean then coalesce(archived_at, clock_timestamp()) else null end
   else archived_at end
 where id = p_channel_id and community_id = p_community_id returning * into saved;
 return to_jsonb(saved);
end $$;

create function public.community_channel_delete(p_community_id uuid, p_channel_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.community_channels;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 perform 1 from public.communities c where c.id = p_community_id and c.archived_at is null for update;
 if not found then raise exception 'Community not found' using errcode = 'PT404'; end if;
 if not public.community_has_permission(p_community_id, 'edit_community') then
   raise exception 'Community editing permission required' using errcode = '42501';
 end if;
 select * into target from public.community_channels ch
 where ch.id = p_channel_id and ch.community_id = p_community_id for update;
 if not found then raise exception 'Community channel not found' using errcode = 'PT404'; end if;
 if target.is_default then
   raise exception 'The default channel cannot be deleted' using errcode = 'PT409';
 end if;
 if exists (select 1 from public.posts p where p.channel_id = p_channel_id) then
   raise exception 'Archive this channel to preserve its publications' using errcode = 'PT409';
 end if;
 delete from public.community_channels where id = p_channel_id and community_id = p_community_id;
end $$;

revoke all on function public.community_channel_create(uuid,jsonb),
 public.community_channel_update(uuid,uuid,jsonb), public.community_channel_delete(uuid,uuid)
 from public, anon, authenticated, service_role;
grant execute on function public.community_channel_create(uuid,jsonb),
 public.community_channel_update(uuid,uuid,jsonb), public.community_channel_delete(uuid,uuid)
 to authenticated;

-- Narrow internal helper: the parent/channel SHARE locks serialize publication
-- and reply writes with channel changes. No authorization is conveyed by a
-- client-supplied channel id or by the function's owner role.
create function public.assert_community_channel_write(
 p_community_id uuid, p_channel_id uuid, p_existing boolean
) returns void language plpgsql security definer set search_path = '' as $$
declare target public.community_channels; privileged boolean;
begin
 perform 1 from public.communities c
 where c.id = p_community_id and c.archived_at is null for share;
 if not found then raise exception 'Community is unavailable' using errcode = 'PT409'; end if;
 if p_channel_id is null then return; end if;
 select * into target from public.community_channels ch
 where ch.id = p_channel_id and ch.community_id = p_community_id for share;
 if not found then raise exception 'Community channel not found' using errcode = 'PT404'; end if;
 privileged := public.community_has_permission(p_community_id, 'edit_community')
   or public.community_has_permission(p_community_id, 'moderate_posts');
 if target.archived_at is not null then
   if not p_existing then
     raise exception 'Restore the channel before creating new content' using errcode = 'PT409';
   end if;
   if not privileged then
     raise exception 'Channel is archived' using errcode = '42501';
   end if;
 end if;
 if target.is_read_only and not privileged then
   raise exception 'Channel is read only' using errcode = '42501';
 end if;
end $$;
revoke all on function public.assert_community_channel_write(uuid,uuid,boolean)
 from public, anon, authenticated, service_role;

create function public.guard_post_channel_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare existing_target boolean := false;
begin
 if tg_op = 'UPDATE' then
   if new.community_id is distinct from old.community_id then
     raise exception 'A post cannot move to another community' using errcode = 'PT409';
   end if;
   if old.community_id is not null then
     perform public.assert_community_channel_write(old.community_id, old.channel_id, true);
   end if;
 end if;
 if new.community_id is null then
   if new.channel_id is not null then
     raise exception 'A general feed post cannot have a community channel' using errcode = '23514';
   end if;
   return new;
 end if;
 -- Acquire the parent before its channel, matching all channel CRUD RPCs.
 perform 1 from public.communities c
 where c.id = new.community_id and c.archived_at is null for share;
 if not found then raise exception 'Community is unavailable' using errcode = 'PT409'; end if;
 if new.channel_id is null then
   select id into new.channel_id from public.community_channels ch
   where ch.community_id = new.community_id and ch.is_default;
 end if;
 if new.channel_id is null then
   raise exception 'The default community channel is missing' using errcode = 'PT409';
 end if;
 if tg_op = 'UPDATE' then
   existing_target := new.channel_id is not distinct from old.channel_id;
 end if;
 perform public.assert_community_channel_write(new.community_id, new.channel_id, existing_target);
 return new;
end $$;
revoke all on function public.guard_post_channel_write()
 from public, anon, authenticated, service_role;
create trigger posts_channel_write_guard before insert or update on public.posts
 for each row execute function public.guard_post_channel_write();

create function public.guard_comment_channel_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare parent_post public.posts; existing_target boolean := false;
begin
 if tg_op = 'UPDATE' then
   existing_target := new.post_id is not distinct from old.post_id;
   select * into parent_post from public.posts p where p.id = old.post_id for share;
   if found and parent_post.community_id is not null then
     perform public.assert_community_channel_write(parent_post.community_id, parent_post.channel_id, true);
   end if;
 end if;
 select * into parent_post from public.posts p where p.id = new.post_id for share;
 if not found then raise exception 'Post not found' using errcode = 'PT404'; end if;
 if parent_post.community_id is not null then
   perform public.assert_community_channel_write(parent_post.community_id, parent_post.channel_id,
     existing_target);
 end if;
 return new;
end $$;
revoke all on function public.guard_comment_channel_write()
 from public, anon, authenticated, service_role;
create trigger comments_channel_write_guard before insert or update on public.comments
 for each row execute function public.guard_comment_channel_write();

create or replace view public.post_directory with (security_invoker = true) as
select p.id, p.author_id, profile.username as author_username, profile.full_name as author_name,
 profile.avatar_url as author_avatar_url, p.community_id, community.slug as community_slug,
 community.name as community_name, p.post_type, p.title, p.body, p.code_language,
 p.code_snippet, p.tags, p.created_at, p.updated_at,
 (select count(*)::integer from public.comments c where c.post_id = p.id) as comment_count,
 (select count(*)::integer from public.post_reactions r where r.post_id = p.id) as like_count,
 community.archived_at as community_archived_at, p.resources,
 p.channel_id, ch.name as channel_name, ch.is_read_only as channel_is_read_only,
 ch.archived_at as channel_archived_at
from public.posts p join public.profiles profile on profile.id = p.author_id
left join public.communities community on community.id = p.community_id
left join public.community_channels ch on ch.id = p.channel_id and ch.community_id = p.community_id;

notify pgrst, 'reload schema';
