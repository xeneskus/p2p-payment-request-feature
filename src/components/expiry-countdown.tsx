'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

function relative(expiresAt: string, now: Date): string {
  const diffMs = new Date(expiresAt).getTime() - now.getTime()
  if (diffMs <= 0) return 'expired'
  const minutes = Math.floor(diffMs / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days >= 1) return `${days}d ${hours % 24}h left`
  if (hours >= 1) return `${hours}h ${minutes % 60}m left`
  if (minutes >= 1) return `${minutes}m left`
  return '<1m left'
}

export function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState(() => relative(expiresAt, new Date()))
  useEffect(() => {
    const tick = () => setLabel(relative(expiresAt, new Date()))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [expiresAt])
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
      <Clock className="h-3 w-3" />
      {label}
    </span>
  )
}
