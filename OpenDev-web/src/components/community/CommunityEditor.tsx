import { usePeople } from '../../state/store'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../common/Modal'
import { categories } from '../../state/catalog'
import {
  useCommunities,
  useDemo,
  toggleItem,
  canAdministerCommunity,
} from '../../state/store'
import type { Community } from '../../types'
import { LiveCommunityManager } from './LiveCommunityManager'

export function CommunityEditor({
  community,
  onClose,
}: {
  community?: Community
  onClose: () => void
}) {
  const { remote } = useDemo()
  return remote ? (
    <LiveCommunityManager community={community} onClose={onClose} />
  ) : (
    <DemoCommunityEditor community={community} onClose={onClose} />
  )
}
function DemoCommunityEditor({
  community,
  onClose,
}: {
  community?: Community
  onClose: () => void
}) {
  const people = usePeople()
  const { state, update, notify, remote } = useDemo()
  const communities = useCommunities()
  const navigate = useNavigate()
  const [name, setName] = useState(community?.name ?? '')
  const [description, setDescription] = useState(community?.description ?? '')
  const [category, setCategory] = useState<Community['category']>(
    community?.category ?? 'Frontend',
  )
  const [invited, setInvited] = useState<string[]>(
    community?.invitedUserIds ?? [],
  )
  const [error, setError] = useState('')
  const [promotionActive, setPromotionActive] = useState(
    community?.promotionActive ?? false,
  )
  const [visibility, setVisibility] = useState(
    community?.visibility ?? 'public',
  )
  const [coverUrl, setCoverUrl] = useState(community?.coverUrl ?? '')
  const [loadingCover, setLoadingCover] = useState(false)
  const [staff, setStaff] = useState<NonNullable<Community['staff']>>(
    community?.staff ?? [],
  )
  const canManageTeam =
    state.signedIn && (!community || community.ownerId === state.profile.id)
  const followers = people.filter(
    (person) => person.followsYou && !person.isSelf,
  )
  const canManage =
    state.signedIn && (!community || canAdministerCommunity(state, community))
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canManage) return
    if (name.trim().length < 3 || description.trim().length < 20) {
      setError(
        'Choisis un nom d’au moins 3 caractères et une description d’au moins 20 caractères.',
      )
      return
    }
    if (
      communities.some(
        (item) =>
          item.id !== community?.id &&
          item.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
      )
    ) {
      setError('Ce nom de communauté existe déjà.')
      return
    }
    const id = community?.id ?? crypto.randomUUID()
    const stem =
      name
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'communaute'
    const next: Community = {
      ...community,
      id,
      slug: community?.slug ?? `${stem}-${id.slice(0, 8)}`,
      name: name.trim(),
      description: description.trim(),
      category,
      kind: community?.kind ?? 'member',
      visibility,
      promotionActive,
      coverUrl: coverUrl || undefined,
      ownerId: community?.ownerId ?? state.profile.id,
      ownerName: community?.ownerName ?? state.profile.name,
      staff: canManageTeam ? staff : (community?.staff ?? []),
      invitedUserIds: invited,
      memberCount:
        community?.memberCount ??
        `${1 + staff.length} membre${staff.length ? 's' : ''}`,
      weeklyDiscussionsCount: community?.weeklyDiscussionsCount ?? 0,
      color: '#2457c5',
      bgColor: '#edf3ff',
    }
    if (remote) {
      if (
        visibility === 'private' ||
        coverUrl ||
        staff.length ||
        invited.length ||
        promotionActive
      ) {
        setError(
          'Cette première intégration prend en charge les communautés publiques avec un nom et une description. Les accès privés, rôles, images et promotions seront raccordés dans une prochaine étape.',
        )
        return
      }
      try {
        const saved = await remote.request<{ slug: string }>(
          community ? '/communities/' + community.id : '/communities',
          community ? 'PATCH' : 'POST',
          community
            ? { name: next.name, description: next.description }
            : {
                name: next.name,
                description: next.description,
                slug: next.slug.slice(0, 60),
                tags: [],
              },
        )
        await remote.refresh()
        onClose()
        navigate('/communaute/' + saved.slug)
        notify('Communauté enregistrée.')
        return
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Enregistrement impossible.',
        )
        return
      }
    }
    update((previous) => ({
      ...previous,
      communityOverrides: community
        ? { ...previous.communityOverrides, [next.slug]: next }
        : previous.communityOverrides,
      createdCommunities: community
        ? previous.createdCommunities.map((item) =>
            item.id === id ? next : item,
          )
        : [...previous.createdCommunities, next],
      joined: [...new Set([...previous.joined, next.slug])],
    }))
    notify(
      community
        ? 'Communauté mise à jour. Invitations conservées dans la démo.'
        : 'Communauté créée ! Tu en es l’administrateur.',
    )
    onClose()
    navigate('/communaute/' + next.slug)
  }
  return (
    <Modal
      title={community ? 'Gérer ma communauté' : 'Créer ma communauté'}
      onClose={onClose}
    >
      {canManage ? (
        <form className="community-editor" onSubmit={submit}>
          {remote && (
            <p className="small muted">
              Pour cette première étape, tu peux créer une communauté publique
              et modifier son nom et sa description. Les autres réglages seront
              disponibles ensuite.
            </p>
          )}
          <p className="muted small">
            Personnalise ton espace et choisis qui peut accéder à ses
            conversations.
          </p>
          <label>
            Nom
            <input
              required
              minLength={3}
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Visibilité
            <select
              value={visibility}
              disabled={!!remote}
              onChange={(event) =>
                setVisibility(event.target.value as 'public' | 'private')
              }
            >
              <option value="public">
                🌐 Publique — publications visibles par tous
              </option>
              <option value="private">🔒 Privée — réservée aux membres</option>
            </select>
          </label>
          <p className="small muted">
            En privé, l’adhésion nécessite l’accord d’un administrateur. Les
            membres actuels conservent leur accès.
          </p>
          <label>
            Couverture
            <input
              type="file"
              disabled={!!remote}
              accept="image/jpeg,image/png,image/webp"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                if (
                  !['image/jpeg', 'image/png', 'image/webp'].includes(
                    file.type,
                  ) ||
                  file.size > 5 * 1024 * 1024
                ) {
                  setError(
                    'Choisis une image JPG, PNG ou WebP de moins de 5 Mo.',
                  )
                  return
                }
                setLoadingCover(true)
                const url = URL.createObjectURL(file)
                try {
                  const image = new Image()
                  image.src = url
                  await image.decode()
                  const canvas = document.createElement('canvas')
                  const ratio = Math.min(1, 1400 / image.width)
                  canvas.width = Math.round(image.width * ratio)
                  canvas.height = Math.round(image.height * ratio)
                  canvas
                    .getContext('2d')!
                    .drawImage(image, 0, 0, canvas.width, canvas.height)
                  setCoverUrl(canvas.toDataURL('image/jpeg', 0.85))
                  setError('')
                } catch {
                  setError('Cette image ne peut pas être ouverte.')
                } finally {
                  URL.revokeObjectURL(url)
                  setLoadingCover(false)
                }
              }}
            />
          </label>
          {coverUrl && (
            <>
              <img
                className="cover-preview"
                src={coverUrl}
                alt="Aperçu de la couverture"
              />
              <button
                type="button"
                className="text-button"
                onClick={() => setCoverUrl('')}
              >
                Rétablir la couverture par défaut
              </button>
            </>
          )}
          <label>
            Catégorie
            <select
              value={category}
              disabled={!!remote}
              onChange={(event) =>
                setCategory(event.target.value as Community['category'])
              }
            >
              {categories
                .filter((item) => item !== 'Tout')
                .map((item) => (
                  <option key={item}>{item}</option>
                ))}
            </select>
          </label>
          <label>
            Description
            <textarea
              required
              minLength={20}
              maxLength={500}
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={promotionActive}
              disabled={!!remote}
              onChange={(event) => setPromotionActive(event.target.checked)}
            />
            Promouvoir la communauté dans la bannière d’accueil
          </label>
          <p className="small muted">
            La promotion affiche le nom et la description des communautés
            publiques. Désactive-la pour la retirer de l’accueil.
          </p>
          <fieldset disabled={!!remote}>
            <legend>Demandes d’adhésion</legend>
            {!community || !state.joinRequests[community.slug]?.length ? (
              <p className="small muted">Aucune demande en attente.</p>
            ) : (
              state.joinRequests[community.slug].map((id) => (
                <div className="staff-editor-row" key={id}>
                  <span>
                    {people.find((person) => person.id === id)?.name ??
                      (state.profile.id === id ? state.profile.name : 'Membre')}
                  </span>
                  <div className="row wrap">
                    {['Accepter', 'Refuser'].map((action) => (
                      <button
                        type="button"
                        className="text-button"
                        key={action}
                        onClick={() => {
                          update((previous) => ({
                            ...previous,
                            joinRequests: {
                              ...previous.joinRequests,
                              [community.slug]: (
                                previous.joinRequests[community.slug] ?? []
                              ).filter((userId) => userId !== id),
                            },
                            communityOverrides: {
                              ...previous.communityOverrides,
                              [community.slug]: {
                                ...(previous.communityOverrides[
                                  community.slug
                                ] ?? community),
                                memberIds:
                                  action === 'Accepter'
                                    ? [
                                        ...new Set([
                                          ...(community.memberIds ?? []),
                                          id,
                                        ]),
                                      ]
                                    : community.memberIds,
                              },
                            },
                          }))
                          notify(
                            action === 'Accepter'
                              ? 'Membre accepté.'
                              : 'Demande refusée.',
                          )
                        }}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </fieldset>
          <fieldset disabled={!!remote}>
            <legend>Inviter mes abonnés</legend>
            <p className="small muted">
              Invitations simulées, sans envoi réel. Les personnes invitées ne
              deviennent pas automatiquement membres.
            </p>
            {followers.length ? (
              followers.map((person) => (
                <label key={person.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={invited.includes(person.id)}
                    onChange={() => setInvited(toggleItem(invited, person.id))}
                  />
                  {person.name}
                  {community?.invitedUserIds?.includes(person.id)
                    ? ' · Invitation enregistrée'
                    : ''}
                </label>
              ))
            ) : (
              <p className="muted">Tes abonnés apparaîtront ici.</p>
            )}
          </fieldset>
          <fieldset disabled={!!remote}>
            <legend>Équipe d’administration</legend>
            <p className="small muted">
              Le propriétaire conserve la gestion des rôles. Les administrateurs
              modifient la communauté et modèrent ; les modérateurs gèrent les
              publications. Les nominations sont simulées et ajoutent ces
              personnes à l’équipe locale.
            </p>
            {canManageTeam ? (
              people
                .filter(
                  (person) =>
                    person.id !== (community?.ownerId ?? state.profile.id) &&
                    person.id !== 'usr-mod',
                )
                .map((person) => (
                  <label className="staff-editor-row" key={person.id}>
                    <span>{person.name}</span>
                    <select
                      aria-label={'Rôle de ' + person.name}
                      value={
                        staff.find((member) => member.userId === person.id)
                          ?.role ?? ''
                      }
                      onChange={(event) => {
                        const role = event.target.value
                        setStaff((previous) => [
                          ...previous.filter(
                            (member) => member.userId !== person.id,
                          ),
                          ...(role === 'Administrateur' || role === 'Modérateur'
                            ? [
                                {
                                  userId: person.id,
                                  role: role as 'Administrateur' | 'Modérateur',
                                },
                              ]
                            : []),
                        ])
                      }}
                    >
                      <option value="">Aucun rôle</option>
                      <option>Administrateur</option>
                      <option>Modérateur</option>
                    </select>
                  </label>
                ))
            ) : (
              <p className="small muted">
                Seul le propriétaire peut nommer ou retirer un administrateur ou
                un modérateur.
              </p>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="button" type="submit" disabled={loadingCover}>
            {community ? 'Enregistrer' : 'Créer la communauté'}
          </button>
        </form>
      ) : (
        <p>
          Connecte-toi avec le compte propriétaire pour gérer cette communauté.
        </p>
      )}
    </Modal>
  )
}
