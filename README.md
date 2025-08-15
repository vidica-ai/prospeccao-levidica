# Le Produções - Sistema de Autenticação

Uma aplicação moderna de login e boas-vindas construída com Next.js, React e Supabase.

## Características

- ✨ Design moderno e responsivo
- 🔐 Autenticação segura com Supabase
- 🎨 Interface limpa e profissional
- 📱 Totalmente responsivo (mobile, tablet, desktop)
- ⚡ Performance otimizada com Next.js 14
- 🎯 TypeScript para maior segurança de tipos

## Tecnologias Utilizadas

- **Next.js 14** - Framework React para produção
- **React 18** - Biblioteca para interface de usuário
- **TypeScript** - JavaScript com tipagem estática
- **Tailwind CSS** - Framework CSS utilitário
- **Supabase** - Backend-as-a-Service para autenticação
- **Lucide React** - Ícones modernos

## Páginas

### 1. Página de Login
- Campos para email e senha
- Validação de formulário
- Feedback visual para erros
- Design moderno com gradientes
- Pre-configurado com credenciais de teste

### 2. Página de Boas-vindas
- Mensagem personalizada "Bem-Vinda Le Produções"
- Cards informativos sobre funcionalidades
- Botão de logout
- Design elegante e profissional

## Como Usar

### Pré-requisitos
- Node.js 18+ instalado
- Conta no Supabase

### Instalação

1. Clone o projeto e navegue até o diretório:
   ```bash
   cd prospeccao-levidica
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente no arquivo `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_supabase
   ```

4. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

5. Abra o navegador em `http://localhost:3000`

### Credenciais de Teste

- **Email**: levidica
- **Senha**: lericia21

## Estrutura do Projeto

```
prospeccao-levidica/
├── app/                    # Páginas e layouts do Next.js
│   ├── layout.tsx         # Layout principal com AuthProvider
│   ├── page.tsx           # Página inicial (roteamento automático)
│   └── globals.css        # Estilos globais
├── components/            # Componentes React reutilizáveis
│   ├── login-form.tsx     # Formulário de login
│   └── welcome-page.tsx   # Página de boas-vindas
├── lib/                   # Utilitários e configurações
│   ├── supabase.ts        # Cliente Supabase
│   └── auth-context.tsx   # Context de autenticação
└── ...
```

## Funcionalidades

### Autenticação
- Login com email e senha
- Gerenciamento de estado de autenticação
- Logout seguro
- Redirecionamento automático baseado no estado de auth

### Interface
- Design responsivo para todos os dispositivos
- Feedback visual para interações
- Animações suaves
- Tema moderno com gradientes

### Segurança
- Validação de formulários
- Proteção de rotas
- Gerenciamento seguro de tokens
- Integração com Supabase Auth

## Comandos Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria a build de produção
- `npm run start` - Inicia o servidor de produção
- `npm run lint` - Executa o linter

## Customização

### Cores e Temas
Edite o arquivo `tailwind.config.js` para customizar as cores:

```javascript
theme: {
  extend: {
    colors: {
      'brand': {
        50: '#eff6ff',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
      }
    }
  }
}
```

### Componentes
Todos os componentes estão na pasta `components/` e podem ser facilmente customizados.

## Próximos Passos

- [ ] Implementar recuperação de senha
- [ ] Adicionar autenticação com redes sociais
- [ ] Criar dashboard com funcionalidades específicas
- [ ] Implementar sistema de permissões
- [ ] Adicionar testes automatizados

## Suporte

Para dúvidas ou problemas, verifique:
1. Se todas as dependências estão instaladas
2. Se as variáveis de ambiente estão configuradas
3. Se o Supabase está configurado corretamente

---

Desenvolvido com ❤️ para Le Produções