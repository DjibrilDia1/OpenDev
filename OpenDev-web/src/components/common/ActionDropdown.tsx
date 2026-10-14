import { useEffect, useRef, useState, type ReactNode } from 'react'

export function ActionDropdown({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDetailsElement>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !ref.current?.contains(event.target))
        ref.current?.removeAttribute('open')
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        ref.current?.removeAttribute('open')
        ref.current?.querySelector('summary')?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  return (
    <details
      className="action-dropdown"
      ref={ref}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="icon-button" aria-label={label} aria-expanded={open}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="4" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="20" cy="12" r="2" />
        </svg>
      </summary>
      <div
        className="action-dropdown-panel"
        onClick={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest('button,a')
          ) {
            ref.current?.removeAttribute('open')
            ref.current?.querySelector('summary')?.focus()
          }
        }}
      >
        {children}
      </div>
    </details>
  )
}
