import { usePeople } from '../state/store'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CommunityEditor } from '../components/community/CommunityEditor'
import { CommunityCalendar } from '../components/community/CommunityCalendar'
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
  const communityCatalog = useCommunities()
  const { slug } = useParams()
  const { state, update, allPosts, toggleJoin, requireAuth } = useDemo()
  const [params, setParams] = useSearchParams()
  const community = communityCatalog.find((item) => item.slug === slug)
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
  const tab = params.get('onglet') ?? 'discussions'
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
      (tab === 'discussions' ||
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
  const sidebar = (
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
              <p className="muted">{community.memberCount}</p>
            </div>
            <div className="row">
              {joined && (
                <button
                  className="icon-button"
                  aria-label={
                    state.mutedCommunities.includes(community.slug)
                      ? 'Activer les notifications'
                      : 'Désactiver les notifications'
                  }
                  aria-pressed={
                    !state.mutedCommunities.includes(community.slug)
                  }
                  onClick={() => {
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
              <CommunityVisibility visibility={community.visibility}/>
            </span>
            <span
              className={
                'community-kind ' +
                (community.kind === 'member' ? 'member' : '')
              }
            >
              {community.kind === 'member'
                ? 'Communauté de membre'
                : 'Officielle OpenDev'}
            </span>
            <span className="small muted">
              {community.kind === 'member'
                ? `Administrée par ${community.ownerName}`
                : 'Administrée par l’équipe OpenDev'}
            </span>
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
            <div className="community-calendar-mobile surface">
              <CommunityCalendar community={community} />
            </div>
            <section
              className="community-team surface"
              aria-label="Équipe de la communauté"
            >
              <h2>L’équipe de la communauté</h2>
              <div className="community-team-list">
                {team.map((member) => {
                  const person =
                    member.userId === state.profile.id
                      ? state.profile
                      : people.find((user) => user.id === member.userId)
                  return person ? (
                    <Link
                      key={member.userId}
                      to={'/profil/' + person.handle.replace('@', '')}
                    >
                      <strong>{person.name}</strong>
                      <span className="small muted">{member.role}</span>
                    </Link>
                  ) : null
                })}
              </div>
            </section>
            <div className="tabs">
              {[
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
            {tab === 'membres' ? (
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
                    <PostCard key={post.id} post={post} />
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
      </div>
      {editing && (
        <CommunityEditor
          community={community}
          onClose={() => setEditing(false)}
        />
      )}
    </AppLayout>
  )
}
