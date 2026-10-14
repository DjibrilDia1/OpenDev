import { useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { HeroBanner } from '../components/feed/HeroBanner'
import { CreatePost } from '../components/feed/CreatePost'
import { PostCard } from '../components/feed/PostCard'
import { EmptyState } from '../components/common/EmptyState'
import { useDemo } from '../state/store'
import { people, relatedCommunities, publicationTime } from '../state/catalog'
export function HomePage() {
  const { state, allPosts } = useDemo()
  const [params, setParams] = useSearchParams()
  const filter = params.get('fil') ?? 'pour-toi'
  const suggested = relatedCommunities(state.interests).map(
    (community) => community.slug,
  )
  const visible =
    filter === 'abonnements'
      ? allPosts.filter(
          (post) =>
            state.signedIn &&
            (state.joined.includes(post.communitySlug ?? '') ||
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
              Number(!!b.createdAt) - Number(!!a.createdAt) ||
              Number(suggested.includes(b.communitySlug ?? '')) -
                Number(suggested.includes(a.communitySlug ?? '')),
          )
  return (
    <AppLayout>
      <div className="feed-page">
        <HeroBanner />
        <div className="page-heading">
          <div>
            <h1>Le fil communautaire</h1>
            <p>Ce qu’on apprend. Ce qu’on construit. Ensemble.</p>
          </div>
        </div>
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
