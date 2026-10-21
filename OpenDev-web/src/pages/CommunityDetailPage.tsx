import { usePeople } from '../state/store'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CommunityEditor } from '../components/community/CommunityEditor'
import { CommunityCalendar } from '../components/community/CommunityCalendar'
import { CommunityMembers } from '../components/community/CommunityMembers'
import { LiveCommunitySidebar } from '../components/community/LiveCommunitySidebar'
import { CommunityChannels } from '../components/community/CommunityChannels'
import {
  useCommunityAccess,
  useCommunityPreview,
} from '../components/community/communityAccess'
import { AppLayout } from '../components/layout/AppLayout'
import { CreatePost } from '../components/feed/CreatePost'
import { PostCard } from '../components/feed/PostCard'
import { CommunityEmblem } from '../components/common/CommunityEmblem'
import { CommunityVisibility } from '../components/common/CommunityVisibility'
import { EmptyState } from '../components/common/EmptyState'
import { PersonRow } from '../components/profile/PersonRow'
import { BellIcon } from '../components/common/Icons'
import { communityArt, matches } from '../state/catalog'
import {
  useCommunities,
  useDemo,
  toggleItem,
  canReadCommunity,
  canAdministerCommunity,
  isCommunityMember,
} from '../state/store'

export function CommunityDetailPage() {
  const people = usePeople()
  const [editing, setEditing] = useState(false)
  const [memberRevision, setMemberRevision] = useState(0)
  const communityCatalog = useCommunities()
  const { slug } = useParams()
  const { state, update, allPosts, toggleJoin, requireAuth, remote, notify } =
    useDemo()
  const [notificationBusy, setNotificationBusy] = useState(false)
  const [params, setParams] = useSearchParams()
  const community = communityCatalog.find((item) => item.slug === slug)
  const accessState = useCommunityAccess(community?.id)
  const preview = useCommunityPreview(
    remote ? community?.id : undefined,
    state.joined.join(',') + state.profile.id + memberRevision,
  )
  const activeSlug = community?.slug
  useEffect(() => {
    if (
      state.signedIn &&
      activeSlug &&
      !state.readCommunities.includes(activeSlug)
    ) {
      update((previous) => ({
        ...previous,
        readCommunities: [...previous.readCommunities, activeSlug],
      }))
    }
  }, [activeSlug, state.signedIn, state.readCommunities, update])
  if (!community)
    return (
      <AppLayout>
        <EmptyState
          title="Cette communauté n’existe pas"
          description="Retrouve les communautés disponibles dans Découvrir."
          to="/decouvrir"
        />
      </AppLayout>
    )
  const joined = isCommunityMember(state, community)
  const readable = canReadCommunity(state, community)
  const pending =
    state.signedIn &&
    state.joinRequests[community.slug]?.includes(state.profile.id)
  const isOwner = state.signedIn && community.ownerId === state.profile.id
  const tab = params.get('onglet') ?? 'general'
  const canAdminister = canAdministerCommunity(state, community)
  const team = [
    {
      userId: community.ownerId ?? 'usr-mod',
      role:
        community.kind === 'member' ? 'Propriétaire' : 'Administration OpenDev',
    },
    ...(community.staff ?? []),
  ]
  const query = params.get('q') ?? ''
  const posts = allPosts.filter(
    (post) =>
      post.communitySlug === slug &&
      matches(post.title + ' ' + post.content, query) &&
      (tab === 'general' ||
        (tab === 'discussions' && post.category === 'Discussion') ||
        (tab === 'questions' && post.category === 'Question · Entraide') ||
        (tab === 'projets' && post.category === 'Projet · Collaboration') ||
        (tab === 'ressources' && post.category === 'Ressource')),
  )
  function change(key: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.set(key, value)
        return next
      },
      { replace: true },
    )
  }
  const authors = new Set(
    allPosts
      .filter((post) => post.communitySlug === slug)
      .map((post) => post.author.handle),
  )
  const members = people.filter((user) =>
    user.isSelf
      ? joined
      : team.some((member) => member.userId === user.id) ||
        community.memberIds?.includes(user.id) ||
        authors.has(user.handle) ||
        (community.kind !== 'member' &&
          user.tags?.some((tag) => matches(tag, community.name))),
  )
  const tabs = (
    <div className="tabs">
      {[
        ['general', remote ? 'Tout' : 'Général'],
        ['discussions', 'Discussions'],
        ['questions', 'Entraide'],
        ['projets', 'Projets'],
        ['ressources', 'Ressources'],
        ['membres', 'Membres'],
      ].map(([key, label]) => (
        <button
          key={key}
          className={key === tab ? 'active' : ''}
          aria-pressed={key === tab}
          onClick={() => change('onglet', key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
  const sidebar = remote ? (
    <LiveCommunitySidebar
      community={community}
      members={preview.members}
      staff={preview.staff}
      error={preview.error}
      onMembers={() => change('onglet', 'membres')}
    />
  ) : (
    <aside className="right-sidebar">
      <CommunityCalendar community={community} />
      <section>
        <h2>À propos de {community.name}</h2>
        <p className="muted mt-3">{community.description}</p>
        <p className="small muted mt-4">
          {community.memberCount}
          <br />
          {community.weeklyDiscussionsCount} discussions cette semaine
        </p>
      </section>
      <section>
        <h2>Un espace pour progresser</h2>
        <ul className="community-rules">
          <li>Partage tes découvertes, même les petites.</li>
          <li>Donne du contexte à tes questions.</li>
          <li>Discute des idées avec bienveillance.</li>
        </ul>
        <Link className="text-button" to="/regles">
          Lire les règles de la communauté
        </Link>
      </section>
      <section>
        <h2>La prochaine discussion ?</h2>
        <p className="muted mt-2">
          Elle pourrait commencer par ta question. Tous les niveaux sont les
          bienvenus.
        </p>
      </section>
    </aside>
  )
  return (
    <AppLayout customRightSidebar={sidebar}>
      <div className="community-detail">
        <Link className="back-link" to="/decouvrir">
          ← Toutes les communautés
        </Link>
        <div className="community-detail-cover">
          <img
            src={community.coverUrl || communityArt(community.category)}
            alt=""
            width={900}
            height={220}
          />
          <span>{community.category}</span>
          {canAdminister && (
            <button
              className="button secondary compact edit-community-cover"
              onClick={() => setEditing(true)}
            >
              ✎ Modifier la couverture
            </button>
          )}
        </div>
        <header className="community-detail-header">
          <CommunityEmblem name={community.name} size={64} />
          <div className="row justify-between">
            <div>
              <h1>{community.name}</h1>
              <button
                className="text-button community-header-member-link"
                onClick={() => change('onglet', 'membres')}
              >
                {community.memberCount}
              </button>
            </div>
            <div className="row">
              {joined && (
                <button
                  className="icon-button"
                  aria-label={
                    (
                      remote
                        ? !accessState.access?.notifications_enabled
                        : state.mutedCommunities.includes(community.slug)
                    )
                      ? 'Activer les notifications'
                      : 'Désactiver les notifications'
                  }
                  aria-pressed={
                    remote
                      ? !!accessState.access?.notifications_enabled
                      : !state.mutedCommunities.includes(community.slug)
                  }
                  disabled={
                    notificationBusy || (!!remote && !accessState.access)
                  }
                  onClick={async () => {
                    if (remote) {
                      if (
                        !requireAuth() ||
                        !accessState.access ||
                        notificationBusy
                      )
                        return
                      setNotificationBusy(true)
                      try {
                        await remote.request(
                          `/communities/${community.id}/notifications`,
                          'PATCH',
                          {
                            enabled: !accessState.access.notifications_enabled,
                          },
                        )
                        accessState.reload()
                        await remote.refresh()
                      } catch (cause) {
                        notify(
                          cause instanceof Error
                            ? cause.message
                            : 'Modification impossible.',
                        )
                      } finally {
                        setNotificationBusy(false)
                      }
                      return
                    }
                    if (requireAuth())
                      update((previous) => ({
                        ...previous,
                        mutedCommunities: toggleItem(
                          previous.mutedCommunities,
                          community.slug,
                        ),
                      }))
                  }}
                >
                  <BellIcon />
                </button>
              )}
              <button
                className={'button ' + (joined ? 'secondary' : '')}
                disabled={isOwner}
                aria-pressed={joined}
                onClick={() => toggleJoin(community.slug)}
              >
                {isOwner
                  ? 'Administrateur'
                  : joined
                    ? '✓ Membre'
                    : pending
                      ? 'Annuler la demande'
                      : community.visibility === 'private'
                        ? 'Demander à rejoindre'
                        : 'Rejoindre'}
              </button>
            </div>
          </div>
          <p className="community-intro">{community.description}</p>
          <div className="community-ownership">
            <span className="community-kind">
              <CommunityVisibility visibility={community.visibility} />
            </span>
            <span
              className={
                'community-kind ' +
                (community.kind === 'member' ? 'member' : '')
              }
            >
              {community.kind === 'member'
                ? 'Communauté de membre'
                : 'Administrée par OpenDev'}
            </span>
            {community.kind === 'member' && (
              <span className="small muted">
                Administrée par {community.ownerName}
              </span>
            )}
            {canAdminister && (
              <button
                className="button secondary compact"
                onClick={() => setEditing(true)}
              >
                ⚙ Modifier et gérer
              </button>
            )}
          </div>
        </header>
        {!readable ? (
          <section className="surface mt-4">
            <h2>Cette communauté est privée</h2>
            <p className="muted mt-2">
              Les discussions, les membres et le calendrier sont réservés aux
              membres. Demande à rejoindre cet espace pour y accéder.
            </p>
            {pending && (
              <p role="status" className="mt-3">
                Ta demande attend la validation d’un administrateur.
              </p>
            )}
          </section>
        ) : (
          <>
            {!remote && (
              <div className="community-calendar-mobile surface">
                <CommunityCalendar community={community} />
              </div>
            )}
            {remote && (
              <details className="community-sidebar-mobile surface">
                <summary>À propos, membres et événements</summary>
                {sidebar}
              </details>
            )}
            {remote ? (
              <CommunityChannels
                key={community.id + ':' + state.profile.id}
                communityId={community.id}
                communitySlug={community.slug}
                joined={joined}
                canEdit={
                  state.signedIn &&
                  (isOwner ||
                    !!accessState.access?.permissions.includes(
                      'edit_community',
                    ))
                }
                canPublishRestricted={
                  state.signedIn &&
                  (isOwner ||
                    !!accessState.access?.permissions.some(
                      (permission) =>
                        permission === 'edit_community' ||
                        permission === 'moderate_posts',
                    ))
                }
                tab={tab}
                query={query}
                onQueryChange={(value) => change('q', value)}
                onJoin={() => toggleJoin(community.slug)}
                tabs={tabs}
                members={
                  <CommunityMembers
                    key={community.id + ':' + joined + ':' + memberRevision}
                    communityId={community.id}
                  />
                }
              />
            ) : (
              <>
                {tabs}
                {tab === 'membres' ? (
                  remote ? (
                    <CommunityMembers
                      key={community.id + ':' + joined + ':' + memberRevision}
                      communityId={community.id}
                    />
                  ) : (
                    <section className="surface">
                      {members.map((user) => (
                        <PersonRow user={user} key={user.id} />
                      ))}
                      {!members.length && (
                        <EmptyState
                          title="La communauté se construit"
                          description="Rejoins cet espace pour apparaître parmi les premiers membres de la démo."
                        />
                      )}
                    </section>
                  )
                ) : (
                  <>
                    <div className="community-composer">
                      {joined ? (
                        <CreatePost key={slug} communitySlug={slug} />
                      ) : (
                        <div className="join-prompt">
                          <p>
                            Rejoins {community.name} pour participer à la
                            conversation.
                          </p>
                          <button
                            className="button compact"
                            onClick={() => toggleJoin(community.slug)}
                          >
                            Rejoindre la communauté
                          </button>
                        </div>
                      )}
                    </div>
                    <input
                      className="standalone-search"
                      aria-label="Rechercher dans les discussions"
                      value={query}
                      onChange={(event) => change('q', event.target.value)}
                      placeholder="Rechercher dans les discussions…"
                    />
                    <div className="post-list">
                      {posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          variant={tab === 'general' ? 'overview' : undefined}
                        />
                      ))}
                      {!posts.length && (
                        <EmptyState
                          title="La conversation est à écrire"
                          description="Aucune publication ne correspond à ce filtre. Change d’onglet ou lance la première discussion."
                        />
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
      {editing && (
        <CommunityEditor
          community={community}
          onClose={() => {
            setEditing(false)
            setMemberRevision((value) => value + 1)
            accessState.reload()
          }}
        />
      )}
    </AppLayout>
  )
}
