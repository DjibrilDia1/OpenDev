-- OpenDev initial data model. Supabase Auth and RLS remain authoritative.

create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    username text not null unique check (username ~ '^[A-Za-z0-9_.-]{3,30}$'),
    full_name text not null default '',
    headline text not null default '' check (char_length(headline) <= 140),
    bio text not null default '' check (char_length(bio) <= 1000),
    avatar_url text,
    website_url text,
    github_url text,
    location text not null default '' check (char_length(location) <= 100),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.communities (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
    name text not null check (char_length(name) between 1 and 120),
    description text not null check (char_length(description) between 1 and 1000),
    tags text[] not null default '{}',
    created_by uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.community_members (
    community_id uuid not null references public.communities (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
    joined_at timestamptz not null default now(),
    primary key (community_id, user_id)
);

create table public.posts (
    id uuid primary key default gen_random_uuid(),
    author_id uuid not null references public.profiles (id) on delete cascade,
    community_id uuid references public.communities (id) on delete set null,
    post_type text not null default 'discussion' check (post_type in ('discussion', 'question', 'showcase')),
    title text not null check (char_length(title) between 1 and 120),
    body text not null check (char_length(body) between 1 and 12000),
    code_language text check (code_language is null or char_length(code_language) <= 40),
    code_snippet text check (code_snippet is null or char_length(code_snippet) <= 8000),
    tags text[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.comments (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts (id) on delete cascade,
    author_id uuid not null references public.profiles (id) on delete cascade,
    parent_comment_id uuid references public.comments (id) on delete set null,
    body text not null check (char_length(body) between 1 and 5000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index comments_parent_idx on public.comments (parent_comment_id);

create table public.post_reactions (
    post_id uuid not null references public.posts (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    reaction text not null default 'like' check (reaction = 'like'),
    created_at timestamptz not null default now(),
    primary key (post_id, user_id)
);

create table public.projects (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
    name text not null check (char_length(name) between 1 and 120),
    description text not null check (char_length(description) between 1 and 2000),
    repository_url text,
    website_url text,
    status text not null default 'looking_for_contributors' check (status in ('active', 'looking_for_contributors', 'paused')),
    tags text[] not null default '{}',
    owner_id uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.project_contributors (
    project_id uuid not null references public.projects (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    role text not null default 'contributor' check (role in ('owner', 'contributor')),
    created_at timestamptz not null default now(),
    primary key (project_id, user_id)
);

create table public.events (
    id uuid primary key default gen_random_uuid(),
    title text not null check (char_length(title) between 1 and 120),
    description text not null check (char_length(description) between 1 and 2000),
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    format text not null default 'online' check (format in ('online', 'in_person')),
    location text check (location is null or char_length(location) <= 200),
    registration_url text,
    community_id uuid references public.communities (id) on delete set null,
    organizer_id uuid not null references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (ends_at > starts_at)
);

create table public.event_rsvps (
    event_id uuid not null references public.events (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    status text not null default 'attending' check (status = 'attending'),
    created_at timestamptz not null default now(),
    primary key (event_id, user_id)
);

create index communities_created_at_idx on public.communities (created_at desc);
create index community_members_user_idx on public.community_members (user_id, joined_at desc);
create index posts_created_at_idx on public.posts (created_at desc);
create index posts_community_created_idx on public.posts (community_id, created_at desc);
create index posts_author_created_idx on public.posts (author_id, created_at desc);
create index comments_post_created_idx on public.comments (post_id, created_at);
create index projects_created_at_idx on public.projects (created_at desc);
create index events_starts_at_idx on public.events (starts_at);

create function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger communities_set_updated_at before update on public.communities for each row execute function public.set_updated_at();
create trigger posts_set_updated_at before update on public.posts for each row execute function public.set_updated_at();
create trigger comments_set_updated_at before update on public.comments for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();

create function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    insert into public.profiles (id, username, full_name)
    values (
        new.id,
        'user-' || left(replace(new.id::text, '-', ''), 12),
        coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_auth_user();
insert into public.profiles (id, username, full_name)
select u.id,
       'user-' || left(replace(u.id::text, '-', ''), 12),
       coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')
from auth.users u
on conflict (id) do nothing;

create function public.add_community_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    insert into public.community_members (community_id, user_id, role)
    values (new.id, new.created_by, 'owner') on conflict (community_id, user_id) do nothing;
    return new;
end;
$$;
create trigger community_add_owner after insert on public.communities for each row execute function public.add_community_owner();

create function public.add_project_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    insert into public.project_contributors (project_id, user_id, role)
    values (new.id, new.owner_id, 'owner') on conflict (project_id, user_id) do nothing;
    return new;
end;
$$;
create trigger project_add_owner after insert on public.projects for each row execute function public.add_project_owner();

create function public.validate_comment_parent()
returns trigger language plpgsql set search_path = '' as $$
begin
    if new.parent_comment_id is not null and not exists (
        select 1 from public.comments parent
        where parent.id = new.parent_comment_id and parent.post_id = new.post_id
    ) then
        raise exception 'Parent comment must belong to the same post' using errcode = '23514';
    end if;
    return new;
end;
$$;
create trigger comments_validate_parent before insert or update on public.comments
for each row execute function public.validate_comment_parent();

alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.projects enable row level security;
alter table public.project_contributors enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;

create policy profiles_public_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_self_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy communities_public_read on public.communities for select to anon, authenticated using (true);
create policy communities_owner_insert on public.communities for insert to authenticated with check (created_by = (select auth.uid()));
create policy communities_owner_update on public.communities for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy communities_owner_delete on public.communities for delete to authenticated using (created_by = (select auth.uid()));

create policy community_members_public_read on public.community_members for select to anon, authenticated using (true);
create policy community_members_self_join on public.community_members for insert to authenticated with check (user_id = (select auth.uid()) and role = 'member');
create policy community_members_self_or_owner_leave on public.community_members for delete to authenticated using (
    (user_id = (select auth.uid()) and role = 'member') or exists (
        select 1 from public.communities c where c.id = community_id and c.created_by = (select auth.uid()) and user_id <> (select auth.uid())
    )
);
create policy community_members_owner_manage on public.community_members for update to authenticated using (
    exists (select 1 from public.communities c where c.id = community_id and c.created_by = (select auth.uid()))
) with check (
    exists (select 1 from public.communities c where c.id = community_id and c.created_by = (select auth.uid()))
);

create policy posts_public_read on public.posts for select to anon, authenticated using (true);
create policy posts_member_insert on public.posts for insert to authenticated with check (
    author_id = (select auth.uid()) and (community_id is null or exists (
        select 1 from public.community_members m where m.community_id = posts.community_id and m.user_id = (select auth.uid())
    ))
);
create policy posts_author_update on public.posts for update to authenticated using (author_id = (select auth.uid())) with check (
    author_id = (select auth.uid()) and (community_id is null or exists (
        select 1 from public.community_members m where m.community_id = posts.community_id and m.user_id = (select auth.uid())
    ))
);
create policy posts_author_delete on public.posts for delete to authenticated using (author_id = (select auth.uid()));

create policy comments_public_read on public.comments for select to anon, authenticated using (true);
create policy comments_self_insert on public.comments for insert to authenticated with check (
    author_id = (select auth.uid()) and exists (select 1 from public.posts p where p.id = comments.post_id)
);
create policy comments_author_update on public.comments for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy comments_author_delete on public.comments for delete to authenticated using (author_id = (select auth.uid()));

create policy post_reactions_public_read on public.post_reactions for select to anon, authenticated using (true);
create policy post_reactions_self_insert on public.post_reactions for insert to authenticated with check (user_id = (select auth.uid()));
create policy post_reactions_self_delete on public.post_reactions for delete to authenticated using (user_id = (select auth.uid()));

create policy projects_public_read on public.projects for select to anon, authenticated using (true);
create policy projects_owner_insert on public.projects for insert to authenticated with check (owner_id = (select auth.uid()));
create policy projects_owner_update on public.projects for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy projects_owner_delete on public.projects for delete to authenticated using (owner_id = (select auth.uid()));

create policy project_contributors_public_read on public.project_contributors for select to anon, authenticated using (true);
create policy project_contributors_self_join on public.project_contributors for insert to authenticated with check (user_id = (select auth.uid()) and role = 'contributor');
create policy project_contributors_self_or_owner_leave on public.project_contributors for delete to authenticated using (
    (user_id = (select auth.uid()) and role = 'contributor') or exists (
        select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()) and user_id <> (select auth.uid())
    )
);

create policy events_public_read on public.events for select to anon, authenticated using (true);
create policy events_self_insert on public.events for insert to authenticated with check (
    organizer_id = (select auth.uid()) and (community_id is null or exists (
        select 1 from public.community_members m where m.community_id = events.community_id and m.user_id = (select auth.uid())
    ))
);
create policy events_organizer_update on public.events for update to authenticated using (organizer_id = (select auth.uid())) with check (
    organizer_id = (select auth.uid()) and (community_id is null or exists (
        select 1 from public.community_members m where m.community_id = events.community_id and m.user_id = (select auth.uid())
    ))
);
create policy events_organizer_delete on public.events for delete to authenticated using (organizer_id = (select auth.uid()));

create policy event_rsvps_self_read on public.event_rsvps for select to authenticated using (user_id = (select auth.uid()));
create policy event_rsvps_self_insert on public.event_rsvps for insert to authenticated with check (user_id = (select auth.uid()));
create policy event_rsvps_self_delete on public.event_rsvps for delete to authenticated using (user_id = (select auth.uid()));

create view public.community_directory with (security_invoker = true) as
select c.id, c.slug, c.name, c.description, c.tags, c.created_by, c.created_at, count(m.user_id)::integer as member_count
from public.communities c left join public.community_members m on m.community_id = c.id group by c.id;

create view public.project_directory with (security_invoker = true) as
select p.id, p.slug, p.name, p.description, p.repository_url, p.website_url, p.status, p.tags,
       p.owner_id, p.created_at, count(pc.user_id)::integer as contributor_count
from public.projects p left join public.project_contributors pc on pc.project_id = p.id group by p.id;

create view public.people_directory with (security_invoker = true) as
select p.id, p.username, p.full_name, p.headline, p.bio, p.avatar_url, p.location,
       (select count(*)::integer from public.posts post where post.author_id = p.id) as post_count,
       (select count(*)::integer from public.community_members cm where cm.user_id = p.id) as community_count
from public.profiles p;

create view public.post_directory with (security_invoker = true) as
select p.id, p.author_id, profile.username as author_username, profile.full_name as author_name,
       profile.avatar_url as author_avatar_url, p.community_id, community.slug as community_slug,
       community.name as community_name, p.post_type, p.title, p.body, p.code_language,
       p.code_snippet, p.tags, p.created_at, p.updated_at,
       (select count(*)::integer from public.comments c where c.post_id = p.id) as comment_count,
       (select count(*)::integer from public.post_reactions r where r.post_id = p.id) as like_count
from public.posts p join public.profiles profile on profile.id = p.author_id
left join public.communities community on community.id = p.community_id;

create view public.popular_tags with (security_invoker = true) as
select lower(tag) as tag, count(*)::integer as post_count
  from public.posts p cross join lateral unnest(p.tags) as tag_values(tag) group by lower(tag);

create view public.event_directory with (security_invoker = true) as
select e.id, e.title, e.description, e.starts_at, e.ends_at, e.format, e.location,
       e.registration_url, e.community_id, c.slug as community_slug, e.organizer_id, e.created_at
from public.events e left join public.communities c on c.id = e.community_id;

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.communities, public.community_members, public.posts,
    public.comments, public.post_reactions, public.projects, public.project_contributors, public.events to anon, authenticated;
grant select on public.event_rsvps to authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.communities, public.community_members, public.posts,
    public.comments, public.post_reactions, public.projects, public.project_contributors,
    public.events, public.event_rsvps to authenticated;
grant select on public.community_directory, public.project_directory, public.people_directory,
    public.post_directory, public.popular_tags, public.event_directory to anon, authenticated;
