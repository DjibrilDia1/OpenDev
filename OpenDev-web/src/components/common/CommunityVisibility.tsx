export function CommunityVisibility({
  visibility,
}: {
  visibility?: 'public' | 'private'
}) {
  const privateCommunity = visibility === 'private'
  return (
    <span className="community-visibility">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        {privateCommunity ? (
          <>
            <rect x="5" y="10" width="14" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <ellipse cx="12" cy="12" rx="4" ry="9" />
            <path d="M3 12h18M5 6.5h14M5 17.5h14" />
          </>
        )}
      </svg>
      {privateCommunity ? 'Privée' : 'Publique'}
    </span>
  )
}
