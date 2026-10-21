-- Official communities belong to an existing administrator profile. No Auth users,
-- posts or synthetic members are created by this migration.
alter table public.communities
    add column is_official boolean not null default false,
    add column category text not null default 'Open source'
        check (category in ('Frontend', 'Backend', 'Design', 'Contribution',
                            'Open source', 'IA & Data', 'DevOps', 'Mobile',
                            'Gaming', 'Sécurité'));

-- Keep the existing columns/order so consumers and existing grants are preserved.
create or replace view public.community_directory with (security_invoker = true) as
select c.id, c.slug, c.name, c.description, c.tags, c.created_by, c.created_at,
       count(m.user_id)::integer as member_count, c.is_official, c.category
from public.communities c
left join public.community_members m on m.community_id = c.id
group by c.id;

-- The owner may edit their community, but cannot award the official badge.
-- current_user is the database role selected by PostgREST, not editable user metadata.
create function public.protect_community_official_status()
returns trigger language plpgsql set search_path = '' as $$
begin
    if current_user in ('anon', 'authenticated') then
        if (tg_op = 'INSERT' and new.is_official)
           or (tg_op = 'UPDATE' and new.is_official is distinct from old.is_official) then
            raise exception 'Official community status requires an operator'
                using errcode = '42501';
        end if;
    end if;
    return new;
end;
$$;
revoke all on function public.protect_community_official_status() from public, anon, authenticated, service_role;
create trigger communities_protect_official_status
before insert or update on public.communities
for each row execute function public.protect_community_official_status();

-- Explicit operator bootstrap: call only after the human administrator has been
-- identified. SECURITY INVOKER + revoked execution prevents RPC privilege elevation.
-- Replays preserve administrator edits. A colliding member community is never claimed.
create function public.provision_official_communities(owner_id uuid)
returns table (id uuid, slug text, created boolean)
language plpgsql set search_path = '' as $$
declare
    item record;
    existing_id uuid;
    was_created boolean;
begin
    if owner_id is null or not exists (select 1 from public.profiles p where p.id = owner_id) then
        raise exception 'An existing administrator profile is required' using errcode = '22023';
    end if;

    -- This short operator action serializes the preflight and inserts, including
    -- concurrent member-created communities with one of the reserved slugs.
    lock table public.communities in share row exclusive mode;
    if exists (
        select 1 from public.communities c
        where c.slug in ('react', 'python', 'design-systems', 'open-source', 'typescript',
                         'fastapi', 'ia-data', 'devops-cloud', 'mobile', 'creative-coding',
                         'gamedev', 'security')
          and (not c.is_official or c.created_by <> owner_id)
    ) then
        raise exception 'An existing community conflicts with the official catalogue; review ownership first'
            using errcode = '23505';
    end if;

    for item in
        select * from (values
            ('react', 'React', 'Frontend',
             'Composants, hooks et bonnes pratiques. Construisons le web de demain.',
             array['react', 'javascript', 'frontend']),
            ('python', 'Python', 'Backend',
             'Du premier script à la production : data, API et automatisation.',
             array['python', 'backend', 'automatisation']),
            ('design-systems', 'Design Systems', 'Design',
             'Des interfaces cohérentes, accessibles et pensées pour durer.',
             array['design-systems', 'ui-ux', 'accessibilite']),
            ('open-source', 'Open Source', 'Open source',
             'Trouve un projet, fais ta première PR et construis avec la communauté.',
             array['open-source', 'git', 'contribution']),
            ('typescript', 'TypeScript', 'Frontend',
             'Des types qui aident vraiment. Partage tes patterns et tes questions.',
             array['typescript', 'javascript', 'frontend']),
            ('fastapi', 'FastAPI', 'Backend',
             'Des API Python claires, rapides et faciles à maintenir.',
             array['fastapi', 'python', 'api']),
            ('ia-data', 'IA & Data', 'IA & Data',
             'Expérimentations, modèles ouverts et données bien préparées.',
             array['intelligence-artificielle', 'data', 'machine-learning']),
            ('devops-cloud', 'DevOps & Cloud', 'DevOps',
             'Du premier conteneur au déploiement serein, apprenons ensemble.',
             array['devops', 'cloud', 'docker']),
            ('mobile', 'Mobile Makers', 'Mobile',
             'Construisons des applications mobiles qui font la différence.',
             array['mobile', 'react-native', 'flutter']),
            ('creative-coding', 'Creative Coding', 'Design',
             'Le code comme matière créative : web, interactions et mouvement.',
             array['design', 'animation', 'web']),
            ('gamedev', 'Game Dev', 'Gaming',
             'Prototypes, moteurs et petites aventures à créer ensemble.',
             array['gaming', 'godot', 'unity']),
            ('security', 'Security Lab', 'Sécurité',
             'Comprendre les vulnérabilités et construire des applications robustes.',
             array['cybersecurite', 'securite', 'web'])
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
        on conflict (community_id, user_id) do update set role = 'owner';
        id := existing_id;
        slug := item.slug;
        created := was_created;
        return next;
    end loop;
end;
$$;
revoke all on function public.provision_official_communities(uuid) from public, anon, authenticated, service_role;
comment on function public.provision_official_communities(uuid) is
    'Operator-only, idempotent provisioning of the 12 official communities for a verified existing administrator.';
