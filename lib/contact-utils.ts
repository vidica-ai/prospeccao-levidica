import { Contact, ContactInsert, ContactUpdate } from './supabase'

// Contact validation utilities
export const validateContact = (contact: Partial<ContactInsert>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  // At least one field must be filled
  if (!contact.name && !contact.email && !contact.position) {
    errors.push('Preencha pelo menos um campo do contato')
  }
  
  // Email format validation
  if (contact.email && contact.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(contact.email.trim())) {
      errors.push('Email inválido')
    }
  }
  
  // Name length validation
  if (contact.name && contact.name.length > 100) {
    errors.push('Nome deve ter no máximo 100 caracteres')
  }
  
  // Position length validation
  if (contact.position && contact.position.length > 100) {
    errors.push('Posição deve ter no máximo 100 caracteres')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Contact formatting utilities
export const formatContactName = (contact: Contact): string => {
  if (contact.name) return contact.name
  if (contact.email) return contact.email.split('@')[0]
  return 'Contato sem nome'
}

export const formatContactDisplay = (contact: Contact): string => {
  const parts: string[] = []
  
  if (contact.name) parts.push(contact.name)
  if (contact.email) parts.push(`<${contact.email}>`)
  if (contact.position) parts.push(`(${contact.position})`)
  
  return parts.join(' ') || 'Contato'
}

// Contact searching/filtering utilities
export const searchContacts = (contacts: Contact[], searchTerm: string): Contact[] => {
  if (!searchTerm.trim()) return contacts
  
  const term = searchTerm.toLowerCase().trim()
  
  return contacts.filter(contact => 
    (contact.name?.toLowerCase().includes(term)) ||
    (contact.email?.toLowerCase().includes(term)) ||
    (contact.position?.toLowerCase().includes(term))
  )
}

// Contact sorting utilities
export type ContactSortField = 'name' | 'email' | 'position' | 'created_at'
export type ContactSortOrder = 'asc' | 'desc'

export const sortContacts = (
  contacts: Contact[], 
  field: ContactSortField, 
  order: ContactSortOrder = 'asc'
): Contact[] => {
  return [...contacts].sort((a, b) => {
    let valueA: string | Date
    let valueB: string | Date
    
    switch (field) {
      case 'name':
        valueA = a.name || ''
        valueB = b.name || ''
        break
      case 'email':
        valueA = a.email || ''
        valueB = b.email || ''
        break
      case 'position':
        valueA = a.position || ''
        valueB = b.position || ''
        break
      case 'created_at':
        valueA = new Date(a.created_at)
        valueB = new Date(b.created_at)
        break
      default:
        valueA = a.name || ''
        valueB = b.name || ''
    }
    
    if (field === 'created_at') {
      const comparison = (valueA as Date).getTime() - (valueB as Date).getTime()
      return order === 'asc' ? comparison : -comparison
    } else {
      const comparison = (valueA as string).localeCompare(valueB as string, 'pt-BR', { sensitivity: 'base' })
      return order === 'asc' ? comparison : -comparison
    }
  })
}

// Contact grouping utilities
export const groupContactsByOrganizer = (contacts: Contact[]): Record<string, Contact[]> => {
  return contacts.reduce((acc, contact) => {
    if (!acc[contact.organizer_id]) {
      acc[contact.organizer_id] = []
    }
    acc[contact.organizer_id].push(contact)
    return acc
  }, {} as Record<string, Contact[]>)
}

// Contact export utilities
export const contactsToCSV = (contacts: Contact[], includeOrganizerInfo = false): string => {
  const headers = includeOrganizerInfo 
    ? ['Organizador ID', 'Nome', 'Email', 'Posição', 'Data de Criação', 'Última Atualização']
    : ['Nome', 'Email', 'Posição', 'Data de Criação', 'Última Atualização']
  
  const rows = contacts.map(contact => {
    const baseRow = [
      contact.name || '',
      contact.email || '',
      contact.position || '',
      new Date(contact.created_at).toLocaleDateString('pt-BR'),
      new Date(contact.updated_at).toLocaleDateString('pt-BR')
    ]
    
    return includeOrganizerInfo 
      ? [contact.organizer_id, ...baseRow]
      : baseRow
  })
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(','))
    .join('\n')
  
  return csvContent
}

// Contact statistics utilities
export const getContactStats = (contacts: Contact[]) => {
  const total = contacts.length
  const withEmail = contacts.filter(c => c.email).length
  const withName = contacts.filter(c => c.name).length
  const withPosition = contacts.filter(c => c.position).length
  const complete = contacts.filter(c => c.name && c.email && c.position).length
  
  return {
    total,
    withEmail,
    withName,
    withPosition,
    complete,
    emailRate: total > 0 ? (withEmail / total) * 100 : 0,
    nameRate: total > 0 ? (withName / total) * 100 : 0,
    positionRate: total > 0 ? (withPosition / total) * 100 : 0,
    completeRate: total > 0 ? (complete / total) * 100 : 0
  }
}

// Contact deduplication utilities
export const findDuplicateContacts = (contacts: Contact[]): Contact[][] => {
  const groups: Contact[][] = []
  const processed = new Set<string>()
  
  contacts.forEach(contact => {
    if (processed.has(contact.contact_id)) return
    
    const duplicates = contacts.filter(other => 
      other.contact_id !== contact.contact_id &&
      !processed.has(other.contact_id) &&
      (
        (contact.email && other.email && contact.email.toLowerCase() === other.email.toLowerCase()) ||
        (contact.name && other.name && contact.name.toLowerCase().trim() === other.name.toLowerCase().trim())
      )
    )
    
    if (duplicates.length > 0) {
      const group = [contact, ...duplicates]
      group.forEach(c => processed.add(c.contact_id))
      groups.push(group)
    } else {
      processed.add(contact.contact_id)
    }
  })
  
  return groups
}

// Form utilities
export const cleanContactFormData = (formData: any): ContactInsert | ContactUpdate => {
  return {
    name: formData.name?.trim() || null,
    email: formData.email?.trim().toLowerCase() || null,
    position: formData.position?.trim() || null
  }
}

export const isContactFormEmpty = (formData: any): boolean => {
  return !formData.name?.trim() && !formData.email?.trim() && !formData.position?.trim()
}

export const hasContactFormChanged = (original: Contact, formData: any): boolean => {
  const cleaned = cleanContactFormData(formData)
  return (
    (original.name || '') !== (cleaned.name || '') ||
    (original.email || '') !== (cleaned.email || '') ||
    (original.position || '') !== (cleaned.position || '')
  )
}