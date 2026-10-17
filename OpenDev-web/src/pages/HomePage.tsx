import { usePeople } from '../state/store'
import { useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { HeroBanner } from '../components/feed/HeroBanner'
import { CreatePost } from '../components/feed/CreatePost'
import { PostCard } from '../components/feed/PostCard'
import { EmptyState } from '../components/common/EmptyState'
import { useDemo } from '../state/store'
import { publicationTime } from '../state/catalog'
import { feedScore } from '../lib/recommendations'
export function HomePage() {
  const people = usePeople()
  const { state, allPosts } = useDemo()
  const [params, setParams] = useSearchParams()
  const filter = params.get('fil') ?? 'pour-toi'
  const score = (post: (typeof allPosts)[number]) =>
    feedScore(post, { following: state.following, joined: state.joined, interests: state.interests, technologies: state.profile.tags ?? [] })
  const visible =
    filter === 'abonnements'
      ? allPosts.filter(
          (post) =>
            state.signedIn &&
            (state.joined.includes(post.communitySlug ?? '') || state.following.includes(post.author.id ?? '') ||
              people.some(
                (user) =>
                  user.handle === post.author.handle &&
                  state.following.includes(user.id),
              )),
        )
      : filter === 'recents'
        ? [...allPosts].sort((a, b) => publicationTime(b) - publicationTime(a))
        : [...allPosts].sort(
            (a, b) =>
              score(b) - score(a) || publicationTime(b) - publicationTime(a),
          )
  return (
    <AppLayout>
      <div className="feed-page">
        <HeroBanner />
        <h1 className="sr-only">Accueil</h1>
        <div className="tabs" aria-label="Filtrer les publications">
          {[
            ['pour-toi', 'Pour toi'],
            ['abonnements', 'Abonnements'],
            ['recents', 'Récents'],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={filter === key}
              className={filter === key ? 'active' : ''}
              onClick={() => setParams({ fil: key })}
            >
              {label}
            </button>
          ))}
        </div>
        <CreatePost />
        <div className="post-list">
          {visible.map((post) => (
            <PostCard post={post} key={post.id} />
          ))}
          {!visible.length && (
            <EmptyState
              title="Ton réseau commence ici"
              description="Rejoins une communauté ou suis des développeurs pour retrouver leurs publications."
              to="/decouvrir"
            />
          )}
        </div>
        <p className="feed-end">
          Tu es à jour. Et si tu partageais une découverte ?
        </p>
      </div>
    </AppLayout>
  )
}
