'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { credentialsSchema, type Credentials } from '@/features/requests/schema'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: Credentials) {
    setBusy(true)
    const supabase = getSupabaseBrowser()
    const { error } = await supabase.auth.signInWithPassword(values)
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Signed in')
    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <p className="text-muted-foreground text-sm">
            New here?{' '}
            <Link href="/register" className="text-foreground underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            data-testid="login-form"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-destructive text-sm">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-destructive text-sm">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
