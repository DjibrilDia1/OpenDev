export function authErrorMessage(cause: unknown): string {
  const code =
    typeof cause === 'object' && cause !== null && 'code' in cause
      ? String(cause.code)
      : ''
  const messages: Record<string, string> = {
    invalid_credentials: 'E-mail ou mot de passe incorrect.',
    email_not_confirmed: 'Confirme ton adresse e-mail avant de te connecter.',
    user_already_exists:
      'Un compte existe déjà avec cette adresse. Connecte-toi ou réinitialise ton mot de passe.',
    email_exists: 'Cette adresse est déjà utilisée.',
    weak_password:
      'Choisis un mot de passe plus robuste, avec au moins 8 caractères.',
    same_password: 'Choisis un mot de passe différent du précédent.',
    over_email_send_rate_limit:
      'Trop de demandes d’e-mail. Patiente quelques minutes avant de réessayer.',
    over_request_rate_limit:
      'Trop de tentatives. Patiente quelques minutes avant de réessayer.',
    otp_expired:
      'Ce lien a expiré ou a déjà été utilisé. Demande un nouvel e-mail.',
    session_not_found: 'Ta session a expiré. Reconnecte-toi.',
    reauthentication_needed:
      'Reconnecte-toi récemment avant de changer ton mot de passe.',
    signup_disabled: 'Les inscriptions sont momentanément fermées.',
    email_address_invalid: 'Cette adresse e-mail n’est pas valide.',
    email_address_not_authorized:
      'L’envoi d’e-mails n’est pas encore disponible pour cette adresse.',
    validation_failed: 'Vérifie les informations saisies puis réessaie.',
    request_timeout: 'La demande a pris trop de temps. Réessaie.',
    unexpected_failure:
      'La création du compte n’a pas abouti. Vérifie la disponibilité du nom d’utilisateur puis réessaie.',
    access_denied: 'La connexion a été annulée ou refusée. Tu peux réessayer.',
    bad_oauth_state:
      'Cette tentative de connexion a expiré. Recommence la connexion.',
    provider_disabled:
      'Ce fournisseur de connexion n’est pas disponible pour le moment.',
  }
  return (
    messages[code] ||
    'L’opération n’a pas abouti. Vérifie ta connexion puis réessaie.'
  )
}
