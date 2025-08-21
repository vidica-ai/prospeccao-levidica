'use client'

import React, { useState } from 'react'

export const dynamic = 'force-dynamic'
import { useAuth } from '@/lib/auth-context'
import { ArrowLeft, Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ProspeccaoPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [prospectingText, setProspectingText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState('')

  const handleBack = () => {
    router.push('/')
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setProspectingText(e.target.value)
    setError('')
    setResults(null)
  }

  const handleContinue = async () => {
    if (!prospectingText.trim() || !user) return

    setIsProcessing(true)
    setError('')
    setResults(null)

    try {
      // Split links by lines and filter out empty lines
      const links = prospectingText
        .split('\n')
        .map(link => link.trim())
        .filter(link => link.length > 0)

      if (links.length === 0) {
        setError('Por favor, cole pelo menos um link do Sympla ou Eventbrite.')
        setIsProcessing(false)
        return
      }

      // Call the API
      const response = await fetch('/api/process-sympla', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          links,
          userId: user.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar links')
      }

      setResults(data)

      // If successful, clear the text area
      if (data.success && data.processed > 0) {
        setProspectingText('')
      }

    } catch (error) {
      console.error('Error processing links:', error)
      setError(error instanceof Error ? error.message : 'Erro ao processar links')
    } finally {
      setIsProcessing(false)
    }
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex justify-start mb-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </button>
        </div>

        {/* Main content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl px-8 py-16 sm:px-16">
            <div className="text-center">
              <div className="flex justify-center mb-8">
                <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full">
                  <Search className="h-10 w-10 text-white" />
                </div>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Nova Prospecção
              </h1>
              
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-8">
                Passo 1
              </h2>
              
              <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
                Cole links de eventos do Sympla ou Eventbrite e separe por linhas para análise e prospecção.
              </p>
              
              {/* Text Input Area */}
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  <textarea
                    value={prospectingText}
                    onChange={handleTextChange}
                    placeholder="Cole os links dos eventos do Sympla ou Eventbrite aqui, um por linha..."
                    className="w-full h-64 px-6 py-4 text-lg text-gray-900 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all duration-200 resize-none"
                    maxLength={2000}
                  />
                  <div className="absolute bottom-4 right-4 text-sm text-gray-400">
                    {prospectingText.length}/2000
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
                  <button
                    onClick={handleBack}
                    className="px-8 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleContinue}
                    disabled={!prospectingText.trim() || isProcessing}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
                  >
                    {isProcessing ? (
                      <div className="flex items-center">
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processando...
                      </div>
                    ) : (
                      'Continuar'
                    )}
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Results Display */}
              {results && (
                <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center mb-4">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                    <h3 className="text-lg font-semibold text-green-800">
                      Processamento Concluído!
                    </h3>
                  </div>
                  
                  <div className="text-green-700">
                    <p className="mb-2">
                      <strong>Links processados com sucesso:</strong> {results.processed}
                    </p>
                    
                    {results.errors && results.errors.length > 0 && (
                      <div className="mt-4">
                        <p className="font-medium text-orange-700 mb-2">Avisos:</p>
                        <ul className="list-disc list-inside text-orange-600 text-sm">
                          {results.errors.map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {results.results && results.results.length > 0 && (
                      <div className="mt-4">
                        <p className="font-medium mb-2">Eventos extraídos:</p>
                        <div className="space-y-2">
                          {results.results.map((lead: any, index: number) => (
                            <div key={index} className="bg-white p-4 rounded-lg border">
                              <p className="font-medium text-gray-900 mb-2">
                                {lead.nome_evento || 'Evento sem nome'}
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <p className="text-gray-600">
                                  <span className="font-medium">Data:</span> {lead.data_evento || 'Não informado'}
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Local:</span> {lead.event_local || lead.local || 'Não informado'}
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Organizador:</span> {lead.organizer_name || lead.produtor || 'Não informado'}
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Status:</span> {lead.status_busca || 'pendente'}
                                </p>
                              </div>
                              
                              {/* Contact Information */}
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="font-medium text-blue-600">Website:</span>
                                    {lead.organizer_website || lead.website ? (
                                      <a 
                                        href={lead.organizer_website || lead.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 text-blue-600 hover:text-blue-700 underline"
                                      >
                                        {lead.organizer_website || lead.website}
                                      </a>
                                    ) : (
                                      <span className="ml-2 text-gray-400">Não encontrado</span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-medium text-green-600">Status da Busca:</span>
                                    <span className={`ml-2 ${
                                      lead.status_busca === 'encontrado' ? 'text-green-600' :
                                      lead.status_busca === 'pendente' ? 'text-yellow-600' :
                                      lead.status_busca === 'erro' ? 'text-red-600' :
                                      'text-gray-400'
                                    }`}>
                                      {lead.status_busca === 'encontrado' ? 'Contatos encontrados' :
                                       lead.status_busca === 'buscando' ? 'Buscando...' :
                                       lead.status_busca === 'nao_encontrado' ? 'Nenhum contato encontrado' :
                                       lead.status_busca === 'erro' ? 'Erro na busca' :
                                       'Não processado'}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Contact verified status */}
                                {lead.contato_verificado && (
                                  <div className="mt-2">
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                      ✓ Contato verificado
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}