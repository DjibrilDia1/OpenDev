import { useCallback, useEffect, useRef } from 'react'
import { useDemo } from '../state/store'
import type {
  ActivityNotification,
  PrivateMessage,
} from '../types/communications'
import { profilePath } from '../state/catalog'

export function useCommunicationsApi() {
  const { remote } = useDemo()
  const remoteRef = useRef(remote)
  useEffect(() => {
    remoteRef.current = remote
  }, [remote])
  const request = useCallback(
    <T>(path: string, method?: string, body?: unknown) => {
      if (!remoteRef.current)
        return Promise.reject(new Error('Connecte-toi pour continuer.'))
      return remoteRef.current.request<T>(path, method, body)
    },
    [],
  )
  const refreshCounts = useCallback(async () => {
    await remoteRef.current?.refreshCommunicationCounts()
  }, [])
  return { request, refreshCounts }
}

export function mergeMessages(
  previous: PrivateMessage[],
  incoming: PrivateMessage[],
) {
  const messages = new Map(previous.map((message) => [message.id, message]))
  incoming.forEach((message) => messages.set(message.id, message))
  const sorted = [...messages.values()].sort((a, b) => a.sequence - b.sequence)
  return previous.length === sorted.length &&
    previous.every(
      (message, index) =>
        message.id === sorted[index].id && message.body === sorted[index].body,
    )
    ? previous
    : sorted
}

export function notificationDestination(item: ActivityNotification) {
  if (item.kind.startsWith('event_')) {
    const query = new URLSearchParams()
    if (item.community_slug) query.set('communaute', item.community_slug)
    if (item.event_id) query.set('evenement', item.event_id)
    return '/evenements' + (query.size ? '?' + query.toString() : '')
  }
  if (item.kind === 'message' && item.conversation_id)
    return `/messages?conversation=${encodeURIComponent(item.conversation_id)}`
  if (item.post_id) return `/publication/${encodeURIComponent(item.post_id)}`
  if (item.actor) return profilePath('@' + item.actor.username)
  return '/notifications'
}

export function notificationTimestamp(value: string) {
  // Preserve PostgreSQL microseconds when ordering or comparing cursor cutoffs.
  const fraction = value.match(/\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/)?.[1] ?? ''
  return (
    new Date(value).toISOString().slice(0, 19) + '.' + fraction.padEnd(6, '0')
  )
}

export function communicationTime(value: string | null, full = false) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(
    'fr-FR',
    full
      ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' },
  ).format(date)
}
