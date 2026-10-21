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
  expectedUserId?: string,
): Promise<T> {
  const { data, error } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null }, error: null }
  if (error)
    throw new Error('Ta session ne peut pas être restaurée. Reconnecte-toi.')
  if (expectedUserId && data.session?.user.id !== expectedUserId)
    throw new Error('Ta session a changé. Réessaie depuis le compte connecté.')
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
    const domainMessage =
      response.status === 409 &&
      (method === 'POST' || method === 'PATCH') &&
      /^\/communities(?:\/[^/]+)?$/.test(path)
        ? 'Ce nom de communauté est déjà utilisé. Choisis un autre nom.'
        : response.status === 409 && /^\/events\/[^/]+\/rsvps\/me$/.test(path)
          ? 'L’événement est complet ou les inscriptions sont closes. Actualise le calendrier.'
          : response.status === 403 &&
              method === 'PUT' &&
              /^\/events\/[^/]+\/rsvps\/me$/.test(path)
            ? 'Rejoins la communauté pour participer à cet événement.'
            : response.status === 409 &&
                method === 'DELETE' &&
                /^\/communities\/[^/]+$/.test(path)
              ? 'Retire les publications et les événements de la communauté avant de la supprimer.'
              : response.status === 409 &&
                  method === 'PATCH' &&
                  /^\/events\/[^/]+$/.test(path)
                ? 'Vérifie le nombre de places : il ne peut pas être inférieur aux inscriptions déjà enregistrées.'
                : undefined
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
      domainMessage ||
        messages[response.status] ||
        'Le serveur ne peut pas effectuer cette action. Réessaie.',
    )
  }
  return response.status === 204 ? (undefined as T) : response.json()
}
