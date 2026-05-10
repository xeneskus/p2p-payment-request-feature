'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowser } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()
  async function onClick() {
    const supabase = getSupabaseBrowser()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }
  return (
    <Button variant="ghost" size="sm" onClick={onClick} data-testid="sign-out">
      Sign out
    </Button>
  )
}
