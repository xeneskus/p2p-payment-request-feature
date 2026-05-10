import { getSupabaseServer } from '@/lib/supabase/server'
import { ApiError } from '@/lib/api-error'

export type CurrentUser = {
  id: string
  email: string
  displayName: string | null
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return {
    id: data.user.id,
    email: data.user.email!.toLowerCase(),
    displayName: (data.user.user_metadata?.display_name as string | undefined) ?? null,
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new ApiError('unauthenticated', 'Sign in to continue')
  }
  return user
}
