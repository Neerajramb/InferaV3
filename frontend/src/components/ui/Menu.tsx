import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'

import { cn } from '../../lib/format'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
  hint?: ReactNode
}

interface MenuProps {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu'; 'aria-controls': string }) => ReactNode
  items: (MenuItem | 'divider')[]
  align?: 'start' | 'end'
  side?: 'bottom' | 'top'
  className?: string
}

/** Dropdown that scales from its trigger, with arrow-key navigation. */
export function Menu({ trigger, items, align = 'end', side = 'bottom', className }: MenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        buttons[(index + 1) % buttons.length]?.focus()
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        buttons[(index - 1 + buttons.length) % buttons.length]?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus())
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const origin = `${side === 'bottom' ? 'top' : 'bottom'} ${align === 'end' ? 'right' : 'left'}`

  return (
    <div ref={rootRef} className={cn(/\b(absolute|fixed|sticky)\b/.test(className ?? '') ? '' : 'relative', className)}>
      {trigger({ onClick: () => setOpen((v) => !v), 'aria-expanded': open, 'aria-haspopup': 'menu', 'aria-controls': id })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            id={id}
            role="menu"
            className={cn(
              'absolute z-overlay min-w-[200px] rounded-control border border-line bg-elevated p-1 shadow-pop',
              align === 'end' ? 'right-0' : 'left-0',
              side === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
            )}
            style={{ transformOrigin: origin }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          >
            {items.map((item, index) =>
              item === 'divider' ? (
                <div key={`d${index}`} className="my-1 h-px bg-line" />
              ) : (
                <button
                  key={item.label}
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false)
                    item.onSelect()
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-sm outline-none transition-colors',
                    'focus-visible:bg-sunken hover:bg-sunken disabled:opacity-40',
                    item.danger ? 'text-danger' : 'text-fg',
                  )}
                >
                  {item.icon && <span className={cn('h-4 w-4 shrink-0', item.danger ? '' : 'text-muted')}>{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                  {item.hint}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
