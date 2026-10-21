-- Keep direct authenticated RPC calls within the same seat limit as FastAPI.
alter table public.events add constraint events_capacity_limit
    check (capacity is null or capacity <= 100000);

create or replace function public.community_permissions(p_community_id uuid)
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
        'notifications_enabled', coalesce(v_member.notifications_enabled, false));
end $$;
revoke all on function public.community_permissions(uuid) from public, anon, authenticated;
grant execute on function public.community_permissions(uuid) to authenticated;
