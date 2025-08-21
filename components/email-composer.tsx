'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { 
  X, 
  Mail, 
  Send, 
  Loader2, 
  User, 
  Building, 
  Calendar,
  MapPin,
  CheckCircle,
  Copy,
  Edit3,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react'

interface EmailComposerProps {
  isOpen: boolean
  onClose: () => void
  organizerData?: {
    name: string
    website?: string
    contacts?: Array<{
      name?: string
      email?: string
      position?: string
    }>
  }
  eventData?: {
    name: string
    date?: string
    location?: string
  }
}

interface GeneratedEmail {
  subject: string
  body: string
  personalizedElements: string[]
}

export default function EmailComposer({ 
  isOpen, 
  onClose, 
  organizerData, 
  eventData 
}: EmailComposerProps) {
  const { user } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null)
  const [selectedContact, setSelectedContact] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [showPersonalization, setShowPersonalization] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateEmail = async () => {
    if (!user || !organizerData) return
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          organizerName: organizerData.name,
          organizerWebsite: organizerData.website,
          eventName: eventData?.name,
          eventDate: eventData?.date,
          eventLocation: eventData?.location,
          contactName: selectedContact?.name,
          contactPosition: selectedContact?.position,
          contactEmail: selectedContact?.email
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar email')
      }

      const result = await response.json()
      setGeneratedEmail(result.email)
      setEditedSubject(result.email.subject)
      setEditedBody(result.email.body)
      
    } catch (error) {
      console.error('Error generating email:', error)
      setError('Erro ao gerar email. Tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  const sendEmail = async () => {
    if (!generatedEmail || !selectedContact?.email) return
    
    setIsSending(true)
    setError(null)
    
    try {
      // Mock email sending - in production this would integrate with an email service
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate success
      setEmailSent(true)
      
      // In production, you would call an actual email service:
      /*
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          to: selectedContact.email,
          subject: isEditing ? editedSubject : generatedEmail.subject,
          body: isEditing ? editedBody : generatedEmail.body,
          organizerName: organizerData?.name,
          eventName: eventData?.name
        })
      })
      */
      
    } catch (error) {
      console.error('Error sending email:', error)
      setError('Erro ao enviar email. Tente novamente.')
    } finally {
      setIsSending(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const resetComposer = () => {
    setGeneratedEmail(null)
    setSelectedContact(null)
    setIsEditing(false)
    setEditedSubject('')
    setEditedBody('')
    setShowPersonalization(false)
    setEmailSent(false)
    setError(null)
  }

  const handleClose = () => {
    resetComposer()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-semibold">Composer Email - Leticia Vidica</h2>
                <p className="text-purple-100 text-sm">
                  Jornalista e Apresentadora de Eventos
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {emailSent ? (
            // Success state
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Email Enviado com Sucesso!
              </h3>
              <p className="text-gray-600 mb-6">
                O email foi enviado para {selectedContact?.email}
              </p>
              <button
                onClick={handleClose}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          ) : (
            <>
              {/* Information Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Organizer Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Organizador</h3>
                  </div>
                  <p className="font-medium text-gray-900">{organizerData?.name}</p>
                  {organizerData?.website && (
                    <p className="text-sm text-gray-600">{organizerData.website}</p>
                  )}
                </div>

                {/* Event Info */}
                {eventData && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">Evento</h3>
                    </div>
                    <p className="font-medium text-gray-900">{eventData.name}</p>
                    {eventData.date && (
                      <p className="text-sm text-gray-600">
                        {new Date(eventData.date).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {eventData.location && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <p className="text-sm text-gray-600">{eventData.location}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Contact Selection */}
              {organizerData?.contacts && organizerData.contacts.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecionar Contato (Opcional)
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {organizerData.contacts.map((contact, index) => (
                      <label
                        key={index}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedContact === contact
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="contact"
                          checked={selectedContact === contact}
                          onChange={() => setSelectedContact(contact)}
                          className="sr-only"
                        />
                        <User className="h-4 w-4 text-gray-500 mr-3" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {contact.name && (
                              <span className="font-medium text-gray-900">
                                {contact.name}
                              </span>
                            )}
                            {contact.email && (
                              <span className="text-gray-600">
                                {contact.email}
                              </span>
                            )}
                          </div>
                          {contact.position && (
                            <p className="text-sm text-gray-500">{contact.position}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate Email Button */}
              {!generatedEmail && (
                <div className="text-center mb-6">
                  <button
                    onClick={generateEmail}
                    disabled={isGenerating}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Gerando Email...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Gerar Email Personalizado
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Generated Email Display */}
              {generatedEmail && (
                <div className="space-y-4">
                  {/* Personalization Info */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <button
                      onClick={() => setShowPersonalization(!showPersonalization)}
                      className="flex items-center gap-2 text-blue-700 hover:text-blue-800 transition-colors"
                    >
                      {showPersonalization ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="font-medium">
                        Elementos de Personalização ({generatedEmail.personalizedElements.length})
                      </span>
                    </button>
                    
                    {showPersonalization && (
                      <div className="mt-3">
                        <ul className="space-y-1">
                          {generatedEmail.personalizedElements.map((element, index) => (
                            <li key={index} className="text-sm text-blue-600 flex items-center gap-2">
                              <CheckCircle className="h-3 w-3" />
                              {element}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Email Subject */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Assunto
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(isEditing ? editedSubject : generatedEmail.subject)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                          title="Copiar assunto"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setIsEditing(!isEditing)}
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                          title="Editar email"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                      />
                    ) : (
                      <div className="bg-gray-50 px-3 py-2 rounded-lg border text-gray-900">
                        {generatedEmail.subject}
                      </div>
                    )}
                  </div>

                  {/* Email Body */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Corpo do Email
                      </label>
                      <button
                        onClick={() => copyToClipboard(isEditing ? editedBody : generatedEmail.body)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        title="Copiar corpo do email"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    {isEditing ? (
                      <textarea
                        value={editedBody}
                        onChange={(e) => setEditedBody(e.target.value)}
                        rows={20}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-900 bg-white"
                      />
                    ) : (
                      <div className="bg-gray-50 px-4 py-3 rounded-lg border whitespace-pre-wrap font-mono text-sm text-gray-900">
                        {generatedEmail.body}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={resetComposer}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Gerar Novo Email
                      </button>
                      {selectedContact?.email && (
                        <p className="text-sm text-gray-600">
                          Enviar para: <span className="font-medium">{selectedContact.email}</span>
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {!selectedContact?.email && (
                        <p className="text-sm text-amber-600">
                          Selecione um contato para enviar o email
                        </p>
                      )}
                      <button
                        onClick={sendEmail}
                        disabled={isSending || !selectedContact?.email}
                        className="inline-flex items-center px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar Email
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <p className="text-red-700">{error}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}