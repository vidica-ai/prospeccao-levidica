import { useState, useCallback } from 'react'
import { useAuth } from './auth-context'
import { Contact, ContactInsert, ContactUpdate } from './supabase'
import { validateContact } from './contact-utils'

interface UseContactsResult {
  // State
  loading: boolean
  error: string | null
  
  // Actions
  createContact: (contactData: ContactInsert) => Promise<Contact | null>
  updateContact: (contactId: string, contactData: ContactUpdate) => Promise<Contact | null>
  deleteContact: (contactId: string) => Promise<boolean>
  clearError: () => void
}

export const useContacts = (): UseContactsResult => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const createContact = useCallback(async (contactData: ContactInsert): Promise<Contact | null> => {
    if (!user) {
      setError('Usuário não autenticado')
      return null
    }

    // Validate contact data
    const validation = validateContact(contactData)
    if (!validation.isValid) {
      setError(validation.errors[0])
      return null
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify(contactData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar contato')
      }

      const contact = await response.json()
      return contact

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar contato'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  const updateContact = useCallback(async (contactId: string, contactData: ContactUpdate): Promise<Contact | null> => {
    if (!user) {
      setError('Usuário não autenticado')
      return null
    }

    // Validate contact data
    const validation = validateContact(contactData)
    if (!validation.isValid) {
      setError(validation.errors[0])
      return null
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify(contactData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar contato')
      }

      const contact = await response.json()
      return contact

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar contato'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  const deleteContact = useCallback(async (contactId: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao excluir contato')
      }

      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir contato'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  return {
    loading,
    error,
    createContact,
    updateContact,
    deleteContact,
    clearError
  }
}

// Hook for managing contact form state
interface UseContactFormOptions {
  initialData?: Partial<Contact>
  onSubmit?: (contactData: ContactInsert | ContactUpdate) => Promise<void>
  onCancel?: () => void
}

interface UseContactFormResult {
  // Form state
  formData: {
    name: string
    email: string
    position: string
  }
  
  // Form actions
  updateField: (field: keyof Contact, value: string) => void
  resetForm: () => void
  handleSubmit: () => Promise<void>
  handleCancel: () => void
  
  // Validation
  isValid: boolean
  errors: string[]
  isDirty: boolean
  isEmpty: boolean
}

export const useContactForm = (options: UseContactFormOptions = {}): UseContactFormResult => {
  const { initialData, onSubmit, onCancel } = options
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    position: initialData?.position || ''
  })

  const updateField = useCallback((field: keyof Contact, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const resetForm = useCallback(() => {
    setFormData({
      name: initialData?.name || '',
      email: initialData?.email || '',
      position: initialData?.position || ''
    })
  }, [initialData])

  const handleSubmit = useCallback(async () => {
    if (onSubmit) {
      const submitData = {
        name: formData.name.trim() || null,
        email: formData.email.trim().toLowerCase() || null,
        position: formData.position.trim() || null
      }
      await onSubmit(submitData)
    }
  }, [formData, onSubmit])

  const handleCancel = useCallback(() => {
    resetForm()
    if (onCancel) {
      onCancel()
    }
  }, [resetForm, onCancel])

  // Validation
  const validation = validateContact({
    name: formData.name.trim() || null,
    email: formData.email.trim() || null,
    position: formData.position.trim() || null
  })

  const isDirty = (
    formData.name !== (initialData?.name || '') ||
    formData.email !== (initialData?.email || '') ||
    formData.position !== (initialData?.position || '')
  )

  const isEmpty = !formData.name.trim() && !formData.email.trim() && !formData.position.trim()

  return {
    formData,
    updateField,
    resetForm,
    handleSubmit,
    handleCancel,
    isValid: validation.isValid,
    errors: validation.errors,
    isDirty,
    isEmpty
  }
}