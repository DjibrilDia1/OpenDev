import { supabase } from './supabase'

export const liveMode = import.meta.env.VITE_DATA_MODE !== 'demo'
const base = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
export async function api<T = unknown>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const { data, error } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null }, error: null }
  if (error)
    throw new Error('Ta session ne peut pas être restaurée. Reconnecte-toi.')
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(data.session
        ? { Authorization: 'Bearer ' + data.session.access_token }
        : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: 'Reconnecte-toi pour continuer.',
      403: 'Tu n’as pas l’autorisation pour cette action.',
      404: 'Cette ressource est introuvable.',
      409: 'Ces données existent déjà ou cette action est impossible.',
      422: 'Vérifie les champs saisis.',
      503: 'Le service de données n’est pas encore disponible.',
    }
    throw new ApiError(
      response.status,
      messages[response.status] ||
        'Le serveur ne peut pas effectuer cette action. Réessaie.',
    )
  }
  return response.status === 204 ? (undefined as T) : response.json()
}
