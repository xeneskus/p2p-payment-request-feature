export type RequestStatus = 'pending' | 'paid' | 'declined' | 'cancelled' | 'expired'

export type ExpirableRow = {
  status: RequestStatus
  expires_at: string
}

export function isExpired(expiresAt: string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() < now.getTime()
}

export function effectiveStatus(row: ExpirableRow, now: Date = new Date()): RequestStatus {
  if (row.status === 'pending' && isExpired(row.expires_at, now)) {
    return 'expired'
  }
  return row.status
}
