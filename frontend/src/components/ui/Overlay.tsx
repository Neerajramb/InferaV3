import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { XIcon } from '@phosphor-icons/react'

import { cn } from '../../lib/format'

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])'

/** Escape to close, focus moves in on open and returns on close, Tab stays inside, page scroll locks. */
function useOverlayBehaviour(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current
      const target = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>(FOCUSABLE)
      target?.focus()
    })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
      }
      if (event.key === 'Tab' && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])

  return panelRef
}

interface OverlayProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, description, children, footer, className }: OverlayProps) {
  const panelRef = useOverlayBehaviour(open, onClose)
  const reduce = useReducedMotion()
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-modal flex items-end justify-center p-4 sm:items-center">
          <motion.div
            className="absolute inset-0 bg-[rgb(var(--shadow)/0.55)] backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn('relative w-full max-w-md rounded-panel border border-line bg-surface shadow-pop', className)}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, transition: { duration: 0.14, ease: [0.23, 1, 0.32, 1] } }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
              <div>
                <h2 className="text-base font-semibold text-fg">{title}</h2>
                {description && <p className="mt-1 text-sm leading-6 text-muted">{description}</p>}
              </div>
              <button onClick={onClose} className="-mr-1 -mt-1 rounded-control p-1.5 text-subtle transition-colors hover:bg-elevated hover:text-fg" aria-label="Close">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 pb-5 pt-2">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Sheet({ open, onClose, title, description, children, footer, className }: OverlayProps) {
  const panelRef = useOverlayBehaviour(open, onClose)
  const reduce = useReducedMotion()
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-modal">
          <motion.div
            className="absolute inset-0 bg-[rgb(var(--shadow)/0.5)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn('absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-line bg-surface shadow-pop sm:inset-y-2 sm:right-2 sm:rounded-panel sm:border', className)}
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%', transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] } }}
            transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold tracking-tight text-fg">{title}</h2>
                {description && <p className="mt-1 text-sm leading-6 text-muted">{description}</p>}
              </div>
              <button onClick={onClose} className="-mr-2 rounded-control p-2 text-subtle transition-colors hover:bg-elevated hover:text-fg" aria-label="Close">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
