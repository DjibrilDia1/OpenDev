-- The official catalogue currently covers concrete technologies/languages only.
-- Retirement preserves community identities, memberships, discussions and events.
alter table public.communities add column archived_at timestamptz;
alter table public.communities add constraint communities_name_not_blank
    check (char_length(btrim(name)) > 0 and name ~ '[^[:space:]]');
-- A real unique index arbitrates concurrent requests, including case/space variants.
-- Archived community names remain reserved; existing names are never rewritten.
create unique index communities_name_normalized_unique
    on public.communities (lower(btrim(name)));

create function public.protect_community_archive_status()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
    if current_user in ('anon', 'authenticated') then
        if (tg_op = 'INSERT' and new.archived_at is not null)
            or (tg_op = 'UPDATE' and new.archived_at is distinct from old.archived_at) then
            raise exception 'Community archival requires an operator' using errcode = '42501';
        end if;
    end if;
    return new;
end $$;
create trigger communities_protect_archive_status before insert or update on public.communities
    for each row execute function public.protect_community_archive_status();
revoke all on function public.protect_community_archive_status()
    from public, anon, authenticated, service_role;

update public.communities set archived_at = clock_timestamp()
where is_official and archived_at is null and slug in (
    'design-systems', 'open-source', 'ia-data', 'devops-cloud',
    'mobile', 'creative-coding', 'gamedev', 'security'
);

create or replace view public.community_directory with (security_invoker = true) as
select c.id, c.slug, c.name, c.description, c.tags, c.created_by, c.created_at,
    count(m.user_id)::integer as member_count, c.is_official, c.category,
    c.cover_url, c.rules, c.resources,
    (select count(*)::integer from public.posts p where p.community_id = c.id) as post_count,
    (select count(*)::integer from public.posts p where p.community_id = c.id
        and p.created_at >= now() - interval '7 days') as weekly_discussions_count,
    c.archived_at
from public.communities c left join public.community_members m on m.community_id = c.id
group by c.id;

create or replace view public.post_directory with (security_invoker = true) as
select p.id, p.author_id, profile.username as author_username, profile.full_name as author_name,
    profile.avatar_url as author_avatar_url, p.community_id, community.slug as community_slug,
    community.name as community_name, p.post_type, p.title, p.body, p.code_language,
    p.code_snippet, p.tags, p.created_at, p.updated_at,
    (select count(*)::integer from public.comments c where c.post_id = p.id) as comment_count,
    (select count(*)::integer from public.post_reactions r where r.post_id = p.id) as like_count,
    community.archived_at as community_archived_at
from public.posts p join public.profiles profile on profile.id = p.author_id
left join public.communities community on community.id = p.community_id;

create or replace view public.event_directory with (security_invoker = true) as
select e.id, e.title, e.description, e.starts_at, e.ends_at, e.format, e.location,
    e.registration_url, e.community_id, c.slug as community_slug, e.organizer_id, e.created_at,
    e.capacity, totals.attendee_count,
    case when e.capacity is null then null else greatest(0, e.capacity - totals.attendee_count) end as available_seats,
    c.name as community_name, c.archived_at as community_archived_at
from public.events e left join public.communities c on c.id = e.community_id
cross join lateral (select public.event_attendee_count(e.id) as attendee_count) totals;

