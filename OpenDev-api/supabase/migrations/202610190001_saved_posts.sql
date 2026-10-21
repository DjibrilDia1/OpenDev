-- Private bookmarks. Saving never emits a notification or changes the publication.
create table public.saved_posts (
    user_id uuid not null references public.profiles (id) on delete cascade,
    post_id uuid not null references public.posts (id) on delete cascade,
    saved_at timestamptz not null default clock_timestamp(),
    primary key (user_id, post_id)
);

create index saved_posts_user_cursor_idx
    on public.saved_posts (user_id, saved_at desc, post_id desc);
create index saved_posts_post_idx on public.saved_posts (post_id);

alter table public.saved_posts enable row level security;
revoke all on public.saved_posts from public, anon, authenticated;
grant select, delete on public.saved_posts to authenticated;
-- The save timestamp is assigned by PostgreSQL and cannot be supplied by a client.
grant insert (user_id, post_id) on public.saved_posts to authenticated;

create policy saved_posts_read_own on public.saved_posts
    for select to authenticated using (user_id = (select auth.uid()));
create policy saved_posts_insert_own_visible on public.saved_posts
    for insert to authenticated with check (
        user_id = (select auth.uid())
        and exists (select 1 from public.posts p where p.id = saved_posts.post_id)
    );
create policy saved_posts_delete_own on public.saved_posts
    for delete to authenticated using (user_id = (select auth.uid()));

-- SECURITY INVOKER preserves RLS and all grants of the JWT caller.
create function public.saved_post_add(p_post_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
    if v_uid is null then
        raise exception 'Authentication required' using errcode = '42501';
    end if;
    if not exists (select 1 from public.posts p where p.id = p_post_id) then
        raise exception 'Post not found' using errcode = 'PT404';
    end if;
    insert into public.saved_posts (user_id, post_id) values (v_uid, p_post_id)
        on conflict (user_id, post_id) do nothing;
end $$;

create function public.saved_post_page(
    p_before timestamptz default null, p_before_id uuid default null, p_limit integer default 20
)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
    if v_uid is null then
        raise exception 'Authentication required' using errcode = '42501';
    end if;
    if p_limit is null or p_limit < 1 or p_limit > 100
        or (p_before is null) <> (p_before_id is null) then
        raise exception 'Invalid pagination' using errcode = '22023';
    end if;
    select coalesce(jsonb_agg(page.item order by page.saved_at desc, page.post_id desc), '[]'::jsonb)
    into v_result from (
        select s.saved_at, s.post_id,
            jsonb_build_object('post_id', s.post_id, 'saved_at', s.saved_at, 'post', to_jsonb(p)) item
        from public.saved_posts s
        join public.post_directory p on p.id = s.post_id
        where s.user_id = v_uid and (p_before is null
            or (s.saved_at, s.post_id) < (p_before, p_before_id))
        order by s.saved_at desc, s.post_id desc limit p_limit
    ) page;
    return v_result;
end $$;

revoke all on function public.saved_post_add(uuid),
    public.saved_post_page(timestamptz, uuid, integer) from public, anon, authenticated;
grant execute on function public.saved_post_add(uuid),
    public.saved_post_page(timestamptz, uuid, integer) to authenticated;
