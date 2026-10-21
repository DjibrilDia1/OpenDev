import { supabase } from '../../lib/supabase'
import type { PostResource } from '../../types/post'

export type FileResource = Extract<PostResource, { kind: 'image' | 'document' }>
export interface DraftFileResource {
  id: string
  kind: 'image' | 'document'
  file: File
  name: string
  mimeType: string
  extension: string
  previewUrl: string
}

export function prepareResource(
  file: File,
  kind: DraftFileResource['kind'],
): DraftFileResource {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const imageTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }
  const documentTypes: Record<string, string> = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
  }
  const mimeType = (kind === 'image' ? imageTypes : documentTypes)[extension]
  const acceptedType =
    file.type === mimeType ||
    (kind === 'document' &&
      (!file.type || (extension === 'md' && file.type === 'text/plain')))
  if (!mimeType || !acceptedType)
    throw new Error(
      kind === 'image'
        ? 'Choisis une image JPG, PNG ou WebP.'
        : 'Choisis un document PDF, TXT ou Markdown.',
    )
  const limit = kind === 'image' ? 5 : 10
  if (!file.size || file.size > limit * 1024 * 1024)
    throw new Error(
      `Chaque ${kind === 'image' ? 'image' : 'document'} doit peser entre 1 octet et ${limit} Mo.`,
    )
  return {
    id: crypto.randomUUID(),
    kind,
    file,
    name: Array.from(file.name).slice(0, 180).join('') || 'Fichier',
    mimeType,
    extension: extension === 'jpeg' ? 'jpg' : extension,
    previewUrl: URL.createObjectURL(file),
  }
}

export async function requireResourceIdentity(expectedUserId: string) {
  if (!supabase) throw new Error('La connexion au stockage est indisponible.')
  const { data: identity, error: identityError } = await supabase.auth.getUser()
  const { data: session, error: sessionError } =
    await supabase.auth.getSession()
  if (
    identityError ||
    sessionError ||
    identity.user?.id !== expectedUserId ||
    session.session?.user.id !== expectedUserId
  )
    throw new Error(
      'Ta session a changé ou a expiré. Reconnecte-toi avant de publier.',
    )
}

export async function uploadPostResource(
  draft: DraftFileResource,
  expectedUserId: string,
): Promise<FileResource> {
  await requireResourceIdentity(expectedUserId)
  if (!supabase) throw new Error('La connexion au stockage est indisponible.')
  const path = `${expectedUserId}/${draft.id}.${draft.extension}`
  const uploadFile =
    draft.file.type === draft.mimeType
      ? draft.file
      : new File([draft.file], draft.file.name, {
          type: draft.mimeType,
          lastModified: draft.file.lastModified,
        })
  const { error } = await supabase.storage
    .from('post-resources')
    .upload(path, uploadFile, {
      contentType: draft.mimeType,
      upsert: false,
      cacheControl: '3600',
    })
  const alreadyUploaded =
    error?.statusCode === '409' ||
    (error && 'code' in error && error.code === 'Duplicate')
  if (error && !alreadyUploaded)
    throw new Error(
      `Impossible d’envoyer « ${draft.name} ». Réessaie sans fermer ta publication.`,
    )
  return {
    kind: draft.kind,
    path,
    name: draft.name,
    mime_type: draft.mimeType,
    size: draft.file.size,
  }
}
