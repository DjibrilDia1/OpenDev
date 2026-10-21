-- Private one-to-one conversations and server-authored notifications.
-- Application requests keep their caller JWT; guarded RPCs own atomic mutations.

create table public.direct_conversations (
    id uuid primary key default gen_random_uuid(),
    participant_low uuid not null references public.profiles (id) on delete cascade,
    participant_high uuid not null references public.profiles (id) on delete cascade,
    low_read_sequence bigint not null default 0 check (low_read_sequence >= 0),
    high_read_sequence bigint not null default 0 check (high_read_sequence >= 0),
    last_sequence bigint not null default 0 check (last_sequence >= 0),
    created_at timestamptz not null default clock_timestamp(),
    updated_at timestamptz not null default clock_timestamp(),
    constraint direct_conversations_ordered_pair check (participant_low < participant_high),
    check (low_read_sequence <= last_sequence and high_read_sequence <= last_sequence),
    unique (participant_low, participant_high)
);
create index direct_conversations_low_inbox_idx
    on public.direct_conversations (participant_low, updated_at desc, id);
create index direct_conversations_high_inbox_idx
    on public.direct_conversations (participant_high, updated_at desc, id);

create table public.direct_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.direct_conversations (id) on delete cascade,
    sender_id uuid not null references public.profiles (id) on delete cascade,
    body text not null check (char_length(body) between 1 and 5000 and body ~ '[^[:space:]]'),
    sequence bigint not null check (sequence > 0),
    client_id uuid not null,
    created_at timestamptz not null default clock_timestamp(),
    unique (conversation_id, sequence),
    unique (sender_id, client_id)
);

create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references public.profiles (id) on delete cascade,
    actor_id uuid references public.profiles (id) on delete set null,
    kind text not null check (kind in ('message', 'follow', 'comment', 'reaction')),
    conversation_id uuid references public.direct_conversations (id) on delete cascade,
    message_id uuid references public.direct_messages (id) on delete cascade,
    post_id uuid references public.posts (id) on delete cascade,
    comment_id uuid references public.comments (id) on delete cascade,
    created_at timestamptz not null default clock_timestamp(),
    read_at timestamptz,
    check (actor_id is null or actor_id <> recipient_id),
    check (
        (kind = 'message' and conversation_id is not null and message_id is not null
            and post_id is null and comment_id is null)
        or (kind = 'follow' and conversation_id is null and message_id is null
            and post_id is null and comment_id is null)
        or (kind = 'comment' and conversation_id is null and message_id is null
            and post_id is not null and comment_id is not null)
        or (kind = 'reaction' and conversation_id is null and message_id is null
            and post_id is not null and comment_id is null)
    )
);
create index notifications_recipient_cursor_idx
    on public.notifications (recipient_id, created_at desc, id desc);
create index notifications_unread_idx
    on public.notifications (recipient_id) where read_at is null;
create index notifications_conversation_idx
    on public.notifications (conversation_id, recipient_id);
create index notifications_message_idx on public.notifications (message_id);
create index notifications_actor_idx on public.notifications (actor_id);
create index notifications_post_idx on public.notifications (post_id);
create index notifications_comment_idx on public.notifications (comment_id);
create unique index notifications_message_unique
    on public.notifications (recipient_id, message_id) where kind = 'message';
-- Re-following / toggling a reaction does not manufacture duplicate notifications.
create unique index notifications_follow_unique
    on public.notifications (recipient_id, actor_id) where kind = 'follow';
create unique index notifications_comment_unique
    on public.notifications (recipient_id, comment_id) where kind = 'comment';
create unique index notifications_reaction_unique
    on public.notifications (recipient_id, actor_id, post_id) where kind = 'reaction';

alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;
alter table public.notifications enable row level security;
revoke all on public.direct_conversations, public.direct_messages, public.notifications
    from public, anon, authenticated;
grant select on public.direct_conversations, public.direct_messages, public.notifications
    to authenticated;

create policy direct_conversations_participant_read on public.direct_conversations
    for select to authenticated using (
        participant_low = (select auth.uid()) or participant_high = (select auth.uid())
    );