create or replace function public.community_has_permission(p_community_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
    select coalesce(auth.uid() is not null
        and p_permission in ('edit_community', 'manage_members', 'moderate_posts', 'manage_events')
        and exists (select 1 from public.communities c
            where c.id = p_community_id and c.archived_at is null and (
                c.created_by = auth.uid() or exists (
                    select 1 from public.community_members m where m.community_id = c.id
                        and m.user_id = auth.uid() and m.role = 'moderator'
                        and p_permission = any(m.permissions)
                )
            )), false);
$$;
revoke all on function public.community_has_permission(uuid, text) from public, anon, authenticated;
grant execute on function public.community_has_permission(uuid, text) to authenticated;

drop policy community_members_self_join on public.community_members;
create policy community_members_self_join on public.community_members for insert to authenticated
    with check (user_id = (select auth.uid()) and role = 'member'
        and cardinality(permissions) = 0 and notifications_enabled
        and exists (select 1 from public.communities c
            where c.id = community_id and c.archived_at is null));

-- These guards also cover definer RPCs and direct Data API calls. The SHARE
-- lock serializes new activity with an operator archiving the same community.
-- Existing SELECT policies and leave/unregister RPCs stay available.
create function public.reject_archived_community_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_new_id uuid; v_old_id uuid; v_archived_at timestamptz; item record;
begin
    if tg_table_name = 'event_rsvps' then
        select community_id into v_new_id from public.events where id = new.event_id;
    else
        v_new_id := new.community_id;
        if tg_op = 'UPDATE' then v_old_id := old.community_id; end if;
    end if;
    for item in select c.id, c.archived_at from public.communities c
        where c.id in (v_new_id, v_old_id) order by c.id for share
    loop
        v_archived_at := item.archived_at;
        if v_archived_at is not null then
            raise exception 'Community is archived' using errcode = 'PT409';
        end if;
    end loop;
    return new;
end $$;
revoke all on function public.reject_archived_community_activity()
    from public, anon, authenticated, service_role;
create trigger posts_require_active_community before insert or update on public.posts
    for each row execute function public.reject_archived_community_activity();
create trigger events_require_active_community before insert or update on public.events
    for each row execute function public.reject_archived_community_activity();
create trigger community_join_requires_active before insert on public.community_members
    for each row execute function public.reject_archived_community_activity();
create trigger event_registration_requires_active before insert on public.event_rsvps
    for each row execute function public.reject_archived_community_activity();

-- Operator-only replay creates four communities. It never recreates the former
-- broad catalogue, claims an existing member community or reactivates an archive.
create or replace function public.provision_official_communities(owner_id uuid)
returns table (id uuid, slug text, created boolean)
language plpgsql security invoker set search_path = '' as $$
declare item record; existing_id uuid; was_created boolean;
begin
    if owner_id is null or not exists (select 1 from public.profiles p where p.id = owner_id) then
        raise exception 'An existing administrator profile is required' using errcode = '22023';
    end if;
    lock table public.communities in share row exclusive mode;
    if exists (select 1 from public.communities c
        where c.slug in ('react', 'python', 'typescript', 'fastapi')
            and (not c.is_official or c.created_by <> owner_id or c.archived_at is not null)) then
        raise exception 'An existing community conflicts with the official catalogue; review ownership first'
            using errcode = '23505';
    end if;
    for item in select * from (values
        ('react', 'React', 'Frontend',
            'Composants, hooks et bonnes pratiques. Construisons le web de demain.',
            array['react', 'javascript', 'frontend']),
        ('python', 'Python', 'Backend',
            'Du premier script à la production : API et automatisation.',
            array['python', 'backend', 'automatisation']),
        ('typescript', 'TypeScript', 'Frontend',
            'Des types qui aident vraiment. Partage tes patterns et tes questions.',
            array['typescript', 'javascript', 'frontend']),
        ('fastapi', 'FastAPI', 'Backend',
            'Des API Python claires, rapides et faciles à maintenir.',
            array['fastapi', 'python', 'api'])
    ) as catalogue(slug, name, category, description, tags)
    loop
        select c.id into existing_id from public.communities c where c.slug = item.slug;
        was_created := existing_id is null;
        if was_created then
            insert into public.communities (slug, name, category, description, tags, created_by, is_official)
                values (item.slug, item.name, item.category, item.description, item.tags, owner_id, true)
                returning communities.id into existing_id;
        end if;
        insert into public.community_members (community_id, user_id, role)
            values (existing_id, owner_id, 'owner')
            on conflict (community_id, user_id) do update set role = 'owner', permissions = '{}';
        id := existing_id; slug := item.slug; created := was_created;
        return next;
    end loop;
end $$;
revoke all on function public.provision_official_communities(uuid)
    from public, anon, authenticated, service_role;
comment on function public.provision_official_communities(uuid) is
    'Operator-only, idempotent provisioning of four active technology communities; archives are never reactivated.';
