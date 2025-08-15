'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ArrowLeft, Calendar, MapPin, Building, ExternalLink, Trash2, Loader2, Check, Mail, Globe, Search, CheckCircle, XCircle, AlertCircle, RefreshCw, Edit3, Save, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Lead interface for the normalized structure (from leads_complete view)
interface Lead {
  // Lead fields
  id: string
  organizer_id: string
  event_id: string
  user_id: string
  contato_verificado: boolean
  data_ultima_busca: string | null
  hunter_domain: string | null
  status_busca: 'pendente' | 'buscando' | 'encontrado' | 'nao_encontrado' | 'erro'
  created_at: string
  updated_at: string
  
  // Organizer fields (from join)
  organizer_name: string
  organizer_website: string | null
  
  // Event fields (from join)
  nome_evento: string
  data_evento: string
  event_local: string
  sympla_url: string
  
  // User fields (from join)
  user_email: string | null
  user_full_name: string | null
  
  // Contacts (we'll fetch these separately if needed)
  contacts?: Contact[]
}

interface Contact {
  contact_id: string
  name: string | null
  email: string | null
  position: string | null
  organizer_id: string
  user_id: string
  created_at: string
  updated_at: string
}

export default function LeadsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [enhancingLeads, setEnhancingLeads] = useState<Set<string>>(new Set())
  const [enhancingAll, setEnhancingAll] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [editingLead, setEditingLead] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ 
    organizer_name: '', 
    organizer_website: '', 
    contact_name: '', 
    contact_email: '', 
    contact_position: '' 
  })
  const [savingEdit, setSavingEdit] = useState(false)

  const handleBack = () => {
    router.push('/')
  }

  const fetchLeads = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch('/api/leads', {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar prospecções')
      }

      const data = await response.json()
      setLeads(data)
    } catch (error) {
      console.error('Error fetching leads:', error)
      setError('Erro ao carregar as prospecções')
    } finally {
      setLoading(false)
    }
  }

  const deleteLead = async (leadId: string) => {
    if (!user || !confirm('Tem certeza que deseja excluir esta prospecção?')) return

    try {
      setDeletingId(leadId)
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir prospecção')
      }

      // Remove the lead from the list
      setLeads(leads.filter(lead => lead.id !== leadId))
      // Remove from selected if it was selected
      setSelectedLeads(prev => {
        const newSet = new Set(prev)
        newSet.delete(leadId)
        return newSet
      })
    } catch (error) {
      console.error('Error deleting lead:', error)
      setError('Erro ao excluir a prospecção')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev)
      if (newSet.has(leadId)) {
        newSet.delete(leadId)
      } else {
        newSet.add(leadId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map(lead => lead.id)))
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const enhanceLead = async (leadId: string) => {
    if (!user) return

    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    try {
      setEnhancingLeads(prev => {
        const newSet = new Set(prev)
        newSet.add(leadId)
        return newSet
      })
      
      // Optimistically update UI to show searching state
      setLeads(prev => prev.map(l => 
        l.id === leadId 
          ? { ...l, status_busca: 'buscando' as const }
          : l
      ))

      const response = await fetch('/api/enhance-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          leadId,
          companyName: lead.organizer_name
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar contatos')
      }

      const result = await response.json()
      
      // Update lead with new contact information (organizer website and lead status)
      setLeads(prev => prev.map(l => 
        l.id === leadId 
          ? { 
              ...l, 
              organizer_website: result.website || l.organizer_website,
              status_busca: result.email || result.website ? 'encontrado' : 'nao_encontrado',
              data_ultima_busca: new Date().toISOString(),
              contato_verificado: result.email ? true : l.contato_verificado,
              hunter_domain: result.searchDomain || l.hunter_domain
            }
          : l
      ))

      showNotification('success', 
        result.email || result.website 
          ? 'Contatos encontrados com sucesso!' 
          : 'Busca concluída, mas nenhum contato foi encontrado'
      )

    } catch (error) {
      console.error('Error enhancing lead:', error)
      
      // Update status to error
      setLeads(prev => prev.map(l => 
        l.id === leadId 
          ? { ...l, status_busca: 'erro' as const }
          : l
      ))
      
      showNotification('error', 'Erro ao buscar contatos')
    } finally {
      setEnhancingLeads(prev => {
        const newSet = new Set(prev)
        newSet.delete(leadId)
        return newSet
      })
    }
  }

  const enhanceSelectedLeads = async () => {
    if (selectedLeads.size === 0) return

    setEnhancingAll(true)
    const selectedArray = Array.from(selectedLeads)
    
    try {
      for (const leadId of selectedArray) {
        await enhanceLead(leadId)
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      showNotification('success', `${selectedArray.length} prospecções foram processadas`)
    } catch (error) {
      showNotification('error', 'Erro ao processar prospecções selecionadas')
    } finally {
      setEnhancingAll(false)
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'buscando':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'encontrado':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'nao_encontrado':
        return <XCircle className="h-4 w-4 text-gray-400" />
      case 'erro':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Search className="h-4 w-4 text-gray-300" />
    }
  }

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'buscando':
        return 'Buscando...'
      case 'encontrado':
        return 'Contatos encontrados'
      case 'nao_encontrado':
        return 'Nenhum contato encontrado'
      case 'erro':
        return 'Erro na busca'
      default:
        return 'Não processado'
    }
  }

  const startEdit = (lead: Lead) => {
    setEditingLead(lead.id)
    setEditForm({
      organizer_name: lead.organizer_name,
      organizer_website: lead.organizer_website || '',
      contact_name: '',
      contact_email: '',
      contact_position: ''
    })
  }

  const cancelEdit = () => {
    setEditingLead(null)
    setEditForm({ 
      organizer_name: '', 
      organizer_website: '', 
      contact_name: '', 
      contact_email: '', 
      contact_position: '' 
    })
  }

  const saveEdit = async (leadId: string) => {
    if (!user) return

    try {
      setSavingEdit(true)
      const response = await fetch(`/api/leads/${leadId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar informações')
      }

      const result = await response.json()
      
      // Update the lead in the local state with the returned complete lead data
      if (result.lead) {
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId ? result.lead : lead
          )
        )
      }

      setEditingLead(null)
      setEditForm({ 
        organizer_name: '', 
        organizer_website: '', 
        contact_name: '', 
        contact_email: '', 
        contact_position: '' 
      })
      showNotification('success', 'Informações atualizadas com sucesso!')

    } catch (error) {
      console.error('Error updating lead:', error)
      showNotification('error', 'Erro ao atualizar informações')
    } finally {
      setSavingEdit(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [user])

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </button>

          <button
            onClick={() => router.push('/prospeccao')}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
          >
            Nova Prospecção
          </button>
        </div>

        {/* Main content */}
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl px-8 py-12">
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                Suas Prospecções
              </h1>
              <p className="text-lg text-gray-600">
                Visualize todos os eventos prospectados no Sympla e Eventbrite
              </p>
            </div>

            {/* Notification */}
            {notification && (
              <div className={`mb-6 p-4 rounded-xl border ${
                notification.type === 'success' 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`font-medium ${
                  notification.type === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {notification.message}
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <span className="ml-3 text-gray-600">Carregando prospecções...</span>
              </div>
            ) : leads.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12">
                <div className="mb-4">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nenhuma prospecção encontrada
                </h3>
                <p className="text-gray-600 mb-6">
                  Você ainda não fez nenhuma prospecção. Comece agora!
                </p>
                <button
                  onClick={() => router.push('/prospeccao')}
                  className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors duration-200"
                >
                  Fazer Primeira Prospecção
                </button>
              </div>
            ) : (
              <div>
                {/* Selection Controls & Bulk Actions */}
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={toggleSelectAll}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {selectedLeads.size === leads.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                    
                    {selectedLeads.size > 0 && (
                      <span className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg border">
                        {selectedLeads.size} selecionado{selectedLeads.size !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {selectedLeads.size > 0 && (
                      <button
                        onClick={enhanceSelectedLeads}
                        disabled={enhancingAll}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        {enhancingAll ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Buscar Contatos Selecionados
                      </button>
                    )}
                  </div>
                </div>

                {/* Leads Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {leads.map((lead) => (
                    <div 
                      key={lead.id} 
                      className={`bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-all duration-200 relative ${
                        selectedLeads.has(lead.id) ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <div className="absolute top-4 right-4">
                        <button
                          onClick={() => toggleSelectLead(lead.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200 ${
                            selectedLeads.has(lead.id)
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-gray-300 hover:border-purple-400'
                          }`}
                        >
                          {selectedLeads.has(lead.id) && <Check className="h-3 w-3" />}
                        </button>
                      </div>

                      {/* Event Name */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 pr-8">
                        {lead.nome_evento}
                      </h3>

                      {/* Event Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                          {lead.data_evento}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 text-green-500" />
                          {lead.event_local}
                        </div>
                        
                        {/* Editable Organizer Name Field */}
                        {editingLead === lead.id ? (
                          <div className="flex items-center text-sm">
                            <Building className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
                            <input
                              type="text"
                              value={editForm.organizer_name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, organizer_name: e.target.value }))}
                              className="flex-1 px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Nome do organizador"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center text-sm text-gray-600">
                            <Building className="h-4 w-4 mr-2 text-blue-500" />
                            {lead.organizer_name}
                          </div>
                        )}
                      </div>

                      {/* Contact Information */}
                      <div className="space-y-2 mb-4 border-t border-gray-200 pt-4">
                        {/* Search Status */}
                        <div className="flex items-center text-sm">
                          {getStatusIcon(lead.status_busca)}
                          <span className="ml-2 text-gray-600">{getStatusText(lead.status_busca)}</span>
                        </div>

                        {/* Organizer Website */}
                        {editingLead === lead.id ? (
                          <div className="flex items-center text-sm">
                            <Globe className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
                            <input
                              type="url"
                              value={editForm.organizer_website}
                              onChange={(e) => setEditForm(prev => ({ ...prev, organizer_website: e.target.value }))}
                              className="flex-1 px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="https://www.organizador.com"
                            />
                          </div>
                        ) : (
                          lead.organizer_website && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Globe className="h-4 w-4 mr-2 text-blue-500" />
                              <a 
                                href={lead.organizer_website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                {lead.organizer_website}
                              </a>
                            </div>
                          )
                        )}

                        {/* Add Contact Fields in Edit Mode */}
                        {editingLead === lead.id && (
                          <>
                            <div className="border-t border-gray-200 pt-2 mt-2">
                              <p className="text-xs text-gray-500 mb-2">Adicionar novo contato:</p>
                              
                              <div className="flex items-center text-sm mb-2">
                                <Mail className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                                <input
                                  type="email"
                                  value={editForm.contact_email}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, contact_email: e.target.value }))}
                                  className="flex-1 px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  placeholder="contato@organizador.com"
                                />
                              </div>
                              
                              <div className="flex items-center text-sm mb-2">
                                <span className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0">👤</span>
                                <input
                                  type="text"
                                  value={editForm.contact_name}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, contact_name: e.target.value }))}
                                  className="flex-1 px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                  placeholder="Nome do contato"
                                />
                              </div>
                              
                              <div className="flex items-center text-sm">
                                <span className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0">💼</span>
                                <input
                                  type="text"
                                  value={editForm.contact_position}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, contact_position: e.target.value }))}
                                  className="flex-1 px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                  placeholder="Cargo/Posição"
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {/* Show existing contacts (display only for now) */}
                        {!editingLead && lead.contacts && lead.contacts.length > 0 && (
                          <div className="border-t border-gray-200 pt-2 mt-2">
                            <p className="text-xs text-gray-500 mb-2">Contatos:</p>
                            {lead.contacts.map((contact) => (
                              <div key={contact.contact_id} className="space-y-1">
                                {contact.email && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Mail className="h-3 w-3 mr-2 text-green-500" />
                                    <a 
                                      href={`mailto:${contact.email}`}
                                      className="text-green-600 hover:text-green-700 hover:underline"
                                    >
                                      {contact.email}
                                    </a>
                                    {contact.name && (
                                      <span className="ml-2 text-gray-500">({contact.name})</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Last Search Date */}
                        {lead.data_ultima_busca && (
                          <p className="text-xs text-gray-400">
                            Última busca: {new Date(lead.data_ultima_busca).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>

                      {/* Creation Date */}
                      <p className="text-xs text-gray-400 mb-4">
                        Prospectado em {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </p>

                      {/* Actions */}
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <a
                            href={lead.sympla_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            {lead.sympla_url.includes('eventbrite') ? 'Ver no Eventbrite' : 'Ver no Sympla'}
                          </a>
                        </div>

                        <div className="flex items-center gap-2">
                          {editingLead === lead.id ? (
                            /* Edit Mode Actions */
                            <>
                              <button
                                onClick={() => saveEdit(lead.id)}
                                disabled={savingEdit}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                {savingEdit ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="h-3 w-3 mr-1" />
                                    Salvar
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={cancelEdit}
                                disabled={savingEdit}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Cancelar
                              </button>
                            </>
                          ) : (
                            /* Normal Mode Actions */
                            <>
                              {/* Edit Button */}
                              <button
                                onClick={() => startEdit(lead)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                              >
                                <Edit3 className="h-3 w-3 mr-1" />
                                Editar
                              </button>

                              {/* Individual Enhance Button */}
                              <button
                                onClick={() => enhanceLead(lead.id)}
                                disabled={enhancingLeads.has(lead.id) || lead.status_busca === 'buscando'}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                {enhancingLeads.has(lead.id) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Buscar
                                  </>
                                )}
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => deleteLead(lead.id)}
                                disabled={deletingId === lead.id}
                                className="inline-flex items-center p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                              >
                                {deletingId === lead.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            {leads.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap justify-center gap-4">
                  <div className="bg-purple-50 rounded-lg px-4 py-2">
                    <p className="text-sm text-purple-700">
                      <span className="font-semibold">{leads.length}</span> evento{leads.length !== 1 ? 's' : ''} prospectado{leads.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  {leads.some(lead => lead.status_busca === 'encontrado') && (
                    <div className="bg-green-50 rounded-lg px-4 py-2">
                      <p className="text-sm text-green-700">
                        <span className="font-semibold">
                          {leads.filter(lead => lead.status_busca === 'encontrado').length}
                        </span> com contatos encontrados
                      </p>
                    </div>
                  )}
                  
                  {selectedLeads.size > 0 && (
                    <div className="bg-blue-50 rounded-lg px-4 py-2">
                      <p className="text-sm text-blue-700">
                        <span className="font-semibold">{selectedLeads.size}</span> selecionado{selectedLeads.size !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}