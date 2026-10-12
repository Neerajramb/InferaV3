import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { CaretDownIcon } from '@phosphor-icons/react'

import { cn } from '../../lib/format'

const control =
  'w-full rounded-control border border-line bg-sunken/60 text-sm text-fg placeholder:text-subtle ' +
  'transition-[border-color,box-shadow,background-color] duration-150 ease-out ' +
  'hover:border-line-strong focus:border-accent/70 focus:bg-sunken focus:outline-none focus:ring-2 focus:ring-accent/20 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger/70'

interface FieldProps {
  label?: string
  hint?: ReactNode
  error?: string | null
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
  className?: string
}

/** Label above, helper and error below, wired up for screen readers. */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-muted">
          {label}
        </label>
      )}
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { leading?: ReactNode }>(
  function Input({ className, leading, ...props }, ref) {
    if (!leading) return <input ref={ref} className={cn(control, 'h-10 px-3', className)} {...props} />
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle">{leading}</span>
        <input ref={ref} className={cn(control, 'h-10 pl-9 pr-3', className)} {...props} />
      </div>
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(control, 'min-h-[96px] resize-y px-3 py-2.5 leading-6', className)} {...props} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select ref={ref} className={cn(control, 'h-10 appearance-none pl-3 pr-9', className)} {...props}>
          {children}
        </select>
        <CaretDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
      </div>
    )
  },
)
