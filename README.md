# Solana Architect & Anchor Security Studio

![Solana Anchor Security Auditor](https://img.shields.io/badge/Solana-Anchor%20v0.30-purple?style=for-the-badge&logo=solana)
![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?style=for-the-badge&logo=tailwindcss)
![GitHub REST API](https://img.shields.io/badge/GitHub%20API-Integration-black?style=for-the-badge&logo=github)

O **Solana Architect** é um ambiente de desenvolvimento (IDE) completo, simulador de execução On-Chain localnet, gerador de testes unitários em Rust e auditor de segurança interativo para smart contracts Solana escritos com o framework **Anchor (Rust)**.

A plataforma foi projetada para desenvolvedores Web3, estudantes e auditores de smart contracts verificarem restrições de contas, validarem a derivação de PDAs (*Program Derived Addresses*), simularem transações e ataques de acesso não autorizado, gerarem testes em Rust (`solana-program-test`), e exportarem repositórios Anchor completos diretamente para o **GitHub**.

---

## 📸 Recursos Principais

### 🛠️ 1. Rust IDE & Auditoria AST Interativa
- **Editor de Código Rust**: Suporte a templates de contratos Anchor (`user_counter`, `token_vault`, `staking_pda`, `unsecure_counter`).
- **Análise AST em Tempo Real**: Mapeamento de `declare_id!`, handlers de instrução (`initialize`, `increment`, `decrement`, `reset`, `close`), e verificação de estruturas de conta.
- **Auditor de Segurança Automático**: Identifica e sugere correções para vulnerabilidades comuns no Anchor, como:
  - Faltas de validação `has_one = authority`.
  - Injeção de bump seed não-canônico.
  - Vulnerabilidades de aritmética sem validação (*overflow/underflow* sem `checked_add`/`checked_sub`).
  - Ausência de instrução para encerramento de conta e recuperação de rent (`close`).

### 🐙 2. Exportação Direta para o GitHub ("Push to GitHub")
- **Integração nativa com a REST API do GitHub**:
  - Autenticação por Personal Access Token (PAT Classic ou Fine-Grained).
  - Suporte completo para repositórios **Públicos** e **Privados**.
  - Opção de criar um **Novo Repositório** automaticamente ou atualizar um **Repositório Existente**.
  - **Pacote Workspace Anchor Completo**: Gera e envia automaticamente a estrutura do projeto com `programs/.../lib.rs`, `Anchor.toml`, `Cargo.toml`, `target/idl/*.json`, `client/index.ts` e `README.md` com o badge do score de auditoria.
  - Alternativamente, permite exportar **Apenas o Smart Contract** (`lib.rs`).

### 🧪 3. Execution Sandbox & Simulador de Ataques On-Chain
- **Rede Localnet Simulada**: Teste a execução de instruções Anchor (`initialize`, `increment`, `decrement`, `reset`, `close`).
- **Inspetor de Memória de Conta (49 Bytes)**: Mapeamento em tempo real do layout em bytes da conta no ledger Solana:
  - `Bytes 0..8 (8B)`: Discriminador Anchor (`SHA-256("account:UserCounter")[..8]`).
  - `Bytes 8..40 (32B)`: Chave Pública da Autoridade (`Pubkey`).
  - `Bytes 40..48 (8B)`: Contador (`u64`).
  - `Byte 48 (1B)`: Bump Canônico (`u8`).
- **Simulação de Ataques de Acesso Controlado**: Permite selecionar a carteira de um atacante (*Bob*) e tentar executar instruções restritas para testar a rejeição com o erro Anchor `HasOneMismatch`.
- **Logs de Transação em Tempo Real**: Terminal com saídas detalhadas de logs de execução, unidades de computação (*Compute Units - CU*) consumidas e assinaturas de transação.

### 🧪 4. Gerador de Testes Unitários em Rust (`#[cfg(test)]`)
- **Geração Dinâmica baseada no Smart Contract**:
  - **Happy Path**: Testes de inicialização de PDA e alteração de estado.
  - **Segurança & Permissões**: Validação de falha ao assinar com chaves não autorizadas (`has_one`).
  - **Matemática & Underflow**: Teste de proteção contra estouro de memória ao decrementar abaixo de zero.
  - **PDA & Rent**: Teste de derivação determinística de seeds e alocação de aluguel mínimo.
- **Simulador de Test Runner (`cargo test-sbf`)**: Execute os testes interativamente na interface e visualize o log de resultados em tempo real.
- **Download & Copia**: Baixe o arquivo `unit_tests.rs` para uso local em seu workspace Anchor.

### 🔐 5. Visualizador e Engine de Derivação PDA
- Visualização em tempo real do pipeline criptográfico de busca de **Canonical Bump** (iteração de 255 até encontrar um ponto fora da curva Ed25519).
- Mapeamento visual das seeds: `seeds = [b"counter", authority.key()]`.
- Alternância rápida entre carteiras (*Alice - Proprietária* vs *Bob - Atacante*) para ver a alteração imediata nos endereços derivados.

### 📄 6. Gerador de IDL & Client SDKs
- **Gerador de IDL JSON**: Gera a Interface Definition Language no formato oficial `@coral-xyz/anchor`.
- **SDKs Prontos para Produção**:
  - **TypeScript**: Suporte completo a `@coral-xyz/anchor` com suíte de testes em Mocha/Chai.
  - **Rust**: Cliente usando `solana-client` e `solana-sdk`.
  - **Python**: Código de integração com `anchorpy` e `solana-py`.

### 📚 7. Security Masterclass Guide
- Guia técnico completo sobre as melhores práticas do Anchor:
  - Armazenamento de *bump seeds* na inicialização da conta.
  - Restrições de contexto `#[account(mut, has_one = authority)]`.
  - Cálculo e alocação exata de espaço de memória (`space = 8 + 32 + 8 + 1`).

### 🤖 8. Assistente de IA Integrado (Anchor AI)
- Integração com modelos Gemini via API para:
  - Sanar dúvidas técnicas sobre o ecossistema Solana/Anchor.
  - Refatorar contratos Rust diretamente pelo editor.
  - Gerar sugestões de correção de vulnerabilidades em um clique.

---

## 🔑 Configuração do Token do GitHub (Push to GitHub)

Para salvar seus smart contracts no GitHub diretamente pela IDE:

1. Acesse o menu **"Push GitHub"** na barra superior.
2. Clique no link para criar um token no GitHub ou acesse [GitHub PAT Settings](https://github.com/settings/tokens/new?scopes=repo&description=Solana+Architect+IDE).
3. Certifique-se de que a permissão principale **`repo`** esteja marcada:
   - **PAT Classic**: Marque a caixa de seleção `repo` (Full control of private and public repositories).
   - **Fine-Grained Token**: Selecione `All repositories` e conceda permissões de leitura/escrita em `Contents` e `Administration`.
4. Cole a chave gerada no campo de autenticação do aplicativo. O token é salvo exclusivamente no seu navegador via `localStorage`.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, TypeScript, Vite
- **Estilização**: Tailwind CSS (Tema Dark - Anti-AI Minimalist)
- **Ícones**: Lucide React
- **Integração GitHub**: GitHub REST API v3
- **Engine Criptográfica**: Derivação SHA-256 e validação de estruturas Solana/Ed25519
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
│   │   ├── Navbar.tsx                   # Barra de navegação + Pontuação de Auditoria + Botão GitHub
│   │   ├── CodeEditor.tsx               # IDE Rust + Análise AST + Painel de Auditoria
│   │   ├── GithubPushModal.tsx          # Modal de exportação para GitHub (Repos Públicos/Privados)
│   │   ├── ExecutionSandbox.tsx         # Simulador On-Chain localnet, inspetor de bytes e logs
│   │   ├── RustUnitTestGenerator.tsx    # Gerador e executor de testes unitários em Rust (cargo test)
│   │   ├── PdaVisualizer.tsx            # Engine de derivação de PDA e fluxo criptográfico
│   │   ├── SdkAndIdlViewer.tsx          # Gerador de IDL JSON e SDKs (TS, Rust, Python)
│   │   ├── SecurityGuide.tsx            # Guia de segurança e boas práticas Anchor
│   │   └── AiAssistantModal.tsx         # Modal interativo do Assistente de IA
│   ├── utils/
│   │   ├── solanaAuditEngine.ts         # Motor de auditoria estática e cálculo de PDAs
│   │   ├── solanaUtils.ts               # Utilitários de IDL, SDK e geradores de código
│   │   └── githubService.ts             # Serviço de integração com a API REST do GitHub
│   ├── types/
│   │   └── solana.ts                    # Interfaces de dados e tipos TypeScript
│   ├── App.tsx                          # Componente principal
│   └── main.tsx                         # Ponto de entrada do React
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🤝 Contribuição

Contribuições são muito bem-vindas! Se você deseja adicionar novas regras de auditoria, modelos de smart contracts ou melhorias na interface:

1. Faça um **Fork** do projeto.
2. Crie uma Branch para a sua Feature (`git checkout -b feature/NovaFeature`).
3. Faça o **Commit** das suas alterações (`git commit -m 'Add: nova regra de auditoria para Token-2022'`).
4. Faça o **Push** para a Branch (`git push origin feature/NovaFeature`).
5. Abra um **Pull Request**.

---

## 📜 Licença

Este projeto está sob a licença [MIT](LICENSE).
