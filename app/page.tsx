'use client'

export const dynamic = 'force-dynamic'

import { useAuth } from '@/lib/auth-context'
import LoginForm from '@/components/login-form'
import WelcomePage from '@/components/welcome-page'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return user ? <WelcomePage /> : <LoginForm />
}