import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Leticia Vidica's professional profile
const LETICIA_PROFILE = {
  name: "Leticia Vidica",
  profession: "Jornalista e Apresentadora",
  experience: "Mais de 15 anos de experiência em jornalismo e apresentação",
  specialties: [
    "Moderação de eventos corporativos",
    "Apresentação de congressos e conferências", 
    "Facilitação de painéis e debates",
    "Entrevistas com executivos e especialistas",
    "Webinars e eventos virtuais",
    "Cerimônias de premiação"
  ],
  achievements: [
    "Apresentadora em grandes eventos corporativos nacionais",
    "Experiência com públicos de diferentes segmentos",
    "Domínio completo da língua portuguesa e inglês fluente",
    "Formação em Jornalismo com especialização em Comunicação Corporativa"
  ],
  approach: "Profissionalismo, dinamismo e capacidade de adaptação ao público e formato do evento",
  contact: {
    email: "leticia.vidica@exemplo.com",
    phone: "+55 11 99999-9999"
  }
}

interface EmailGenerationRequest {
  organizerName: string
  organizerWebsite?: string
  eventName?: string
  eventDate?: string
  eventLocation?: string
  contactName?: string
  contactPosition?: string
  contactEmail?: string
}

function generatePersonalizedEmail(data: EmailGenerationRequest): {
  subject: string
  body: string
  personalizedElements: string[]
} {
  const personalizedElements: string[] = []
  
  // Generate subject based on available information
  let subject = "Proposta de Apresentação - Leticia Vidica"
  if (data.eventName) {
    subject = `Proposta de Apresentação para ${data.eventName} - Leticia Vidica`
    personalizedElements.push(`Evento específico mencionado: ${data.eventName}`)
  }

  // Generate personalized greeting
  let greeting = `Prezado(a),`
  if (data.contactName) {
    greeting = `Prezado(a) ${data.contactName},`
    personalizedElements.push(`Saudação personalizada para ${data.contactName}`)
  } else if (data.organizerName) {
    greeting = `Prezada equipe da ${data.organizerName},`
    personalizedElements.push(`Saudação direcionada à organização`)
  }

  // Generate event-specific content
  let eventContent = ""
  if (data.eventName) {
    eventContent = `\n\nTive a oportunidade de conhecer o ${data.eventName}`
    if (data.eventDate) {
      eventContent += `, que acontecerá em ${new Date(data.eventDate).toLocaleDateString('pt-BR')}`
      personalizedElements.push(`Data do evento incluída`)
    }
    if (data.eventLocation) {
      eventContent += `, em ${data.eventLocation}`
      personalizedElements.push(`Local do evento mencionado`)
    }
    eventContent += `, e gostaria de apresentar minha proposta para atuar como apresentadora do evento.`
  } else {
    eventContent = `\n\nGostaria de apresentar minha proposta para atuar como apresentadora em eventos organizados pela ${data.organizerName}.`
  }

  // Generate organizer-specific content
  let organizerContent = ""
  if (data.organizerWebsite) {
    organizerContent = `\n\nConheço o trabalho da ${data.organizerName} através do site ${data.organizerWebsite} e admiro a qualidade dos eventos que vocês promovem.`
    personalizedElements.push(`Website da organização referenciado`)
  } else if (data.organizerName) {
    organizerContent = `\n\nTenho acompanhado o trabalho da ${data.organizerName} e admiro a qualidade dos eventos que vocês promovem.`
  }

  // Generate role-specific content based on contact position
  let roleContent = ""
  if (data.contactPosition) {
    if (data.contactPosition.toLowerCase().includes('marketing') || 
        data.contactPosition.toLowerCase().includes('comunicação')) {
      roleContent = `\n\nComo profissional da área de comunicação, acredito que você compreende a importância de ter uma apresentadora experiente que possa transmitir credibilidade e engajar o público durante todo o evento.`
      personalizedElements.push(`Conteúdo adaptado para profissional de marketing/comunicação`)
    } else if (data.contactPosition.toLowerCase().includes('diretor') || 
               data.contactPosition.toLowerCase().includes('gerente')) {
      roleContent = `\n\nSei que como ${data.contactPosition}, você busca garantir que todos os aspectos do evento contribuam para o sucesso dos objetivos organizacionais.`
      personalizedElements.push(`Conteúdo adaptado para cargo de liderança`)
    } else if (data.contactPosition.toLowerCase().includes('event') || 
               data.contactPosition.toLowerCase().includes('evento')) {
      roleContent = `\n\nComo profissional especializado em eventos, você sabe a diferença que uma boa apresentação faz para o sucesso de qualquer evento.`
      personalizedElements.push(`Conteúdo adaptado para profissional de eventos`)
    }
  }

  const body = `${greeting}

Meu nome é Leticia Vidica, sou jornalista e apresentadora com mais de 15 anos de experiência no mercado de comunicação corporativa.${eventContent}${organizerContent}${roleContent}

Minha experiência inclui:
• Moderação de eventos corporativos de grande porte
• Apresentação de congressos e conferências nacionais
• Facilitação de painéis e debates com especialistas
• Entrevistas com executivos e lideranças
• Webinars e eventos virtuais
• Cerimônias de premiação e lançamentos

Meu diferencial está na capacidade de me adaptar ao público e ao formato do evento, sempre mantendo o profissionalismo e o dinamismo necessários para manter a audiência engajada.

Tenho formação em Jornalismo com especialização em Comunicação Corporativa, domínio completo da língua portuguesa e inglês fluente, o que me permite atender diferentes perfis de eventos e públicos.

Gostaria muito de conhecer mais detalhes sobre o evento e discutir como posso contribuir para o seu sucesso. Estou disponível para uma conversa por telefone ou videochamada quando for conveniente para vocês.

Fico à disposição para esclarecer qualquer dúvida e enviar meu portfólio completo.

Atenciosamente,

Leticia Vidica
Jornalista e Apresentadora
📧 ${LETICIA_PROFILE.contact.email}
📱 ${LETICIA_PROFILE.contact.phone}

---
Este email foi gerado automaticamente com base nas informações do evento/organização.`

  return {
    subject,
    body,
    personalizedElements
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authHeader.replace('Bearer ', '')
    const body = await request.json()
    
    const {
      organizerName,
      organizerWebsite,
      eventName,
      eventDate,
      eventLocation,
      contactName,
      contactPosition,
      contactEmail
    }: EmailGenerationRequest = body

    if (!organizerName) {
      return NextResponse.json(
        { error: 'Nome do organizador é obrigatório' },
        { status: 400 }
      )
    }

    // Generate the personalized email
    const emailData = generatePersonalizedEmail({
      organizerName,
      organizerWebsite,
      eventName,
      eventDate,
      eventLocation,
      contactName,
      contactPosition,
      contactEmail
    })

    // Log the email generation for analytics (optional)
    try {
      await supabase
        .from('email_generation_log')
        .insert([{
          user_id: userId,
          organizer_name: organizerName,
          event_name: eventName,
          contact_email: contactEmail,
          subject_generated: emailData.subject,
          personalization_elements: emailData.personalizedElements,
          generated_at: new Date().toISOString()
        }])
    } catch (logError) {
      // Log error but don't fail the request
      console.error('Failed to log email generation:', logError)
    }

    return NextResponse.json({
      success: true,
      email: emailData,
      metadata: {
        generatedAt: new Date().toISOString(),
        personalizationCount: emailData.personalizedElements.length,
        presenterProfile: {
          name: LETICIA_PROFILE.name,
          profession: LETICIA_PROFILE.profession,
          experience: LETICIA_PROFILE.experience
        }
      }
    })

  } catch (error) {
    console.error('Email generation error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}