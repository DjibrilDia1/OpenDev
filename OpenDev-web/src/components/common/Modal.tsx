import { useEffect, useId, useRef, type ReactNode } from 'react'

export function Modal({
  title,
  children,
  onClose,
  wide = false,
  hideTitle = false,
  className = '',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
  hideTitle?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement as HTMLElement | null
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = oldOverflow
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={(wide ? 'modal modal-wide' : 'modal') + ' ' + className}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.target === event.currentTarget &&
          (event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom)
        )
          onClose()
      }}
    >
      <div
        className={
          'modal-header' + (hideTitle ? ' modal-header-title-hidden' : '')
        }
      >
        <h2 id={titleId} className={hideTitle ? 'sr-only' : undefined}>
          {title}
        </h2>
        <button className="icon-button" aria-label="Fermer" onClick={onClose}>
          ✕
        </button>
      </div>
      {children}
    </dialog>
  )
}
