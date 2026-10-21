-- Preferences are private to the account, unlike the public profile.
create table public.profile_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  interests text[] not null,
  constraint profile_interests_valid check (
    cardinality(interests) between 1 and 8
    and array_ndims(interests) = 1
    and array_position(interests, null) is null
    and interests <@ array[
      'Frontend', 'Backend', 'Full Stack', 'Intelligence artificielle',
      'Machine Learning', 'Data Science', 'DevOps', 'Cloud', 'Cybersécurité',
      'Mobile', 'Open Source', 'UI/UX', 'Gaming'
    ]::text[]
  )
);
alter table public.profile_preferences enable row level security;
revoke all on public.profile_preferences from anon, authenticated;
grant select, insert, update on public.profile_preferences to authenticated;

create policy profile_preferences_select_own on public.profile_preferences
for select to authenticated using (user_id = (select auth.uid()));
create policy profile_preferences_insert_own on public.profile_preferences
for insert to authenticated with check (user_id = (select auth.uid()));
create policy profile_preferences_update_own on public.profile_preferences
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
