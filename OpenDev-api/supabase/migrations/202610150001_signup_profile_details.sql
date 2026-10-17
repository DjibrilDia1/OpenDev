-- Save only public profile fields supplied during registration.
-- Identity, username and permissions are never copied from user metadata.
create or replace function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    insert into public.profiles (id, username, full_name, headline, bio, location)
    values (
        new.id,
        'user-' || left(replace(new.id::text, '-', ''), 12),
        left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name',
                            new.raw_user_meta_data ->> 'name', '')), 100),
        left(btrim(coalesce(new.raw_user_meta_data ->> 'headline', '')), 140),
        left(btrim(coalesce(new.raw_user_meta_data ->> 'bio', '')), 1000),
        left(btrim(coalesce(new.raw_user_meta_data ->> 'location', '')), 100)
    )
    on conflict (id) do nothing;
    return new;
end;
$$;
