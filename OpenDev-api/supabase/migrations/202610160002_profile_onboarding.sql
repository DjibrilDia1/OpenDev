-- A chosen handle must be unique even when two users submit simultaneously.
create unique index profiles_username_case_insensitive_key
  on public.profiles (lower(username));

-- Existing members complete the prefilled popup once, alongside new accounts.
alter table public.profiles add column onboarding_completed_at timestamptz;
