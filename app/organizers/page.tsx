'use client'

import React, { useState, useEffect } from 'react'

export const dynamic = 'force-dynamic'
import { useAuth } from '@/lib/auth-context'
import { 
  ArrowLeft, 
  Search, 
  SortAsc, 
  SortDesc, 
  Building, 
  Globe, 
  Mail, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  Download,
  Loader2,
  Calendar,
  Filter,
  Send
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import EmailComposer from '@/components/email-composer'

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

interface Organizer {
  organizer_id: string
  name: string
  website: string | null
  user_id: string
  created_at: string
  updated_at: string
  contact_count: number
  contacts: Contact[]
}

type SortField = 'name' | 'contact_count' | 'created_at' | 'updated_at'
type SortOrder = 'asc' | 'desc'

export default function OrganizersPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  // State
  const [organizers, setOrganizers] = useState<Organizer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [expandedOrganizers, setExpandedOrganizers] = useState<Set<string>>(new Set())
  const [editingContact, setEditingContact] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', position: '' })
  const [savingContact, setSavingContact] = useState(false)
  const [deletingContact, setDeletingContact] = useState<string | null>(null)
  const [addingContact, setAddingContact] = useState<string | null>(null)
  const [newContactForm, setNewContactForm] = useState({ name: '', email: '', position: '' })
  const [addingContactLoading, setAddingContactLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [emailComposerOpen, setEmailComposerOpen] = useState(false)
  const [selectedOrganizerForEmail, setSelectedOrganizerForEmail] = useState<Organizer | null>(null)

  const handleBack = () => {
    router.push('/')
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const openEmailComposer = (organizer: Organizer) => {
    setSelectedOrganizerForEmail(organizer)
    setEmailComposerOpen(true)
  }

  const fetchOrganizers = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError('')
      
      const params = new URLSearchParams({
        search: searchTerm,
        sortBy: sortField,
        sortOrder: sortOrder
      })

      const response = await fetch(`/api/organizers?${params}`, {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar organizadores')
      }

      const data = await response.json()
      setOrganizers(data)
    } catch (error) {
      console.error('Error fetching organizers:', error)
      setError('Erro ao carregar organizadores')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const toggleOrganizerExpansion = (organizerId: string) => {
    setExpandedOrganizers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(organizerId)) {
        newSet.delete(organizerId)
      } else {
        newSet.add(organizerId)
      }
      return newSet
    })
  }

  const startEditContact = (contact: Contact) => {
    setEditingContact(contact.contact_id)
    setEditForm({
      name: contact.name || '',
      email: contact.email || '',
      position: contact.position || ''
    })
  }

  const cancelEditContact = () => {
    setEditingContact(null)
    setEditForm({ name: '', email: '', position: '' })
  }

  const saveContact = async (contactId: string) => {
    if (!user) return

    try {
      setSavingContact(true)
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar contato')
      }

      const updatedContact = await response.json()
      
      // Update local state
      setOrganizers(prev => prev.map(org => ({
        ...org,
        contacts: org.contacts.map(contact => 
          contact.contact_id === contactId ? updatedContact : contact
        )
      })))

      setEditingContact(null)
      setEditForm({ name: '', email: '', position: '' })
      showNotification('success', 'Contato atualizado com sucesso!')

    } catch (error) {
      console.error('Error saving contact:', error)
      showNotification('error', 'Erro ao salvar contato')
    } finally {
      setSavingContact(false)
    }
  }

  const deleteContact = async (contactId: string) => {
    if (!user || !confirm('Tem certeza que deseja excluir este contato?')) return

    try {
      setDeletingContact(contactId)
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir contato')
      }

      // Update local state
      setOrganizers(prev => prev.map(org => ({
        ...org,
        contact_count: org.contacts.some(c => c.contact_id === contactId) 
          ? org.contact_count - 1 
          : org.contact_count,
        contacts: org.contacts.filter(contact => contact.contact_id !== contactId)
      })))

      showNotification('success', 'Contato excluído com sucesso!')

    } catch (error) {
      console.error('Error deleting contact:', error)
      showNotification('error', 'Erro ao excluir contato')
    } finally {
      setDeletingContact(null)
    }
  }

  const startAddContact = (organizerId: string) => {
    setAddingContact(organizerId)
    setNewContactForm({ name: '', email: '', position: '' })
  }

  const cancelAddContact = () => {
    setAddingContact(null)
    setNewContactForm({ name: '', email: '', position: '' })
  }

  const addContact = async (organizerId: string) => {
    if (!user) return

    // Validate at least one field is filled
    if (!newContactForm.name && !newContactForm.email && !newContactForm.position) {
      showNotification('error', 'Preencha pelo menos um campo do contato')
      return
    }

    try {
      setAddingContactLoading(true)
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          ...newContactForm,
          organizer_id: organizerId
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao adicionar contato')
      }

      const newContact = await response.json()
      
      // Update local state
      setOrganizers(prev => prev.map(org => 
        org.organizer_id === organizerId
          ? {
              ...org,
              contact_count: org.contact_count + 1,
              contacts: [...org.contacts, newContact]
            }
          : org
      ))

      setAddingContact(null)
      setNewContactForm({ name: '', email: '', position: '' })
      showNotification('success', 'Contato adicionado com sucesso!')

    } catch (error) {
      console.error('Error adding contact:', error)
      showNotification('error', 'Erro ao adicionar contato')
    } finally {
      setAddingContactLoading(false)
    }
  }

  const exportData = async () => {
    try {
      setExporting(true)
      
      // Prepare CSV data
      const csvRows = []
      csvRows.push(['Organizador', 'Website', 'Nome do Contato', 'Email', 'Posição', 'Data de Criação'])
      
      organizers.forEach(organizer => {
        if (organizer.contacts.length === 0) {
          csvRows.push([
            organizer.name,
            organizer.website || '',
            '',
            '',
            '',
            new Date(organizer.created_at).toLocaleDateString('pt-BR')
          ])
        } else {
          organizer.contacts.forEach(contact => {
            csvRows.push([
              organizer.name,
              organizer.website || '',
              contact.name || '',
              contact.email || '',
              contact.position || '',
              new Date(contact.created_at).toLocaleDateString('pt-BR')
            ])
          })
        }
      })

      // Convert to CSV
      const csvContent = csvRows.map(row => 
        row.map(field => `"${field.replace(/"/g, '""')}"`).join(',')
      ).join('\n')

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `organizadores_contatos_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showNotification('success', 'Dados exportados com sucesso!')

    } catch (error) {
      console.error('Error exporting data:', error)
      showNotification('error', 'Erro ao exportar dados')
    } finally {
      setExporting(false)
    }
  }

  // Effects
  useEffect(() => {
    fetchOrganizers()
  }, [user, sortField, sortOrder])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOrganizers()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={exportData}
              disabled={exporting || organizers.length === 0}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar CSV
            </button>
            
            <button
              onClick={() => router.push('/leads')}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
            >
              Nova Prospecção
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl px-8 py-12">
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                Organizadores e Contatos
              </h1>
              <p className="text-lg text-gray-600">
                Gerencie todos os organizadores de eventos e seus contatos
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

            {/* Search and Sort Controls */}
            <div className="mb-8 space-y-4">
              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar organizadores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Sort Controls */}
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center text-sm text-gray-600 mr-2">
                  <Filter className="h-4 w-4 mr-1" />
                  Ordenar por:
                </span>
                
                {[
                  { field: 'name' as SortField, label: 'Nome' },
                  { field: 'contact_count' as SortField, label: 'Nº Contatos' },
                  { field: 'created_at' as SortField, label: 'Data Criação' },
                  { field: 'updated_at' as SortField, label: 'Última Atualização' }
                ].map(({ field, label }) => (
                  <button
                    key={field}
                    onClick={() => handleSort(field)}
                    className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors duration-200 ${
                      sortField === field
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                    {sortField === field && (
                      sortOrder === 'asc' ? 
                        <SortAsc className="h-3 w-3 ml-1" /> : 
                        <SortDesc className="h-3 w-3 ml-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <span className="ml-3 text-gray-600">Carregando organizadores...</span>
              </div>
            ) : organizers.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12">
                <div className="mb-4">
                  <Building className="h-16 w-16 text-gray-300 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'Nenhum organizador encontrado' : 'Nenhum organizador cadastrado'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm ? 
                    'Tente buscar com outros termos ou limpe a busca.' : 
                    'Comece fazendo sua primeira prospecção para adicionar organizadores.'
                  }
                </p>
                <button
                  onClick={() => router.push('/leads')}
                  className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors duration-200"
                >
                  Fazer Primeira Prospecção
                </button>
              </div>
            ) : (
              <div>
                {/* Stats */}
                <div className="mb-6 flex flex-wrap justify-center gap-4">
                  <div className="bg-purple-50 rounded-lg px-4 py-2">
                    <p className="text-sm text-purple-700">
                      <span className="font-semibold">{organizers.length}</span> organizador{organizers.length !== 1 ? 'es' : ''}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg px-4 py-2">
                    <p className="text-sm text-green-700">
                      <span className="font-semibold">
                        {organizers.reduce((sum, org) => sum + org.contact_count, 0)}
                      </span> contato{organizers.reduce((sum, org) => sum + org.contact_count, 0) !== 1 ? 's' : ''} total
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-lg px-4 py-2">
                    <p className="text-sm text-blue-700">
                      <span className="font-semibold">
                        {organizers.filter(org => org.contact_count > 0).length}
                      </span> com contatos
                    </p>
                  </div>
                </div>

                {/* Organizers List */}
                <div className="space-y-4">
                  {organizers.map((organizer) => (
                    <div 
                      key={organizer.organizer_id} 
                      className="bg-gray-50 rounded-xl border hover:shadow-md transition-all duration-200"
                    >
                      {/* Organizer Header */}
                      <div 
                        className="p-6 cursor-pointer"
                        onClick={() => toggleOrganizerExpansion(organizer.organizer_id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <button className="text-gray-400 hover:text-gray-600">
                              {expandedOrganizers.has(organizer.organizer_id) ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                            </button>
                            
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Building className="h-5 w-5 mr-2 text-blue-500" />
                                {organizer.name}
                              </h3>
                              
                              {organizer.website && (
                                <div className="flex items-center mt-1">
                                  <Globe className="h-4 w-4 mr-2 text-gray-400" />
                                  <a 
                                    href={organizer.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {organizer.website}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <Users className="h-4 w-4 mr-1 text-green-500" />
                              {organizer.contact_count} contato{organizer.contact_count !== 1 ? 's' : ''}
                            </div>
                            
                            <div className="text-xs text-gray-400">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {new Date(organizer.created_at).toLocaleDateString('pt-BR')}
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openEmailComposer(organizer)
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                              title="Enviar email para Leticia Vidica"
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Email
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedOrganizers.has(organizer.organizer_id) && (
                        <div className="px-6 pb-6 border-t border-gray-200">
                          <div className="pt-4">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-md font-medium text-gray-900">
                                Contatos ({organizer.contact_count})
                              </h4>
                              
                              <button
                                onClick={() => startAddContact(organizer.organizer_id)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Adicionar Contato
                              </button>
                            </div>

                            {/* Add Contact Form */}
                            {addingContact === organizer.organizer_id && (
                              <div className="mb-4 p-4 bg-white rounded-lg border border-green-200">
                                <h5 className="text-sm font-medium text-gray-900 mb-3">Novo Contato</h5>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                  <input
                                    type="text"
                                    placeholder="Nome do contato"
                                    value={newContactForm.name}
                                    onChange={(e) => setNewContactForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  />
                                  
                                  <input
                                    type="email"
                                    placeholder="email@contato.com"
                                    value={newContactForm.email}
                                    onChange={(e) => setNewContactForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  />
                                  
                                  <input
                                    type="text"
                                    placeholder="Cargo/Posição"
                                    value={newContactForm.position}
                                    onChange={(e) => setNewContactForm(prev => ({ ...prev, position: e.target.value }))}
                                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                  />
                                </div>
                                
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={cancelAddContact}
                                    disabled={addingContactLoading}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors duration-200"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancelar
                                  </button>
                                  
                                  <button
                                    onClick={() => addContact(organizer.organizer_id)}
                                    disabled={addingContactLoading}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                  >
                                    {addingContactLoading ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <Save className="h-3 w-3 mr-1" />
                                    )}
                                    Salvar
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Contacts List */}
                            {organizer.contacts.length === 0 ? (
                              <div className="text-center py-6">
                                <Mail className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Nenhum contato cadastrado</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {organizer.contacts.map((contact) => (
                                  <div 
                                    key={contact.contact_id}
                                    className="p-4 bg-white rounded-lg border border-gray-200"
                                  >
                                    {editingContact === contact.contact_id ? (
                                      /* Edit Mode */
                                      <div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                          <input
                                            type="text"
                                            placeholder="Nome do contato"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          />
                                          
                                          <input
                                            type="email"
                                            placeholder="email@contato.com"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          />
                                          
                                          <input
                                            type="text"
                                            placeholder="Cargo/Posição"
                                            value={editForm.position}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, position: e.target.value }))}
                                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          />
                                        </div>
                                        
                                        <div className="flex justify-end gap-2">
                                          <button
                                            onClick={cancelEditContact}
                                            disabled={savingContact}
                                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors duration-200"
                                          >
                                            <X className="h-3 w-3 mr-1" />
                                            Cancelar
                                          </button>
                                          
                                          <button
                                            onClick={() => saveContact(contact.contact_id)}
                                            disabled={savingContact}
                                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                          >
                                            {savingContact ? (
                                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            ) : (
                                              <Save className="h-3 w-3 mr-1" />
                                            )}
                                            Salvar
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* Display Mode */
                                      <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                          {contact.name && (
                                            <p className="text-sm font-medium text-gray-900">
                                              {contact.name}
                                            </p>
                                          )}
                                          
                                          {contact.email && (
                                            <div className="flex items-center text-sm text-gray-600">
                                              <Mail className="h-3 w-3 mr-2 text-green-500" />
                                              <a 
                                                href={`mailto:${contact.email}`}
                                                className="text-green-600 hover:text-green-700 hover:underline"
                                              >
                                                {contact.email}
                                              </a>
                                            </div>
                                          )}
                                          
                                          {contact.position && (
                                            <p className="text-xs text-gray-500">
                                              {contact.position}
                                            </p>
                                          )}
                                          
                                          <p className="text-xs text-gray-400">
                                            Adicionado em {new Date(contact.created_at).toLocaleDateString('pt-BR')}
                                          </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 ml-4">
                                          <button
                                            onClick={() => startEditContact(contact)}
                                            className="inline-flex items-center p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                          >
                                            <Edit3 className="h-3 w-3" />
                                          </button>
                                          
                                          <button
                                            onClick={() => deleteContact(contact.contact_id)}
                                            disabled={deletingContact === contact.contact_id}
                                            className="inline-flex items-center p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                                          >
                                            {deletingContact === contact.contact_id ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <Trash2 className="h-3 w-3" />
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Composer Modal */}
      <EmailComposer
        isOpen={emailComposerOpen}
        onClose={() => setEmailComposerOpen(false)}
        organizerData={selectedOrganizerForEmail ? {
          name: selectedOrganizerForEmail.name,
          website: selectedOrganizerForEmail.website || undefined,
          contacts: selectedOrganizerForEmail.contacts?.map(contact => ({
            name: contact.name || undefined,
            email: contact.email || undefined,
            position: contact.position || undefined
          })) || []
        } : undefined}
      />
    </div>
  )
}