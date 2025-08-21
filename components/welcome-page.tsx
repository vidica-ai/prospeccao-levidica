'use client'

import React from 'react'
import { useAuth } from '@/lib/auth-context'
import { LogOut, Sparkles, Search, Eye, Building } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
  }

  const handleNavigateToProspeccao = () => {
    router.push('/prospeccao')
  }

  const handleNavigateToLeads = () => {
    router.push('/leads')
  }

  const handleNavigateToOrganizers = () => {
    router.push('/organizers')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header with logout */}
        <div className="flex justify-end mb-8">
          <button
            onClick={handleSignOut}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors duration-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </button>
        </div>

        {/* Main content */}
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-3xl shadow-xl px-8 py-16 sm:px-16">
            <div className="flex justify-center mb-8">
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Bem-Vinda
            </h1>
            
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-8">
              Le Produções
            </h2>
            
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Seja bem-vinda ao seu espaço de trabalho. Aqui você pode gerenciar todos os seus projetos e produções de forma simples e eficiente.
            </p>
            
            {user && (
              <div className="bg-gray-50 rounded-xl p-6 inline-block">
                <p className="text-sm text-gray-500 mb-1">Logada como:</p>
                <p className="text-lg font-medium text-gray-900">{user.email}</p>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleNavigateToProspeccao}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <Search className="h-6 w-6 mr-3" />
              Nova Prospecção
            </button>
            
            <button
              onClick={handleNavigateToLeads}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-teal-700 transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Eye className="h-6 w-6 mr-3" />
              Ver Prospecções
            </button>
            
            <button
              onClick={handleNavigateToOrganizers}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-cyan-700 transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Building className="h-6 w-6 mr-3" />
              Organizadores
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}