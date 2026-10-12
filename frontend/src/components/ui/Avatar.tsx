import { cn, initials } from '../../lib/format'

// Low-saturation hues so avatars never compete with the accent.
const HUES = [210, 160, 32, 280, 350, 190, 120, 20]

function hueFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return HUES[Math.abs(hash) % HUES.length]
}

interface AvatarProps {
  name: string
  seed?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  online?: boolean
  className?: string
}

const sizes = {
  xs: 'h-6 w-6 text-[10px] rounded-[7px]',
  sm: 'h-8 w-8 text-[11px] rounded-[9px]',
  md: 'h-9 w-9 text-xs rounded-[10px]',
  lg: 'h-12 w-12 text-sm rounded-[13px]',
}

export function Avatar({ name, seed, size = 'md', online, className }: AvatarProps) {
  const hue = hueFor(seed ?? name)
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn('inline-flex items-center justify-center font-semibold tracking-tight', sizes[size])}
        style={{ backgroundColor: `hsl(${hue} 22% 26%)`, color: `hsl(${hue} 40% 86%)` }}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
      {online !== undefined && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface',
            online ? 'bg-success' : 'bg-line-strong',
          )}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </span>
  )
}
