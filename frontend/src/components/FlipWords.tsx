import { useCallback, useEffect, useState } from 'react'
import { cn } from '../lib/utils.ts'
import { DecryptedText } from './DecryptedText.tsx'

interface FlipWordsProps {
  words: string[]
  duration?: number
  className?: string
}

export function FlipWords({ words, duration = 3000, className }: FlipWordsProps) {
  const [index, setIndex] = useState(0)

  const next = useCallback(() => {
    setIndex((prev) => (prev + 1) % words.length)
  }, [words.length])

  useEffect(() => {
    const id = setInterval(next, duration)
    return () => clearInterval(id)
  }, [next, duration])

  return (
    <span className={cn('inline-block relative', className)}>
      <DecryptedText
        key={index}
        text={words[index]}
        animateOn="view"
        sequential
        speed={60}
        className="text-[var(--text-primary)]"
        encryptedClassName="text-[var(--accent)]"
      />
    </span>
  )
}
