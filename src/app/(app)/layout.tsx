import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/server'
import { SignOutButton } from '@/components/sign-out-button'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border/60 bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-base font-semibold">
            PayRequest
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground hidden sm:block">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
