# Solana Architect & Anchor Security Studio

![Solana Anchor Security Auditor](https://img.shields.io/badge/Solana-Anchor%20v0.30-purple?style=for-the-badge&logo=solana)
![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?style=for-the-badge&logo=tailwindcss)

O **Solana Architect** é um ambiente de desenvolvimento (IDE), simulador de execução e auditor de segurança interativo para smart contracts Solana escritos com o framework **Anchor (Rust)**.

A plataforma foi projetada para desenvolvedores e auditores de smart contracts verificarem restrições de contas, validarem derivação de PDAs (*Program Derived Addresses*), simularem transações e ataques de acesso não autorizado, e gerarem automaticamente arquivos de IDL e SDKs para integração frontend.

---

## 📸 Recursos Principais

### 🛠️ 1. Rust IDE & Auditoria AST Interativa
- **Editor de Código Rust**: Suporte a templates de contratos Anchor (`counter_sandbox`, `token_vault`, `staking_pda`, `unsecure_counter`).
- **Análise AST em Tempo Real**: Mapeamento de `declare_id!`, handlers de instrução (`initialize`, `increment`, `reset`, `close`), e verificação de estruturas de conta.
- **Auditor de Segurança Automático**: Identifica vulnerabilidades comuns no Anchor, como:
  - Faltas de validação `has_one = authority`.
  - Injeção de bump seed não-canônico.
  - Vulnerabilidades de aritmética sem validação (*overflow/underflow* sem `checked_add`/`checked_sub`).
  - Ausência de instrução para encerramento de conta (`close`).

### 🔐 2. Visualizador e Engine de Derivação PDA
- Visualização em tempo real do pipeline criptográfico de busca de **Canonical Bump** (iteração de 255 até encontrar ponto fora da curva Ed25519).
- Mapeamento visual das seeds: `seeds = [b"counter", authority.key()]`.
- Alternância rápida entre carteiras (*Alice - Proprietária* vs *Bob - Atacante*) para ver a mudança imediata nos endereços derivados.

### 🧪 3. Execution Sandbox & Simulador de Ataques
- **Rede Localnet Simulada**: Teste a execução de instruções Anchor (`initialize`, `increment`, `decrement`, `reset`, `close`).
- **Inspetor de Memória de Conta (49 Bytes)**: Mapeamento em tempo real do layout em bytes da conta no ledger:
  - `Bytes 0..8 (8B)`: Discriminador Anchor (`SHA-256("account:UserCounter")[..8]`).
  - `Bytes 8..40 (32B)`: Chave Pública da Autoridade (`Pubkey`).
  - `Bytes 40..48 (8B)`: Contador (`u64`).
  - `Byte 48 (1B)`: Bump Canônico (`u8`).
- **Simulação de Ataques de Acesso Controlado**: Permite selecionar a carteira de um atacante (*Bob*) e tentar executar instruções restritas para testar a rejeição com erro Anchor `HasOneMismatch`.
- **Logs de Transação em Tempo Real**: Terminal com saídas detalhadas de logs de execução, unidades de computação (*Compute Units - CU*) consumidas e assinaturas de transação.

### 📄 4. Gerador de IDL & Client SDKs
- **Gerador de IDL JSON**: Gera a Interface Definition Language no formato oficial `@coral-xyz/anchor`.
- **SDKs Prontos para Produção**:
  - **TypeScript**: Suporte completo a `@coral-xyz/anchor` com suíte de testes em Mocha/Chai.
  - **Rust**: Cliente usando `solana-client` e `solana-sdk`.
  - **Python**: Código de integração com `anchorpy` e `solana-py`.

### 📚 5. Security Masterclass Guide
- Guia técnico completo sobre as melhores práticas do Anchor:
  - Armazenamento de *bump seeds* na inicialização da conta.
  - Restrições de contexto `#[account(mut, has_one = authority)]`.
  - Cálculo e alocação exata de espaço de memória (`space = 8 + 32 + 8 + 1`).

### 🤖 6. Assistente de IA Integrado (Anchor AI)
- Integração com modelos Gemini via API para:
  - Sanar dúvidas técnicas sobre o ecossistema Solana/Anchor.
  - Refatorar contratos Rust diretamente pelo editor.
  - Gerar sugestões de correção de vulnerabilidades em um clique.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Vite
- **Estilização**: Tailwind CSS (Tema Dark inspirado no GitHub Dark / Anti-AI Minimalist)
- **Ícones**: Lucide React
- **Engine Criptográfica**: Derivação SHA-256 e suporte a validação de estruturas de dados Solana
- **IA**: Google Gemini API SDK (`@google/genai`)

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js**: v18.0.0 ou superior
- **npm** ou **yarn**

### Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/solana-anchor-studio.git
   cd solana-anchor-studio
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente (Opcional):**
   Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:
   ```env
   VITE_GEMINI_API_KEY=sua_chave_gemini_aqui
   ```

4. **Iniciar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Acessar a aplicação:**
   Abra o seu navegador em `http://localhost:3000`.

---

## 📁 Estrutura de Diretórios

```
├── src/
│   ├── components/
│   │   ├── Navbar.tsx             # Barra superior de navegação com pontuação de auditoria
│   │   ├── CodeEditor.tsx         # IDE Rust + Análise AST + Painel de auditoria
│   │   ├── PdaVisualizer.tsx      # Engine de derivação de PDA e fluxo criptográfico
│   │   ├── ExecutionSandbox.tsx   # Simulador localnet, inspetor de bytes e logs
│   │   ├── SdkAndIdlViewer.tsx    # Gerador de IDL JSON e SDKs (TS, Rust, Python)
│   │   ├── SecurityGuide.tsx      # Guia de segurança e boas práticas Anchor
│   │   └── AiAssistantModal.tsx   # Modal interativo do Assistente de IA
│   ├── utils/
│   │   └── solanaAuditEngine.ts   # Motor de auditoria estática e cálculo de PDAs
│   ├── App.tsx                    # Componente principal
│   └── main.tsx                   # Ponto de entrada do React
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🤝 Contribuição

Contribuições são super bem-vindas! Se você deseja adicionar novas regras de auditoria, novos templates de smart contracts ou melhorias na interface:

1. Faça um **Fork** do projeto.
2. Crie uma Branch para a sua Feature (`git checkout -b feature/NovaFeature`).
3. Faça o **Commit** das suas alterações (`git commit -m 'Add: nova regra de auditoria para Token 2022'`).
4. Faça o **Push** para a Branch (`git push origin feature/NovaFeature`).
5. Abra um **Pull Request**.

---

## 📜 Licença

Este projeto está sob a licença [MIT](LICENSE).
