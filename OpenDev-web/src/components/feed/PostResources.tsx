import { useState } from 'react'
import type { PostResource } from '../../types/post'
import {
  formatResourceSize,
  postResourceFileUrl,
  safeResourceLink,
} from '../../lib/post-resources'
import { DownloadIcon, FilePdfIcon, ShareIcon } from '../common/Icons'
import { PostActionIcon } from '../common/PostActionIcon'
import { Modal } from '../common/Modal'
import './post-resources.css'

type ImageResource = Extract<PostResource, { kind: 'image' }>

function ResourceImage({ resource }: { resource: ImageResource }) {
  const [failed, setFailed] = useState(false)
  const url = postResourceFileUrl(resource.path)
  return failed || !url ? (
    <span className="post-resource-image-unavailable">
      Aperçu indisponible : {resource.name}
    </span>
  ) : (
    <img
      src={url}
      alt={resource.name}
      loading="lazy"
      decoding="async"
      width={720}
      height={480}
      onError={() => setFailed(true)}
    />
  )
}

export function PostResources({ resources }: { resources: PostResource[] }) {
  const [preview, setPreview] = useState<ImageResource | null>(null)
  const images = resources.filter((resource) => resource.kind === 'image')
  const others = resources.filter((resource) => resource.kind !== 'image')
  const previewUrl = preview && postResourceFileUrl(preview.path)
  if (!resources.length) return null
  return (
    <section
      className="post-resources"
      aria-label="Ressources de la publication"
    >
      {images.length > 0 && (
        <div
          className={
            'post-resource-gallery' +
            (images.length === 1 ? ' post-resource-gallery-single' : '')
          }
        >
          {images.map((resource) => (
            <button
              type="button"
              key={resource.path}
              onClick={() => setPreview(resource)}
              className="post-resource-image"
              aria-label={'Agrandir l’image : ' + resource.name}
            >
              <ResourceImage resource={resource} />
            </button>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <ul className="post-resource-list">
          {others.map((resource, index) => {
            if (resource.kind === 'link') {
              const url = safeResourceLink(resource.url)
              if (!url) return null
              return (
                <li key={url + index}>
                  <a
                    className="post-resource-link"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <PostActionIcon name="link" />
                    <span className="post-resource-description">
                      <strong>{resource.title}</strong>
                      <small>{new URL(url).hostname}</small>
                    </span>
                    <ShareIcon size={18} />
                    <span className="sr-only">
                      Ouvrir dans un nouvel onglet
                    </span>
                  </a>
                </li>
              )
            }
            const url = postResourceFileUrl(resource.path)
            const downloadUrl = postResourceFileUrl(
              resource.path,
              resource.name,
            )
            return (
              <li className="post-resource-document" key={resource.path}>
                <FilePdfIcon size={24} />
                <span className="post-resource-description">
                  <strong>{resource.name}</strong>
                  <small>
                    {resource.name.split('.').pop()?.toUpperCase()} ·{' '}
                    {formatResourceSize(resource.size)}
                  </small>
                </span>
                {url && downloadUrl ? (
                  <div className="post-resource-document-actions">
                    <a
                      className="button secondary compact"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={
                        'Ouvrir ' + resource.name + ' dans un nouvel onglet'
                      }
                    >
                      Ouvrir
                    </a>
                    <a
                      className="icon-button"
                      href={downloadUrl}
                      download={resource.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={'Télécharger ' + resource.name}
                      title="Télécharger"
                    >
                      <DownloadIcon size={18} />
                    </a>
                  </div>
                ) : (
                  <small className="muted">Fichier indisponible</small>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {preview && previewUrl && (
        <Modal
          title={preview.name}
          wide
          className="post-resource-preview"
          onClose={() => setPreview(null)}
        >
          <img src={previewUrl} alt={preview.name} />
          <a
            className="button secondary mt-4"
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ouvrir l’image dans un nouvel onglet
          </a>
        </Modal>
      )}
    </section>
  )
}
