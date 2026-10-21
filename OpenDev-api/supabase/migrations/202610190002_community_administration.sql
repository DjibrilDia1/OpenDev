-- Requested by the user: community editing/deletion, moderator delegation,
-- and administrator CRUD for events, seats and calendar notifications.
-- Installing this migration deletes NO existing community, post or event.
-- Future community deletion is owner-only and refuses a community containing
-- any posts or events. No ownership transfer is provided.

create function public.valid_community_resources(p_items jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
    if p_items is null or jsonb_typeof(p_items) <> 'array'
        or jsonb_array_length(p_items) > 6 then return false; end if;
    for item in select value from jsonb_array_elements(p_items) loop
        if jsonb_typeof(item) <> 'object' then return false; end if;
        if exists (select 1 from jsonb_object_keys(item) k
            where k not in ('title', 'description', 'url')) then return false; end if;
        if jsonb_typeof(item->'title') is distinct from 'string'
            or char_length(btrim(item->>'title')) not between 1 and 120
            or jsonb_typeof(item->'description') is distinct from 'string'
            or char_length(item->>'description') > 500
            or jsonb_typeof(item->'url') is distinct from 'string'
            or char_length(item->>'url') > 2048
            or (item->>'url') !~ '^https?://[^[:space:]]+$' then return false; end if;
    end loop;
    return true;
end $$;

create function public.valid_community_permissions(p_permissions text[])
returns boolean language sql immutable set search_path = '' as $$
    select coalesce(cardinality(p_permissions) <= 4
        and coalesce(array_ndims(p_permissions), 1) = 1
        and not exists (select 1 from unnest(p_permissions) p where p is null
            or p not in ('edit_community', 'manage_members', 'moderate_posts', 'manage_events'))
        and cardinality(p_permissions) = (select count(distinct p) from unnest(p_permissions) p), false);
$$;

alter table public.communities
    add column cover_url text check (cover_url is null or
        (char_length(cover_url) <= 2048 and cover_url ~ '^https?://[^[:space:]]+$')),
    add column rules text not null default '' check (char_length(rules) <= 4000),
    add column resources jsonb not null default '[]'::jsonb
        check (public.valid_community_resources(resources));
alter table public.community_members
    add column permissions text[] not null default '{}'::text[]
        check (public.valid_community_permissions(permissions)),
    add column notifications_enabled boolean not null default true,
    add constraint community_members_role_permissions check (role = 'moderator' or cardinality(permissions) = 0);

create or replace view public.community_directory with (security_invoker = true) as
select c.id, c.slug, c.name, c.description, c.tags, c.created_by, c.created_at,
    count(m.user_id)::integer as member_count, c.is_official, c.category,
    c.cover_url, c.rules, c.resources,
    (select count(*)::integer from public.posts p where p.community_id = c.id) as post_count,
    (select count(*)::integer from public.posts p where p.community_id = c.id
        and p.created_at >= now() - interval '7 days') as weekly_discussions_count
from public.communities c left join public.community_members m on m.community_id = c.id
group by c.id;

create function public.community_has_permission(p_community_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
    select coalesce(auth.uid() is not null
        and p_permission in ('edit_community', 'manage_members', 'moderate_posts', 'manage_events')
        and exists (select 1 from public.communities c where c.id = p_community_id and (
            c.created_by = auth.uid() or exists (
                select 1 from public.community_members m where m.community_id = c.id
                    and m.user_id = auth.uid() and m.role = 'moderator'
                    and p_permission = any(m.permissions)
            )
        )), false);
$$;

create function public.community_permissions(p_community_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_member public.community_members%rowtype;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    select created_by into v_owner from public.communities where id = p_community_id;
    if not found then raise exception 'Community not found' using errcode = 'PT404'; end if;
    select * into v_member from public.community_members
        where community_id = p_community_id and user_id = v_uid;
    return jsonb_build_object('is_owner', v_owner = v_uid,
        'role', case when v_owner = v_uid then 'owner' else v_member.role end,
        'permissions', case when v_owner = v_uid then
            array['edit_community', 'manage_members', 'moderate_posts', 'manage_events']
            else coalesce(v_member.permissions, '{}'::text[]) end,
        'notifications_enabled', v_member.notifications_enabled);
end $$;

-- Existing joining stays available, without caller-supplied privileges/settings.
revoke update, delete on public.communities from public, anon, authenticated;
revoke insert, update, delete on public.community_members from public, anon, authenticated;
grant insert (community_id, user_id, role) on public.community_members to authenticated;
drop policy community_members_self_join on public.community_members;
create policy community_members_self_join on public.community_members for insert to authenticated
    with check (user_id = (select auth.uid()) and role = 'member'
        and cardinality(permissions) = 0 and notifications_enabled);
drop policy community_members_self_or_owner_leave on public.community_members;
drop policy community_members_owner_manage on public.community_members;

create function public.community_set_member(p_community_id uuid, p_user_id uuid,
    p_role text, p_permissions text[] default '{}'::text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_member public.community_members%rowtype;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    select created_by into v_owner from public.communities where id = p_community_id for update;
    if not found then raise exception 'Community not found' using errcode = 'PT404'; end if;
    if v_uid <> v_owner or p_user_id = v_owner then
        raise exception 'Only the owner may delegate member privileges' using errcode = '42501';
    end if;
    if p_role is null or p_role not in ('member', 'moderator')
        or not public.valid_community_permissions(p_permissions)
        or (p_role = 'member' and cardinality(p_permissions) <> 0) then
        raise exception 'Invalid member privileges' using errcode = '22023';
    end if;
    update public.community_members set role = p_role, permissions = p_permissions
        where community_id = p_community_id and user_id = p_user_id returning * into v_member;
    if not found then raise exception 'Member not found' using errcode = 'PT404'; end if;
    return to_jsonb(v_member);
end $$;

create function public.community_remove_member(p_community_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_member public.community_members%rowtype;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    select created_by into v_owner from public.communities where id = p_community_id for update;
    if not found then raise exception 'Community not found' using errcode = 'PT404'; end if;
    if p_user_id = v_owner then raise exception 'The owner cannot leave' using errcode = '42501'; end if;
    select * into v_member from public.community_members
        where community_id = p_community_id and user_id = p_user_id for update;
    if not found then
        if v_uid = p_user_id or v_uid = v_owner
            or public.community_has_permission(p_community_id, 'manage_members') then return false; end if;
        raise exception 'Member administration forbidden' using errcode = '42501';
    end if;
    if v_uid <> p_user_id and v_uid <> v_owner and not (
        v_member.role = 'member' and public.community_has_permission(p_community_id, 'manage_members')) then
        raise exception 'Member administration forbidden' using errcode = '42501';
    end if;
    delete from public.community_members where community_id = p_community_id and user_id = p_user_id;
    return true;
end $$;

create function public.community_notification_setting(p_community_id uuid, p_enabled boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_member public.community_members%rowtype;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    if p_enabled is null then raise exception 'Notification setting required' using errcode = '22023'; end if;
    update public.community_members set notifications_enabled = p_enabled
        where community_id = p_community_id and user_id = v_uid returning * into v_member;
    if not found then raise exception 'Membership not found' using errcode = 'PT404'; end if;
    return to_jsonb(v_member);
end $$;

create function public.community_update(p_community_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    perform 1 from public.communities where id = p_community_id for update;
    if not found then raise exception 'Community not found' using errcode = 'PT404'; end if;
    if not public.community_has_permission(p_community_id, 'edit_community') then
        raise exception 'Community editing forbidden' using errcode = '42501'; end if;
    if p_data is null or jsonb_typeof(p_data) <> 'object' then
        raise exception 'Invalid community data' using errcode = '22023'; end if;
    if exists (select 1 from jsonb_object_keys(p_data) k
        where k not in ('name', 'description', 'category', 'cover_url', 'rules', 'resources'))
        or exists (select 1 from jsonb_each(p_data) item where item.key <> 'resources'
            and jsonb_typeof(item.value) <> 'string'
            and not (item.key = 'cover_url' and item.value = 'null'::jsonb)) then
        raise exception 'Invalid community fields' using errcode = '22023'; end if;
    update public.communities set
        name = case when p_data ? 'name' then btrim(p_data->>'name') else name end,
        description = case when p_data ? 'description' then btrim(p_data->>'description') else description end,
        category = case when p_data ? 'category' then p_data->>'category' else category end,
        cover_url = case when p_data ? 'cover_url' then p_data->>'cover_url' else cover_url end,
        rules = case when p_data ? 'rules' then p_data->>'rules' else rules end,
        resources = case when p_data ? 'resources' then p_data->'resources' else resources end
    where id = p_community_id;
    select to_jsonb(c) into v_result from public.community_directory c where c.id = p_community_id;
    return v_result;
end $$;

create function public.community_delete(p_community_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_owner uuid;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    select created_by into v_owner from public.communities where id = p_community_id for update;
    if not found then raise exception 'Community not found' using errcode = 'PT404'; end if;
    if v_owner <> v_uid then raise exception 'Only the owner may delete a community' using errcode = '42501'; end if;
    if exists (select 1 from public.posts where community_id = p_community_id)
        or exists (select 1 from public.events where community_id = p_community_id) then
        raise exception 'Remove community publications and events before deleting it' using errcode = 'PT409'; end if;
    delete from public.communities where id = p_community_id;
end $$;

create policy posts_community_moderator_delete on public.posts for delete to authenticated
    using (community_id is not null and public.community_has_permission(community_id, 'moderate_posts'));
create policy comments_community_moderator_delete on public.comments for delete to authenticated
    using (exists (select 1 from public.posts p where p.id = post_id and p.community_id is not null
        and public.community_has_permission(p.community_id, 'moderate_posts')));

-- No PUBLIC/default execution on these administrative entry points.
revoke all on function public.valid_community_resources(jsonb), public.valid_community_permissions(text[]),
    public.community_has_permission(uuid, text), public.community_permissions(uuid),
    public.community_set_member(uuid, uuid, text, text[]), public.community_remove_member(uuid, uuid),
    public.community_notification_setting(uuid, boolean), public.community_update(uuid, jsonb),
    public.community_delete(uuid) from public, anon, authenticated;
grant execute on function public.valid_community_resources(jsonb), public.valid_community_permissions(text[]),
    public.community_has_permission(uuid, text), public.community_permissions(uuid),
    public.community_set_member(uuid, uuid, text, text[]), public.community_remove_member(uuid, uuid),
    public.community_notification_setting(uuid, boolean), public.community_update(uuid, jsonb),
    public.community_delete(uuid) to authenticated;

alter table public.posts drop constraint posts_post_type_check;
alter table public.posts add constraint posts_post_type_check
    check (post_type in ('discussion', 'question', 'showcase', 'resource'));

alter table public.events
    add column capacity integer check (capacity is null or capacity > 0),
    add constraint events_registration_url_valid check (registration_url is null or
        (char_length(registration_url) <= 2048 and registration_url ~ '^https?://[^[:space:]]+$'));
create index events_community_start_idx on public.events (community_id, starts_at);
create index event_rsvps_user_idx on public.event_rsvps (user_id, event_id);

-- This public aggregate exposes no attendee identity; RSVP rows keep their RLS.
create function public.event_attendee_count(p_event_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
    select count(*)::integer from public.event_rsvps r
    where r.event_id = p_event_id and exists (select 1 from public.events e where e.id = p_event_id);
$$;
create or replace view public.event_directory with (security_invoker = true) as
select e.id, e.title, e.description, e.starts_at, e.ends_at, e.format, e.location,
    e.registration_url, e.community_id, c.slug as community_slug, e.organizer_id, e.created_at,
    e.capacity, totals.attendee_count,
    case when e.capacity is null then null else greatest(0, e.capacity - totals.attendee_count) end as available_seats,
    c.name as community_name
from public.events e left join public.communities c on c.id = e.community_id
cross join lateral (select public.event_attendee_count(e.id) as attendee_count) totals;

revoke insert, update, delete on public.events, public.event_rsvps from public, anon, authenticated;
drop policy events_self_insert on public.events;
drop policy events_organizer_update on public.events;
drop policy events_organizer_delete on public.events;
drop policy event_rsvps_self_insert on public.event_rsvps;
drop policy event_rsvps_self_delete on public.event_rsvps;

alter table public.notifications
    add column event_id uuid references public.events (id) on delete set null,
    add column community_id uuid references public.communities (id) on delete cascade,
    add column event_title text check (event_title is null or char_length(event_title) between 1 and 120);
create index notifications_event_idx on public.notifications (event_id);
create index notifications_community_idx on public.notifications (community_id);
alter table public.notifications drop constraint notifications_kind_check;
-- The original multi-column anonymous check has a generated name. Locate it
-- structurally instead of assuming how PostgreSQL numbered the other checks.
do $$
declare constraint_name text;
begin
    for constraint_name in select conname from pg_catalog.pg_constraint
        where conrelid = 'public.notifications'::regclass and contype = 'c'
            and pg_catalog.pg_get_constraintdef(oid) like '%conversation_id%'
    loop execute format('alter table public.notifications drop constraint %I', constraint_name); end loop;
end $$;
alter table public.notifications
    add constraint notifications_kind_check check (kind in
        ('message', 'follow', 'comment', 'reaction', 'event_created', 'event_updated', 'event_cancelled')),
    add constraint notifications_shape_check check (
        (kind = 'message' and conversation_id is not null and message_id is not null
            and post_id is null and comment_id is null and event_id is null and community_id is null and event_title is null)
        or (kind = 'follow' and conversation_id is null and message_id is null
            and post_id is null and comment_id is null and event_id is null and community_id is null and event_title is null)
        or (kind = 'comment' and conversation_id is null and message_id is null
            and post_id is not null and comment_id is not null and event_id is null and community_id is null and event_title is null)
        or (kind = 'reaction' and conversation_id is null and message_id is null
            and post_id is not null and comment_id is null and event_id is null and community_id is null and event_title is null)
        or (kind in ('event_created', 'event_updated', 'event_cancelled')
            and conversation_id is null and message_id is null and post_id is null
            and comment_id is null and event_title is not null)
    );

create or replace function public.notification_list(
    p_before timestamptz default null, p_before_id uuid default null, p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    if p_limit is null or p_limit < 1 or p_limit > 100
        or (p_before is null) <> (p_before_id is null) then
        raise exception 'Invalid pagination' using errcode = '22023'; end if;
    select coalesce(jsonb_agg(page.item order by page.created_at desc, page.id desc), '[]'::jsonb)
    into v_result from (
        select n.id, n.created_at, jsonb_build_object('id', n.id, 'kind', n.kind,
            'actor', case when p.id is null then null else jsonb_build_object('id', p.id,
                'username', p.username, 'full_name', p.full_name, 'avatar_url', p.avatar_url) end,
            'conversation_id', n.conversation_id, 'post_id', n.post_id,
            'event_id', n.event_id, 'event_title', n.event_title,
            'community_id', n.community_id, 'community_slug', c.slug,
            'created_at', n.created_at, 'read_at', n.read_at) item
        from public.notifications n left join public.profiles p on p.id = n.actor_id
        left join public.communities c on c.id = n.community_id
        where n.recipient_id = v_uid and (p_before is null or (n.created_at, n.id) < (p_before, p_before_id))
        order by n.created_at desc, n.id desc limit p_limit
    ) page;
    return v_result;
end $$;

-- Calendar notifications are derived from accepted events, with the actual
-- JWT actor (which may be a delegated moderator) instead of the organizer.
create function public.notify_community_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_event public.events%rowtype; v_kind text;
begin
    if v_actor is null then
        if tg_op = 'DELETE' then return old; else return new; end if;
    end if;
    if tg_op = 'DELETE' then v_event := old; v_kind := 'event_cancelled';
    elsif tg_op = 'INSERT' then v_event := new; v_kind := 'event_created';
    else
        if (new.title, new.description, new.starts_at, new.ends_at, new.format,
            new.location, new.registration_url, new.capacity)
            is not distinct from (old.title, old.description, old.starts_at, old.ends_at,
                old.format, old.location, old.registration_url, old.capacity) then return new; end if;
        v_event := new; v_kind := 'event_updated';
    end if;
    insert into public.notifications (recipient_id, actor_id, kind, event_id, community_id, event_title)
    select recipients.user_id, v_actor, v_kind,
        case when tg_op = 'DELETE' then null else v_event.id end, v_event.community_id, v_event.title
    from (
        select m.user_id from public.community_members m
        where m.community_id = v_event.community_id and m.notifications_enabled
        union
        select r.user_id from public.event_rsvps r
        where r.event_id = v_event.id and tg_op <> 'INSERT'
    ) recipients where recipients.user_id <> v_actor;
    if tg_op = 'DELETE' then return old; else return new; end if;
end $$;
create trigger event_created_notification after insert on public.events
    for each row execute function public.notify_community_event();
create trigger event_updated_notification after update on public.events
    for each row execute function public.notify_community_event();
-- BEFORE DELETE retains access to RSVPs before their FK cascade deletes them.
create trigger event_cancelled_notification before delete on public.events
    for each row execute function public.notify_community_event();

create function public.valid_event_data(p_data jsonb, p_allow_community boolean)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item record;
begin
    if p_data is null or jsonb_typeof(p_data) <> 'object' then return false; end if;
    for item in select key, value from jsonb_each(p_data) loop
        if item.key = 'capacity' then
            if item.value <> 'null'::jsonb and (jsonb_typeof(item.value) <> 'number'
                or item.value::text !~ '^[1-9][0-9]*$') then return false; end if;
        elsif item.key = 'community_id' and p_allow_community then
            if item.value <> 'null'::jsonb and jsonb_typeof(item.value) <> 'string' then return false; end if;
        elsif item.key in ('location', 'registration_url') then
            if item.value <> 'null'::jsonb and jsonb_typeof(item.value) <> 'string' then return false; end if;
        elsif item.key in ('title', 'description', 'starts_at', 'ends_at', 'format') then
            if jsonb_typeof(item.value) <> 'string' then return false; end if;
        else return false;
        end if;
    end loop;
    return true;
end $$;

-- Admin mutations and moderator revocations share the same community lock.
-- Registration additionally locks its event, so capacity checks are atomic.
create function public.event_create(p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_event public.events%rowtype; v_result jsonb;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    if not public.valid_event_data(p_data, true) then
        raise exception 'Invalid event fields' using errcode = '22023'; end if;
    select * into v_event from jsonb_populate_record(null::public.events, p_data);
    if v_event.community_id is not null then
        perform 1 from public.communities where id = v_event.community_id for update;
        if not found then raise exception 'Community not found' using errcode = 'PT404'; end if;
        if not public.community_has_permission(v_event.community_id, 'manage_events') then
            raise exception 'Event administration forbidden' using errcode = '42501'; end if;
    end if;
    if v_event.starts_at is null or v_event.ends_at is null
        or not isfinite(v_event.starts_at) or not isfinite(v_event.ends_at)
        or v_event.starts_at <= clock_timestamp() or v_event.ends_at <= v_event.starts_at then
        raise exception 'Invalid event dates' using errcode = '22023'; end if;
    if coalesce(v_event.format, 'online') = 'in_person' and coalesce(btrim(v_event.location), '') = '' then
        raise exception 'An in-person event requires a location' using errcode = '22023'; end if;
    insert into public.events (title, description, starts_at, ends_at, format, location,
        registration_url, community_id, organizer_id, capacity)
    values (btrim(v_event.title), btrim(v_event.description), v_event.starts_at, v_event.ends_at,
        coalesce(v_event.format, 'online'), v_event.location, v_event.registration_url,
        v_event.community_id, v_uid, v_event.capacity) returning id into v_event.id;
    select to_jsonb(e) into v_result from public.event_directory e where e.id = v_event.id;
    return v_result;
end $$;

create function public.event_update(p_event_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_old public.events%rowtype; v_new public.events%rowtype; v_result jsonb;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    select * into v_old from public.events where id = p_event_id;
    if not found then raise exception 'Event not found' using errcode = 'PT404'; end if;
    if v_old.community_id is not null then
        perform 1 from public.communities where id = v_old.community_id for update;
    end if;
    select * into v_old from public.events where id = p_event_id for update;
    if not found then raise exception 'Event not found' using errcode = 'PT404'; end if;
    if (v_old.community_id is null and v_old.organizer_id <> v_uid)
        or (v_old.community_id is not null and not public.community_has_permission(v_old.community_id, 'manage_events')) then
        raise exception 'Event administration forbidden' using errcode = '42501'; end if;
    if not public.valid_event_data(p_data, false) then
        raise exception 'Immutable or invalid event fields' using errcode = '22023'; end if;
    select * into v_new from jsonb_populate_record(v_old, p_data);
    if v_new.starts_at is null or v_new.ends_at is null
        or not isfinite(v_new.starts_at) or not isfinite(v_new.ends_at)
        or v_new.ends_at <= v_new.starts_at
        or (v_new.starts_at is distinct from v_old.starts_at and v_new.starts_at <= clock_timestamp()) then
        raise exception 'Invalid event dates' using errcode = '22023'; end if;
    if v_new.format = 'in_person' and coalesce(btrim(v_new.location), '') = '' then
        raise exception 'An in-person event requires a location' using errcode = '22023'; end if;
    if v_new.capacity is not null and v_new.capacity < public.event_attendee_count(p_event_id) then
        raise exception 'Capacity is below the number of registered attendees' using errcode = 'PT409'; end if;
    update public.events set title = btrim(v_new.title), description = btrim(v_new.description),
        starts_at = v_new.starts_at, ends_at = v_new.ends_at, format = v_new.format,
        location = v_new.location, registration_url = v_new.registration_url, capacity = v_new.capacity
    where id = p_event_id;
    select to_jsonb(e) into v_result from public.event_directory e where e.id = p_event_id;
    return v_result;
end $$;

create function public.event_delete(p_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_event public.events%rowtype;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    select * into v_event from public.events where id = p_event_id;
    if not found then raise exception 'Event not found' using errcode = 'PT404'; end if;
    if v_event.community_id is not null then
        perform 1 from public.communities where id = v_event.community_id for update;
    end if;
    select * into v_event from public.events where id = p_event_id for update;
    if not found then raise exception 'Event not found' using errcode = 'PT404'; end if;
    if (v_event.community_id is null and v_event.organizer_id <> v_uid)
        or (v_event.community_id is not null and not public.community_has_permission(v_event.community_id, 'manage_events')) then
        raise exception 'Event administration forbidden' using errcode = '42501'; end if;
    delete from public.events where id = p_event_id;
end $$;

create function public.event_register(p_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_event public.events%rowtype;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    select * into v_event from public.events where id = p_event_id;
    if not found then raise exception 'Event not found' using errcode = 'PT404'; end if;
    if v_event.community_id is not null then
        perform 1 from public.communities where id = v_event.community_id for update;
    end if;
    select * into v_event from public.events where id = p_event_id for update;
    if not found then raise exception 'Event not found' using errcode = 'PT404'; end if;
    if v_event.community_id is not null and not exists (
        select 1 from public.community_members where community_id = v_event.community_id and user_id = v_uid) then
        raise exception 'Join the community before registering' using errcode = '42501'; end if;
    if exists (select 1 from public.event_rsvps where event_id = p_event_id and user_id = v_uid) then return; end if;
    if v_event.starts_at <= clock_timestamp() then
        raise exception 'Registration is closed' using errcode = 'PT409'; end if;
    if v_event.capacity is not null and public.event_attendee_count(p_event_id) >= v_event.capacity then
        raise exception 'Event is full' using errcode = 'PT409'; end if;
    insert into public.event_rsvps (event_id, user_id) values (p_event_id, v_uid)
        on conflict (event_id, user_id) do nothing;
end $$;

create function public.event_unregister(p_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_community uuid;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    select community_id into v_community from public.events where id = p_event_id;
    if not found then raise exception 'Event not found' using errcode = 'PT404'; end if;
    if v_community is not null then perform 1 from public.communities where id = v_community for update; end if;
    perform 1 from public.events where id = p_event_id for update;
    if not found then raise exception 'Event not found' using errcode = 'PT404'; end if;
    delete from public.event_rsvps where event_id = p_event_id and user_id = v_uid;
end $$;

revoke all on function public.event_attendee_count(uuid), public.notify_community_event(),
    public.valid_event_data(jsonb, boolean), public.event_create(jsonb), public.event_update(uuid, jsonb),
    public.event_delete(uuid), public.event_register(uuid), public.event_unregister(uuid)
    from public, anon, authenticated;
grant execute on function public.event_create(jsonb), public.event_update(uuid, jsonb),
    public.event_delete(uuid), public.event_register(uuid), public.event_unregister(uuid) to authenticated;
grant execute on function public.event_attendee_count(uuid) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-covers', 'community-covers', true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do nothing;

create function public.community_cover_allowed(p_name text)
returns boolean language plpgsql stable security invoker set search_path = '' as $$
declare v_folder text := (storage.foldername(p_name))[1];
begin
    if v_folder is null or v_folder !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
        return false; end if;
    return public.community_has_permission(v_folder::uuid, 'edit_community');
end $$;
create policy community_cover_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'community-covers' and public.community_cover_allowed(name));
create policy community_cover_select on storage.objects for select to authenticated
    using (bucket_id = 'community-covers' and public.community_cover_allowed(name));
create policy community_cover_update on storage.objects for update to authenticated
    using (bucket_id = 'community-covers' and public.community_cover_allowed(name))
    with check (bucket_id = 'community-covers' and public.community_cover_allowed(name));
create policy community_cover_delete on storage.objects for delete to authenticated
    using (bucket_id = 'community-covers' and public.community_cover_allowed(name));
revoke all on function public.community_cover_allowed(text) from public, anon, authenticated;
grant execute on function public.community_cover_allowed(text) to authenticated;
