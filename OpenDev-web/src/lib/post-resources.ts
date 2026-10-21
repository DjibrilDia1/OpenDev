import { supabase } from './supabase'

const storagePath =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(?:jpe?g|png|webp|pdf|txt|md)$/i

export function safeResourceLink(value: string): string | null {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}

export function postResourceFileUrl(
  path: string,
  download?: string,
): string | null {
  if (!supabase || !storagePath.test(path)) return null
  const { data } = supabase.storage
    .from('post-resources')
    .getPublicUrl(path, download ? { download } : undefined)
  return safeResourceLink(data.publicUrl)
}

export function formatResourceSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  return bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} Ko`
    : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} Mo`
}
