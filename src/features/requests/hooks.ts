'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import type { PaymentRequest } from './types'
import type { RequestStatusValue } from './schema'

type UseRequestsOpts = {
  direction: 'outgoing' | 'incoming'
  status?: RequestStatusValue | 'all'
  q?: string
}

type State = {
  items: PaymentRequest[]
  loading: boolean
  error: string | null
}

export function useRequests(opts: UseRequestsOpts) {
  const [state, setState] = useState<State>({ items: [], loading: true, error: null })

  const refresh = useCallback(async () => {
    const params = new URLSearchParams()
    params.set('direction', opts.direction)
    if (opts.status && opts.status !== 'all') params.set('status', opts.status)
    if (opts.q) params.set('q', opts.q)
    try {
      const res = await fetch(`/api/requests?${params.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? `Request failed (${res.status})`)
      }
      const body = (await res.json()) as { requests: PaymentRequest[] }
      setState({ items: body.requests, loading: false, error: null })
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: (err as Error).message }))
    }
  }, [opts.direction, opts.status, opts.q])

  useEffect(() => {
    let active = true
    setState((prev) => ({ ...prev, loading: true }))
    refresh().then(() => {
      if (!active) setState((prev) => prev)
    })
    return () => {
      active = false
    }
  }, [refresh])

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    const channel = supabase
      .channel('payment_requests:any')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_requests' }, () => {
        refresh()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  return { ...state, refresh }
}