create policy direct_messages_participant_read on public.direct_messages
    for select to authenticated using (
        exists (select 1 from public.direct_conversations c
            where c.id = conversation_id
              and ((select auth.uid()) = c.participant_low
                   or (select auth.uid()) = c.participant_high))
    );
create policy notifications_recipient_read on public.notifications
    for select to authenticated using (recipient_id = (select auth.uid()));

-- Fixed search paths and explicit UID guards are required for every public RPC.
create function public.messaging_conversation(p_conversation_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
    v_uid uuid := auth.uid();
    v_result jsonb;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    select jsonb_build_object(
        'id', c.id,
        'participant', jsonb_build_object('id', p.id, 'username', p.username,
            'full_name', p.full_name, 'headline', p.headline, 'avatar_url', p.avatar_url),
        'last_message', latest.body,
        'last_message_at', latest.created_at,
        'unread_count', (select count(*) from public.direct_messages m
            where m.conversation_id = c.id and m.sender_id <> v_uid
              and m.sequence > case when c.participant_low = v_uid
                  then c.low_read_sequence else c.high_read_sequence end),
        'peer_read_sequence', case when c.participant_low = v_uid
            then c.high_read_sequence else c.low_read_sequence end
    ) into v_result
    from public.direct_conversations c
    join public.profiles p on p.id = case when c.participant_low = v_uid
        then c.participant_high else c.participant_low end
    left join lateral (
        select m.body, m.created_at from public.direct_messages m
        where m.conversation_id = c.id order by m.sequence desc limit 1
    ) latest on true
    where c.id = p_conversation_id and v_uid in (c.participant_low, c.participant_high);
    return v_result;
end $$;

create function public.messaging_conversations(p_limit integer default 50, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then
        raise exception 'Invalid pagination' using errcode = '22023';
    end if;
    select coalesce(jsonb_agg(public.messaging_conversation(page.id)
        order by page.updated_at desc, page.id desc), '[]'::jsonb) into v_result
    from (select c.id, c.updated_at from public.direct_conversations c
        where v_uid in (c.participant_low, c.participant_high)
        order by c.updated_at desc, c.id desc limit p_limit offset p_offset) page;
    return v_result;
end $$;

create function public.messaging_start(p_recipient_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    if p_recipient_id is null or p_recipient_id = v_uid
        or not exists (select 1 from public.profiles where id = p_recipient_id) then
        raise exception 'Invalid recipient' using errcode = '22023';
    end if;
    insert into public.direct_conversations (participant_low, participant_high)
    values (least(v_uid, p_recipient_id), greatest(v_uid, p_recipient_id))
    on conflict (participant_low, participant_high) do nothing
    returning id into v_id;
    if v_id is null then
        select id into v_id from public.direct_conversations
        where participant_low = least(v_uid, p_recipient_id)
          and participant_high = greatest(v_uid, p_recipient_id);
    end if;
    return public.messaging_conversation(v_id);
end $$;

create function public.messaging_messages(
    p_conversation_id uuid, p_before bigint default null, p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    if not exists (select 1 from public.direct_conversations c
        where c.id = p_conversation_id and v_uid in (c.participant_low, c.participant_high)) then
        raise exception 'Conversation unavailable' using errcode = '42501';
    end if;
    if p_limit is null or p_limit < 1 or p_limit > 100 or (p_before is not null and p_before < 1) then
        raise exception 'Invalid pagination' using errcode = '22023';
    end if;
    select coalesce(jsonb_agg(to_jsonb(page) order by page.sequence desc), '[]'::jsonb)
    into v_result from (select m.id, m.conversation_id, m.sender_id, m.body,
        m.sequence, m.client_id, m.created_at from public.direct_messages m
        where m.conversation_id = p_conversation_id
          and (p_before is null or m.sequence < p_before)
        order by m.sequence desc limit p_limit) page;
    return v_result;
end $$;

create function public.messaging_send(p_conversation_id uuid, p_body text, p_client_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
    v_uid uuid := auth.uid();
    v_conversation public.direct_conversations%rowtype;
    v_message public.direct_messages%rowtype;
    v_sequence bigint;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    if p_client_id is null or p_body is null or char_length(p_body) not between 1 and 5000
        or p_body !~ '[^[:space:]]' then
        raise exception 'Invalid message' using errcode = '22023';
    end if;
    -- Serializing a conversation gives committed messages an unambiguous read cursor.
    select * into v_conversation from public.direct_conversations c
        where c.id = p_conversation_id and v_uid in (c.participant_low, c.participant_high)
        for update;
    if not found then raise exception 'Conversation unavailable' using errcode = '42501'; end if;
    select * into v_message from public.direct_messages
        where sender_id = v_uid and client_id = p_client_id;
    if found then
        if v_message.conversation_id <> p_conversation_id or v_message.body <> p_body then
            raise exception 'Client identifier already used' using errcode = '22023';
        end if;
        return to_jsonb(v_message);
    end if;
    update public.direct_conversations set last_sequence = last_sequence + 1,
        updated_at = clock_timestamp() where id = p_conversation_id
        returning last_sequence into v_sequence;
    insert into public.direct_messages (conversation_id, sender_id, body, sequence, client_id)
    values (p_conversation_id, v_uid, p_body, v_sequence, p_client_id)
    on conflict (sender_id, client_id) do nothing returning * into v_message;
    if not found then
        select * into v_message from public.direct_messages
            where sender_id = v_uid and client_id = p_client_id;
        if v_message.conversation_id <> p_conversation_id or v_message.body <> p_body then
            raise exception 'Client identifier already used' using errcode = '22023';
        end if;
    end if;
    return to_jsonb(v_message);
end $$;

create function public.messaging_read(p_conversation_id uuid, p_sequence bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_conversation public.direct_conversations%rowtype; v_read bigint;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    select * into v_conversation from public.direct_conversations c
        where c.id = p_conversation_id and v_uid in (c.participant_low, c.participant_high)
        for update;
    if not found then raise exception 'Conversation unavailable' using errcode = '42501'; end if;
    if p_sequence is null or p_sequence < 0 or (p_sequence > 0 and not exists (
        select 1 from public.direct_messages where conversation_id = p_conversation_id
            and sequence = p_sequence)) then
        raise exception 'Invalid read cursor' using errcode = '22023';
    end if;
    v_read := greatest(p_sequence, case when v_conversation.participant_low = v_uid
        then v_conversation.low_read_sequence else v_conversation.high_read_sequence end);
    if v_conversation.participant_low = v_uid then
        update public.direct_conversations set low_read_sequence = v_read where id = p_conversation_id;
    else
        update public.direct_conversations set high_read_sequence = v_read where id = p_conversation_id;
    end if;
    update public.notifications n set read_at = clock_timestamp()
    where n.recipient_id = v_uid and n.conversation_id = p_conversation_id and n.read_at is null
        and exists (select 1 from public.direct_messages m
            where m.id = n.message_id and m.sequence <= v_read);
    return v_read;
end $$;

create function public.notification_list(
    p_before timestamptz default null, p_before_id uuid default null, p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    if p_limit is null or p_limit < 1 or p_limit > 100
        or (p_before is null) <> (p_before_id is null) then
        raise exception 'Invalid pagination' using errcode = '22023';
    end if;
    select coalesce(jsonb_agg(page.item order by page.created_at desc, page.id desc), '[]'::jsonb)
    into v_result from (
        select n.id, n.created_at, jsonb_build_object('id', n.id, 'kind', n.kind,
            'actor', case when p.id is null then null else jsonb_build_object('id', p.id,
                'username', p.username, 'full_name', p.full_name, 'avatar_url', p.avatar_url) end,
            'conversation_id', n.conversation_id, 'post_id', n.post_id,
            'created_at', n.created_at, 'read_at', n.read_at) item
        from public.notifications n left join public.profiles p on p.id = n.actor_id
        where n.recipient_id = v_uid and (p_before is null
            or (n.created_at, n.id) < (p_before, p_before_id))
        order by n.created_at desc, n.id desc limit p_limit
    ) page;
    return v_result;
end $$;

create function public.notification_read(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    update public.notifications set read_at = coalesce(read_at, clock_timestamp())
        where id = p_id and recipient_id = v_uid;
    return found;
end $$;

create function public.notification_read_all(p_before timestamptz)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_count integer;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    if p_before is null then raise exception 'Read cutoff required' using errcode = '22023'; end if;
    -- A future cutoff cannot silently mark notifications arriving later as read.
    update public.notifications set read_at = clock_timestamp()
        where recipient_id = v_uid and read_at is null
          and created_at <= least(p_before, clock_timestamp());
    get diagnostics v_count = row_count;
    return v_count;
end $$;

create function public.communication_counts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_messages bigint; v_notifications bigint;
begin
    if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
    select count(*) into v_messages from public.direct_conversations c
    join public.direct_messages m on m.conversation_id = c.id
    where v_uid in (c.participant_low, c.participant_high) and m.sender_id <> v_uid
      and m.sequence > case when c.participant_low = v_uid
          then c.low_read_sequence else c.high_read_sequence end;
    select count(*) into v_notifications from public.notifications
        where recipient_id = v_uid and read_at is null;
    return jsonb_build_object('messages_unread', v_messages, 'notifications_unread', v_notifications);
end $$;

-- Notifications are derived exclusively from accepted database events.
create function public.notify_direct_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_recipient uuid;
begin
    select case when c.participant_low = new.sender_id then c.participant_high
        else c.participant_low end into v_recipient
    from public.direct_conversations c where c.id = new.conversation_id
      and new.sender_id in (c.participant_low, c.participant_high);
    if v_recipient is null then raise exception 'Invalid sender' using errcode = '23514'; end if;
    insert into public.notifications (recipient_id, actor_id, kind, conversation_id, message_id)
        values (v_recipient, new.sender_id, 'message', new.conversation_id, new.id)
        on conflict do nothing;
    return new;
end $$;
create trigger direct_message_notification after insert on public.direct_messages
    for each row execute function public.notify_direct_message();

create function public.notify_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    if new.follower_id <> new.followed_id then
        insert into public.notifications (recipient_id, actor_id, kind)
            values (new.followed_id, new.follower_id, 'follow') on conflict do nothing;
    end if;
    return new;
end $$;
create trigger follow_notification after insert on public.follows
    for each row execute function public.notify_follow();

create function public.notify_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    insert into public.notifications (recipient_id, actor_id, kind, post_id, comment_id)
    select recipients.id, new.author_id, 'comment', new.post_id, new.id from (
        select p.author_id as id from public.posts p where p.id = new.post_id
        union
        select c.author_id from public.comments c where c.id = new.parent_comment_id
            and c.post_id = new.post_id
    ) recipients where recipients.id <> new.author_id on conflict do nothing;
    return new;
end $$;
create trigger comment_notification after insert on public.comments
    for each row execute function public.notify_comment();

create function public.notify_post_reaction()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    insert into public.notifications (recipient_id, actor_id, kind, post_id)
        select p.author_id, new.user_id, 'reaction', new.post_id from public.posts p
        where p.id = new.post_id and p.author_id <> new.user_id on conflict do nothing;
    return new;
end $$;
create trigger post_reaction_notification after insert on public.post_reactions
    for each row execute function public.notify_post_reaction();

-- PostgreSQL grants PUBLIC function execution by default: explicitly remove it.
revoke all on function public.messaging_conversation(uuid),
    public.messaging_conversations(integer, integer), public.messaging_start(uuid),
    public.messaging_messages(uuid, bigint, integer), public.messaging_send(uuid, text, uuid),
    public.messaging_read(uuid, bigint), public.notification_list(timestamptz, uuid, integer),
    public.notification_read(uuid), public.notification_read_all(timestamptz),
    public.communication_counts(), public.notify_direct_message(), public.notify_follow(),
    public.notify_comment(), public.notify_post_reaction() from public, anon, authenticated;
grant execute on function public.messaging_conversation(uuid),
    public.messaging_conversations(integer, integer), public.messaging_start(uuid),
    public.messaging_messages(uuid, bigint, integer), public.messaging_send(uuid, text, uuid),
    public.messaging_read(uuid, bigint), public.notification_list(timestamptz, uuid, integer),
    public.notification_read(uuid), public.notification_read_all(timestamptz),
    public.communication_counts() to authenticated;
