// Test script for email generation API
import fetch from 'node-fetch'

const TEST_USER_ID = 'test-user-123'
const API_BASE = 'http://localhost:3000'

interface TestEmailData {
  organizerName: string
  organizerWebsite?: string
  eventName?: string
  eventDate?: string
  eventLocation?: string
  contactName?: string
  contactPosition?: string
  contactEmail?: string
}

const testCases: TestEmailData[] = [
  {
    organizerName: "Câmara de Comércio Brasil-Canadá",
    organizerWebsite: "https://www.ccbc.org.br",
    contactName: "Vinicius Sansana",
    contactPosition: "Coordenador de Marketing",
    contactEmail: "vinicius.sansana@ccbc.org.br"
  },
  {
    organizerName: "Global Startup Ecosystem",
    eventName: "Brazil Tech Summit",
    eventDate: "2025-12-09",
    eventLocation: "São Paulo, SP",
    contactName: "Ana Silva",
    contactPosition: "Diretora de Eventos",
    contactEmail: "ana.silva@example.com"
  },
  {
    organizerName: "TechCorp Eventos",
    organizerWebsite: "https://techcorp.com.br",
    eventName: "Congresso Nacional de Tecnologia",
    eventDate: "2025-11-15",
    eventLocation: "Centro de Convenções - Rio de Janeiro"
  },
  {
    organizerName: "Startup Weekend Brasil"
  }
]

async function testEmailGeneration() {
  console.log('🧪 Testing Email Generation API')
  console.log('================================\n')

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]
    console.log(`📧 Test Case ${i + 1}: ${testCase.organizerName}`)
    console.log('---')

    try {
      const response = await fetch(`${API_BASE}/api/generate-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_ID}`
        },
        body: JSON.stringify(testCase)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      console.log('✅ Email generated successfully!')
      console.log(`📌 Subject: ${result.email.subject}`)
      console.log(`🎯 Personalization: ${result.email.personalizedElements.length} elements`)
      
      if (result.email.personalizedElements.length > 0) {
        console.log('   Elements:')
        result.email.personalizedElements.forEach((element: string, idx: number) => {
          console.log(`   ${idx + 1}. ${element}`)
        })
      }
      
      console.log(`📝 Body preview: ${result.email.body.substring(0, 150)}...`)
      console.log('')

    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`)
      console.log('')
    }
  }

  console.log('🏁 Email generation tests completed!')
}

// Example of how the generated email might look for display
function displaySampleEmail() {
  console.log('\n📋 Sample Generated Email Preview:')
  console.log('==================================')
  
  const sampleEmail = {
    subject: "Proposta de Apresentação para Brazil Tech Summit - Leticia Vidica",
    body: `Prezado(a) Ana Silva,

Meu nome é Leticia Vidica, sou jornalista e apresentadora com mais de 15 anos de experiência no mercado de comunicação corporativa.

Tive a oportunidade de conhecer o Brazil Tech Summit, que acontecerá em 09/12/2025, em São Paulo, SP, e gostaria de apresentar minha proposta para atuar como apresentadora do evento.

Conheço o trabalho da Global Startup Ecosystem e admiro a qualidade dos eventos que vocês promovem.

Como profissional especializado em eventos, você sabe a diferença que uma boa apresentação faz para o sucesso de qualquer evento.

Minha experiência inclui:
• Moderação de eventos corporativos de grande porte
• Apresentação de congressos e conferências nacionais
• Facilitação de painéis e debates com especialistas
• Entrevistas com executivos e lideranças
• Webinars e eventos virtuais
• Cerimônias de premiação e lançamentos

Meu diferencial está na capacidade de me adaptar ao público e ao formato do evento, sempre mantendo o profissionalismo e o dinamismo necessários para manter a audiência engajada.

Gostaria muito de conhecer mais detalhes sobre o evento e discutir como posso contribuir para o seu sucesso.

Atenciosamente,

Leticia Vidica
Jornalista e Apresentadora
📧 leticia.vidica@exemplo.com
📱 +55 11 99999-9999`
  }
  
  console.log(`Subject: ${sampleEmail.subject}`)
  console.log('\nBody:')
  console.log(sampleEmail.body)
}

// Run tests
if (require.main === module) {
  testEmailGeneration().then(() => {
    displaySampleEmail()
  }).catch(console.error)
}

export { testEmailGeneration }