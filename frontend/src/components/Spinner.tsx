import { cn } from '../lib/utils.ts'

interface SpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'w-3 h-3 border-[1.5px]',
  md: 'w-4 h-4 border-2',
  lg: 'w-6 h-6 border-2',
}

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full border-violet-400 border-t-transparent animate-spin',
        sizes[size],
        className,
      )}
    />
  )
}
