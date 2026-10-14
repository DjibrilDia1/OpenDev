import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Avatar } from '../components/common/Avatar'
import { EmptyState } from '../components/common/EmptyState'
import { FollowButton } from '../components/common/FollowButton'
import { PostCard } from '../components/feed/PostCard'
import { CreatePost } from '../components/feed/CreatePost'
import { CommunityCard } from '../components/community/CommunityCard'
import {
  ProfileEditor,
  ProjectEditor,
} from '../components/profile/ProfileEditor'
import {
  CodeIcon,
  MapPinIcon,
  GithubIcon,
  GlobeIcon,
} from '../components/common/Icons'
import { aminaProjects } from '../mocks/opendev-data'
import { findPerson, people, profilePath } from '../state/catalog'
import { useCommunities, useDemo } from '../state/store'
import type { Project } from '../types'

export function ProfilePage({ own = false }: { own?: boolean }) {
  const communityCatalog = useCommunities()
  const { handle = 'me' } = useParams()
  const { state, update, allPosts, openAuth, requireAuth, notify } = useDemo()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState(false)
  const [projectEditor, setProjectEditor] = useState<Project | 'new' | null>(
    null,
  )
  const navigate = useNavigate()
  const base = own ? state.profile : findPerson(handle)
  const self = own || !!base?.isSelf
  const user = self ? state.profile : base
  if (self && !state.signedIn)
    return (
      <AppLayout>
        <EmptyState
          title="Ton espace t’attend"
          description="Connecte-toi pour retrouver ton profil, tes projets et tes communautés."
        />
        <div className="centered">
          <button className="button" onClick={openAuth}>
            Se connecter
          </button>
        </div>
      </AppLayout>
    )
  if (!user)
    return (
      <AppLayout>
        <EmptyState
          title="Développeur introuvable"
          description="Ce profil n’existe pas dans la démo."
          to="/developpeurs"
          label="Découvrir des développeurs"
        />
      </AppLayout>
    )
  const posts = allPosts.filter((post) => post.author.handle === user.handle)
  const projects = self
    ? state.projects
    : user.id === 'usr-amina'
      ? aminaProjects
      : []
  const joined = communityCatalog.filter((community) =>
    self
      ? state.joined.includes(community.slug)
      : posts.some((post) => post.communitySlug === community.slug),
  )
  const tab = params.get('onglet') ?? 'publications'
  const path = self ? '/profil/me' : profilePath(user.handle)
  const followingCount = self
    ? state.following.length
    : people
        .filter((person) => !person.isSelf && person.id !== user.id)
        .slice(0, 4).length
  const followerCount = self
    ? people.filter((person) => person.followsYou).length
    : 4 + Number(state.signedIn && state.following.includes(user.id))
  const sidebar = (
    <aside className="right-sidebar">
      <section>
        <h2>Stack & compétences</h2>
        <div className="tags mt-4">
          {user.tags?.map((tag) => (
            <Link key={tag} to={'/recherche?q=' + encodeURIComponent(tag)}>
              {tag}
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2>Sur le web</h2>
        <div className="profile-links">
          {user.githubUrl && (
            <a href={user.githubUrl} target="_blank" rel="noreferrer">
              <GithubIcon /> GitHub ↗
            </a>
          )}
          {user.websiteUrl && (
            <a href={user.websiteUrl} target="_blank" rel="noreferrer">
              <GlobeIcon /> Portfolio ↗
            </a>
          )}
          {user.linkedinUrl && (
            <a href={user.linkedinUrl} target="_blank" rel="noreferrer">
              <GlobeIcon /> LinkedIn ↗
            </a>
          )}
          {!user.githubUrl && !user.websiteUrl && !user.linkedinUrl && (
            <p className="muted">Aucun lien partagé pour le moment.</p>
          )}
        </div>
      </section>
      {self && (
        <section>
          <h2>Ton expérience OpenDev</h2>
          <p className="muted mt-2">Tes intérêts donnent le ton de ton fil.</p>
          <div className="tags mt-3">
            {state.interests.map((topic) => (
              <span key={topic}>{topic}</span>
            ))}
          </div>
          <button
            className="text-button mt-4"
            onClick={() =>
              update((previous) => ({ ...previous, onboarded: false }))
            }
          >
            Modifier mes intérêts
          </button>
          <button
            className="text-button mt-4"
            onClick={() => {
              update((previous) => ({ ...previous, signedIn: false }))
              notify('Tu es déconnecté.')
              navigate('/')
            }}
          >
            Se déconnecter
          </button>
        </section>
      )}
    </aside>
  )
  function message() {
    if (!requireAuth() || !user) return
    let conversation = state.conversations.find(
      (item) => item.participant.id === user.id,
    )
    if (!conversation) {
      conversation = {
        id: 'conv-' + user.id,
        participant: {
          id: user.id,
          name: user.name,
          handle: user.handle,
          initials: user.avatarInitials,
          tag: user.tags?.[0] ?? '',
          isOnline: false,
          statusText: user.roleTitle,
        },
        lastMessage: '',
        time: '',
        messages: [],
      }
      const created = conversation
      update((previous) => ({
        ...previous,
        conversations: [...previous.conversations, created],
      }))
    }
    navigate('/messages?conversation=' + conversation.id)
  }
  return (
    <AppLayout customRightSidebar={sidebar}>
      <div className="profile-page">
        <div className="profile-banner" aria-hidden="true">
          <span>&lt;build. share. repeat /&gt;</span>
          <i />
          <b>✳</b>
        </div>
        <section className="profile-summary">
          <div className="profile-avatar-row">
            <Avatar
              initials={user.avatarInitials}
              size="lg"
              className="profile-avatar"
            />
            <div className="row">
              {self ? (
                <button
                  className="button secondary"
                  onClick={() => setEditing(true)}
                >
                  Modifier le profil
                </button>
              ) : (
                <>
                  <button className="button secondary" onClick={message}>
                    Message
                  </button>
                  <FollowButton user={user} />
                </>
              )}
            </div>
          </div>
          <h1>{user.name}</h1>
          <p className="muted">{user.handle}</p>
          <p className="profile-role">{user.roleTitle}</p>
          <p className="profile-bio">{user.bio}</p>
          <div className="profile-meta">
            {user.location && (
              <span>
                <MapPinIcon />
                {user.location}
              </span>
            )}
            {user.isAvailableForCollab && (
              <span>
                <i className="availability-dot" />
                Ouvert aux collaborations
              </span>
            )}
          </div>
          <div className="profile-stats">
            <Link to={path + '/abonnes'}>
              <strong>{followerCount}</strong> abonnés
            </Link>
            <Link to={path + '/abonnements'}>
              <strong>{followingCount}</strong> abonnements
            </Link>
            <span>
              <strong>{posts.length}</strong> publications
            </span>
          </div>
          <div className="profile-mobile-details">
            <div className="tags">
              {user.tags?.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <div className="profile-links">
              {user.githubUrl && (
                <a href={user.githubUrl} target="_blank" rel="noreferrer">
                  GitHub ↗
                </a>
              )}
              {user.websiteUrl && (
                <a href={user.websiteUrl} target="_blank" rel="noreferrer">
                  Portfolio ↗
                </a>
              )}
              {user.linkedinUrl && (
                <a href={user.linkedinUrl} target="_blank" rel="noreferrer">
                  LinkedIn ↗
                </a>
              )}
            </div>
            {self && (
              <div className="row wrap">
                <button
                  className="text-button"
                  onClick={() =>
                    update((previous) => ({ ...previous, onboarded: false }))
                  }
                >
                  Modifier mes intérêts
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    update((previous) => ({ ...previous, signedIn: false }))
                    navigate('/')
                  }}
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </section>
        <div className="tabs">
          {[
            ['publications', 'Publications'],
            ['projets', 'Projets'],
            ['communautes', 'Communautés'],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={tab === key}
              className={tab === key ? 'active' : ''}
              onClick={() => setParams({ onglet: key })}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'publications' ? (
          <>
            {self && <CreatePost />}
            <div className="post-list">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {!posts.length && (
                <EmptyState
                  title="Tout commence par une idée"
                  description={
                    self
                      ? 'Partage ta première découverte avec la communauté.'
                      : 'Ce développeur n’a pas encore publié.'
                  }
                />
              )}
            </div>
          </>
        ) : tab === 'projets' ? (
          <section>
            <div className="section-heading">
              <h2>Projets mis en avant</h2>
              {self && (
                <button
                  className="button compact"
                  onClick={() => setProjectEditor('new')}
                >
                  + Ajouter un projet
                </button>
              )}
            </div>
            <div className="projects-grid">
              {projects.map((project) => (
                <article className="project-card" key={project.id}>
                  <div className="row justify-between">
                    <CodeIcon size={24} />
                    {self && (
                      <button
                        className="text-button"
                        onClick={() => setProjectEditor(project)}
                      >
                        Modifier
                      </button>
                    )}
                  </div>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <div className="tags">
                    {project.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="project-links">
                    {project.repoUrl && (
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Code source ↗
                      </a>
                    )}
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Voir la démo ↗
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {!projects.length && (
              <EmptyState
                title="Un prochain projet à découvrir"
                description="Les projets mis en avant apparaîtront ici."
              />
            )}
          </section>
        ) : (
          <div className="communities-grid profile-communities">
            {joined.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
            {!joined.length && (
              <EmptyState
                title="De nouveaux espaces à explorer"
                description="Les communautés rejointes apparaîtront ici."
                to="/decouvrir"
              />
            )}
          </div>
        )}
      </div>
      {editing && <ProfileEditor onClose={() => setEditing(false)} />}
      {projectEditor && (
        <ProjectEditor
          project={projectEditor === 'new' ? undefined : projectEditor}
          onClose={() => setProjectEditor(null)}
        />
      )}
    </AppLayout>
  )
}
