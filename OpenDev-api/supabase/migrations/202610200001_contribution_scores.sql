-- Contribution reputation is derived from current public content, never a
-- client-written balance. Private gratitude identities are exposed only as
-- counts and the caller's own choice through narrowly scoped RPCs.
create table public.comment_thanks (
 comment_id uuid not null references public.comments(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 tag text not null check (tag in ('thanks','helpful','clear')),
 created_at timestamptz not null default clock_timestamp(),
 primary key (comment_id, user_id)
);
create index comment_thanks_user_idx on public.comment_thanks(user_id, created_at);

alter table public.comments add constraint comments_id_post_unique unique (id, post_id);
create table public.accepted_solutions (
 post_id uuid primary key references public.posts(id) on delete cascade,
 comment_id uuid not null,
 created_at timestamptz not null default clock_timestamp(),
 foreign key (comment_id, post_id) references public.comments(id, post_id) on delete cascade
);
create index accepted_solutions_comment_idx on public.accepted_solutions(comment_id);
create index comments_author_post_created_idx
 on public.comments(author_id, post_id, created_at, id);

alter table public.comment_thanks enable row level security;
alter table public.accepted_solutions enable row level security;
revoke all on public.comment_thanks, public.accepted_solutions
 from public, anon, authenticated, service_role;
-- No direct grants or policies: mutation authorization and aggregation cannot
-- be bypassed by talking directly to PostgREST.

create function public.guard_contribution_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if tg_op = 'INSERT' then
   -- Ignore user-controlled timestamps even when the Data API is used directly.
   new.created_at := clock_timestamp();
 else
   if new.id is distinct from old.id or new.author_id is distinct from old.author_id
   or new.created_at is distinct from old.created_at then
     raise exception 'Contribution identity and date are immutable' using errcode = '23514';
   end if;
   if tg_table_name = 'comments' then
     if new.post_id is distinct from old.post_id then
       raise exception 'A reply cannot move to another publication' using errcode = '23514';
     end if;
   end if;
   if tg_table_name = 'posts' then
     if new.post_type <> 'question' and exists (
       select 1 from public.accepted_solutions s where s.post_id = old.id
     ) then
       raise exception 'Remove the accepted solution before changing the question type'
         using errcode = 'PT409';
     end if;
   end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_contribution_identity()
 from public, anon, authenticated, service_role;
create trigger aaa_posts_contribution_identity before insert or update on public.posts
 for each row execute function public.guard_contribution_identity();
create trigger aaa_comments_contribution_identity before insert or update on public.comments
 for each row execute function public.guard_contribution_identity();

-- This function returns only public counters and the caller's own tag. It
-- intentionally never returns a donor id or the private table rows.
create function public.comment_contribution_metrics(p_comment_ids uuid[])
returns table (comment_id uuid, thanks_count integer, my_thanks_tag text, is_solution boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
 if p_comment_ids is null or cardinality(p_comment_ids) > 100
 or coalesce(array_ndims(p_comment_ids), 1) <> 1 then
   raise exception 'Supply at most 100 comment ids' using errcode = '22023';
 end if;
 return query
 select c.id,
   (select count(*)::integer from public.comment_thanks t where t.comment_id = c.id),
   (select t.tag from public.comment_thanks t
     where t.comment_id = c.id and t.user_id = auth.uid()),
   exists (select 1 from public.accepted_solutions s
     where s.post_id = c.post_id and s.comment_id = c.id)
 from public.comments c where c.id = any(p_comment_ids);
end $$;
revoke all on function public.comment_contribution_metrics(uuid[])
 from public, anon, authenticated, service_role;
grant execute on function public.comment_contribution_metrics(uuid[]) to anon, authenticated;

create function public.set_comment_thanks(p_post_id uuid, p_comment_id uuid, p_tag text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target_post public.posts; target_comment public.comments;
 result jsonb;
begin
 if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 if p_tag is not null and p_tag not in ('thanks','helpful','clear') then
   raise exception 'Unknown gratitude tag' using errcode = '22023';
 end if;
 select * into target_post from public.posts p where p.id = p_post_id for share;
 if not found then raise exception 'Post not found' using errcode = 'PT404'; end if;
 if target_post.post_type <> 'question' then
   raise exception 'Gratitude tags are available on help questions' using errcode = 'PT409';
 end if;
 if target_post.community_id is not null then
   perform public.assert_community_channel_write(target_post.community_id, target_post.channel_id, false);
   if not exists (select 1 from public.community_members m
     where m.community_id = target_post.community_id and m.user_id = actor) then
     raise exception 'Join the community before thanking a reply' using errcode = '42501';
   end if;
 end if;
 select * into target_comment from public.comments c
 where c.id = p_comment_id and c.post_id = p_post_id for share;
 if not found then raise exception 'Reply not found' using errcode = 'PT404'; end if;
 if target_comment.author_id = actor then
   raise exception 'You cannot thank your own reply' using errcode = '42501';
 end if;
 if p_tag is null then
   delete from public.comment_thanks where comment_id = p_comment_id and user_id = actor;
 else
   insert into public.comment_thanks(comment_id,user_id,tag)
   values (p_comment_id,actor,p_tag)
   on conflict (comment_id,user_id) do update set tag = excluded.tag;
 end if;
 select to_jsonb(m) into result
 from public.comment_contribution_metrics(array[p_comment_id]) m;
 return result;
end $$;

create function public.set_post_solution(p_post_id uuid, p_comment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target_post public.posts; target_comment public.comments;
begin
 if actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
 -- One parent lock serializes concurrent selection, replacement and removal.
 select * into target_post from public.posts p where p.id = p_post_id for update;
 if not found then raise exception 'Post not found' using errcode = 'PT404'; end if;
 if target_post.author_id <> actor then
   raise exception 'Only the question author may select a solution' using errcode = '42501';
 end if;
 if target_post.post_type <> 'question' then
   raise exception 'Only a help question can have an accepted solution' using errcode = 'PT409';
 end if;
 if target_post.community_id is not null then
   perform public.assert_community_channel_write(target_post.community_id, target_post.channel_id, false);
   if not exists (select 1 from public.community_members m
     where m.community_id = target_post.community_id and m.user_id = actor) then
     raise exception 'Join the community before selecting a solution' using errcode = '42501';
   end if;
 end if;
 if p_comment_id is null then
   delete from public.accepted_solutions where post_id = p_post_id;
 else
   -- Reply identity cannot change; the composite FK protects concurrent
   -- deletion without locking a reply after its already-locked parent.
   select * into target_comment from public.comments c
   where c.id = p_comment_id and c.post_id = p_post_id;
   if not found then raise exception 'Reply not found' using errcode = 'PT404'; end if;
   if target_comment.author_id = actor then
     raise exception 'You cannot select your own reply as a solution' using errcode = '42501';
   end if;
   insert into public.accepted_solutions(post_id,comment_id) values (p_post_id,p_comment_id)
   on conflict (post_id) do update set comment_id = excluded.comment_id;
 end if;
 return jsonb_build_object('post_id',p_post_id,'accepted_comment_id',p_comment_id);
end $$;
revoke all on function public.set_comment_thanks(uuid,uuid,text),
 public.set_post_solution(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.set_comment_thanks(uuid,uuid,text),
 public.set_post_solution(uuid,uuid) to authenticated;

-- Aggregate only public contribution facts. Daily ceilings use UTC, stable
-- ordering and server-owned creation dates. Removal/deletion/archival reverses
-- points; switching a gratitude tag or an accepted reply retains its first date.
-- Re-adding a removed choice is a new current choice dated today, never an
-- accumulated ledger award. No likes, follows, login or self-interaction points.
create function public.contribution_scores(p_user_ids uuid[])
returns table (user_id uuid, score integer, posts_points integer, answers_points integer,
 resources_points integer, thanks_points integer, solutions_points integer,
 thanks_received integer, solutions_count integer)
language plpgsql stable security definer set search_path = '' as $$
begin
 if p_user_ids is null or cardinality(p_user_ids) > 100
 or coalesce(array_ndims(p_user_ids), 1) <> 1 then
   raise exception 'Supply at most 100 profile ids' using errcode = '22023';
 end if;
 return query
 with active_posts as not materialized (
   select p.* from public.posts p
   left join public.communities community on community.id = p.community_id
   left join public.community_channels ch on ch.id = p.channel_id
   where (p.community_id is null or community.archived_at is null)
   and (p.channel_id is null or ch.archived_at is null)
 ), ranked_posts as (
   select p.author_id, row_number() over (partition by p.author_id,
     (p.created_at at time zone 'UTC')::date order by p.created_at,p.id) as daily_rank
   from active_posts p where p.author_id = any(p_user_ids)
 ), ranked_resources as (
   select p.author_id, row_number() over (partition by p.author_id,
     (p.created_at at time zone 'UTC')::date order by p.created_at,p.id) as daily_rank
   from active_posts p where p.author_id = any(p_user_ids) and p.post_type = 'resource'
   and (jsonb_array_length(p.resources) > 0 or nullif(btrim(p.code_snippet),'') is not null
     or p.body ~* 'https?://[^[:space:]<>]+')
 ), first_answers as (
   select distinct on (c.author_id,c.post_id) c.author_id,c.post_id,c.id,c.created_at
   from public.comments c join active_posts p on p.id = c.post_id
   where c.author_id = any(p_user_ids) and c.author_id <> p.author_id
   order by c.author_id,c.post_id,c.created_at,c.id
 ), ranked_answers as (
   select a.author_id,row_number() over (partition by a.author_id,
     (a.created_at at time zone 'UTC')::date order by a.created_at,a.id) as daily_rank
   from first_answers a
 ), valid_thanks as (
   select t.comment_id,t.user_id,c.author_id,t.created_at,c.post_id
   from public.comment_thanks t join public.comments c on c.id = t.comment_id
   join active_posts p on p.id = c.post_id
   where c.author_id = any(p_user_ids) and t.user_id <> c.author_id
   and p.post_type = 'question'
 ), question_thanks as (
   select distinct on (t.user_id,t.author_id,t.post_id) t.*
   from valid_thanks t order by t.user_id,t.author_id,t.post_id,t.created_at,t.comment_id
 ), pair_day_thanks as (
   select distinct on (t.user_id,t.author_id,(t.created_at at time zone 'UTC')::date) t.*
   from question_thanks t
   order by t.user_id,t.author_id,(t.created_at at time zone 'UTC')::date,t.created_at,t.comment_id
 ), ranked_thanks as (
   select t.author_id,row_number() over (partition by t.author_id,
     (t.created_at at time zone 'UTC')::date
     order by t.created_at,t.comment_id,t.user_id) as daily_rank from pair_day_thanks t
 ), valid_solutions as (
   select c.author_id,s.post_id,s.created_at
   from public.accepted_solutions s join public.comments c on c.id = s.comment_id
   join active_posts p on p.id = s.post_id and c.post_id = p.id
   where c.author_id = any(p_user_ids) and c.author_id <> p.author_id and p.post_type = 'question'
 ), ranked_solutions as (
   select s.author_id,row_number() over (partition by s.author_id,
     (s.created_at at time zone 'UTC')::date order by s.created_at,s.post_id) as daily_rank
   from valid_solutions s
 ), totals as (
   select profile.id,
     (select count(*)::integer * 2 from ranked_posts p
       where p.author_id = profile.id and p.daily_rank <= 3) as post_points,
     (select count(*)::integer * 2 from ranked_answers a
       where a.author_id = profile.id and a.daily_rank <= 5) as answer_points,
     (select count(*)::integer * 3 from ranked_resources r
       where r.author_id = profile.id and r.daily_rank <= 2) as resource_points,
     (select count(*)::integer * 5 from ranked_thanks t
       where t.author_id = profile.id and t.daily_rank <= 10) as gratitude_points,
     (select count(*)::integer * 15 from ranked_solutions s
       where s.author_id = profile.id and s.daily_rank <= 3) as solution_points,
     (select count(*)::integer from valid_thanks t where t.author_id = profile.id) as gratitude_count,
     (select count(*)::integer from valid_solutions s where s.author_id = profile.id) as solution_count
   from public.profiles profile where profile.id = any(p_user_ids)
 )
 select t.id,t.post_points+t.answer_points+t.resource_points+t.gratitude_points+t.solution_points,
   t.post_points,t.answer_points,t.resource_points,t.gratitude_points,t.solution_points,
   t.gratitude_count,t.solution_count from totals t;
end $$;
revoke all on function public.contribution_scores(uuid[])
 from public, anon, authenticated, service_role;
grant execute on function public.contribution_scores(uuid[]) to anon, authenticated;

-- The invoker view retains comments' existing RLS. Only the narrow aggregate
-- helper can see private gratitude records, without exposing donor identities.
create view public.comment_contribution_directory with (security_invoker = true) as
select c.*, m.thanks_count,m.my_thanks_tag,m.is_solution
from public.comments c cross join lateral public.comment_contribution_metrics(array[c.id]) m;
revoke all on public.comment_contribution_directory from public, anon, authenticated;
grant select on public.comment_contribution_directory to anon, authenticated;

create function public.post_accepted_solution(p_post_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
 select s.comment_id from public.accepted_solutions s
 join public.posts p on p.id = s.post_id where s.post_id = p_post_id;
$$;
revoke all on function public.post_accepted_solution(uuid)
 from public, anon, authenticated, service_role;
grant execute on function public.post_accepted_solution(uuid) to anon, authenticated;

create or replace view public.post_directory with (security_invoker = true) as
select p.id, p.author_id, profile.username as author_username, profile.full_name as author_name,
 profile.avatar_url as author_avatar_url, p.community_id, community.slug as community_slug,
 community.name as community_name, p.post_type, p.title, p.body, p.code_language,
 p.code_snippet, p.tags, p.created_at, p.updated_at,
 (select count(*)::integer from public.comments c where c.post_id = p.id) as comment_count,
 (select count(*)::integer from public.post_reactions r where r.post_id = p.id) as like_count,
 community.archived_at as community_archived_at, p.resources,
 p.channel_id, ch.name as channel_name, ch.is_read_only as channel_is_read_only,
 ch.archived_at as channel_archived_at, public.post_accepted_solution(p.id) as accepted_comment_id
from public.posts p join public.profiles profile on profile.id = p.author_id
left join public.communities community on community.id = p.community_id
left join public.community_channels ch on ch.id = p.channel_id and ch.community_id = p.community_id;

comment on function public.contribution_scores(uuid[]) is
 'Current active public content: posts +2 (3/day), resource bonus +3 (2/day), first reply on another author publication +2 (5/day), gratitude +5 (one per donor/recipient/day and question, 10/day), accepted solution +15 (3/day). UTC ceilings; no self-interaction or client-written balance.';
notify pgrst, 'reload schema';
