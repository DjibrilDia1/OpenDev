export function OpenDevLogo({ size = 30 }: { size?: number }) {
  return (
    <>
      <svg
        className="brand-symbol"
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      >
        <path d="M33 15c-9-9-24-2-24 10v14c0 13 15 20 24 10" />
        <path d="M31 15c9-9 24-2 24 10v14c0 13-15 20-24 10" />
        <path d="M24 32h16" />
      </svg>
      <strong>OpenDev</strong>
    </>
  )
}
