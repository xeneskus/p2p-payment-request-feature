import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/server'

export default async function Home() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')
  redirect('/login')
}
