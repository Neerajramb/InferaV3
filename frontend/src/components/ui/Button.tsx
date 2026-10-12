import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { cn } from '../../lib/format'
import { Spinner } from './misc'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent/90 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]',
  secondary: 'bg-elevated text-fg border border-line hover:border-line-strong hover:bg-elevated/70',
  outline: 'border border-line-strong text-fg hover:bg-elevated',
  ghost: 'text-muted hover:text-fg hover:bg-elevated',
  danger: 'bg-danger/10 text-danger border border-danger/25 hover:bg-danger/15',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
  icon: 'h-9 w-9',
  'icon-sm': 'h-8 w-8',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, iconRight, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-control font-medium',
        'transition-[transform,background-color,border-color,color,opacity] duration-150 ease-out active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
})
