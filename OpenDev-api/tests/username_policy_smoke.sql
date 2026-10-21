-- Development fixtures and writes are rolled back, including Auth trigger effects.
begin;
set local statement_timeout = '20s';
select set_config('opendev.username_a', gen_random_uuid()::text, true);
select set_config('opendev.username_b', gen_random_uuid()::text, true);
insert into auth.users (id, raw_user_meta_data)
values (current_setting('opendev.username_a')::uuid,
        jsonb_build_object('username','É-' || left(current_setting('opendev.username_a'),12))),
       (current_setting('opendev.username_b')::uuid, '{}');

do $$
begin
 if not exists (select 1 from public.profiles
   where id=current_setting('opendev.username_a')::uuid
   and username='é-' || left(current_setting('opendev.username_a'),12)) then
   raise exception 'Signup trigger must preserve Unicode lowercase names';
 end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('opendev.username_a'), true);
do $$
declare candidate text; affected integer; short_name text;
begin
 select chr(codepoint) into short_name from generate_series(57344, 63743) codepoint
 where not exists (select 1 from public.profiles where username=chr(codepoint)) limit 1;
 if short_name is null then raise exception 'No single-character fixture available'; end if;
 update public.profiles set username=short_name where id=auth.uid();
 foreach candidate in array array['x', 'équipe dev', '名字', '🐍', '*_%', 'a,"b\c', repeat('🐍',30)] loop
   continue when exists (select 1 from public.profiles where username=candidate and id<>auth.uid());
   update public.profiles set username=candidate where id=auth.uid();
   if not exists (select 1 from public.profiles where id=auth.uid() and username=candidate) then
     raise exception 'Valid username was not stored literally';
   end if;
 end loop;
 foreach candidate in array array['', ' ', 'Uppercase', 'É', repeat('é',31)] loop
   begin
     update public.profiles set username=candidate where id=auth.uid();
     raise exception 'Invalid username was accepted';
   exception when check_violation then null;
   end;
 end loop;
 update public.profiles set username=short_name where id=auth.uid();
 perform set_config('opendev.username_short', short_name, true);
 update public.profiles set username='not-owned' where id=current_setting('opendev.username_b')::uuid;
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'Username update bypassed RLS'; end if;
end $$;

select set_config('request.jwt.claim.sub', current_setting('opendev.username_b'), true);
do $$
begin
 begin
   update public.profiles set username=current_setting('opendev.username_short') where id=auth.uid();
   raise exception 'Duplicate usernames were accepted';
 exception when unique_violation then null;
 end;
end $$;
rollback;
select 'PASS: lowercase Unicode usernames, exact literals, limits, uniqueness and owner RLS; rolled back' as result;
