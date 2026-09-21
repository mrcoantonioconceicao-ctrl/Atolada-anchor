import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'pt' | 'en' | 'es';
export type UserMode = 'junior' | 'advanced';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  userMode: UserMode;
  setUserMode: (mode: UserMode) => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  pt: {
    // Top Bar & Navbar
    'nav.title': 'Solana Architect',
    'nav.subtitle': 'DevSecOps & Anchor v0.30 IDE',
    'nav.editor': 'IDE Rust & Auditoria',
    'nav.editor.desc': 'Editor AST, Análise Estática & Auto-Fix',
    'nav.pda': 'Visualizador de PDA',
    'nav.pda.desc': 'Seeds, Bumps Canônicos & Derivação',
    'nav.simulator': 'Simulador de Execução',
    'nav.simulator.desc': 'Testes de Instruções & Signers',
    'nav.sdk': 'IDL & SDK Client',
    'nav.sdk.desc': 'TypeScript SDK & Schema JSON',
    'nav.rust_engine': 'Rust Core Engine',
    'nav.rust_engine.desc': 'Compilador Virtual BPF & LLVM',
    'nav.guide': 'Guia de Segurança',
    'nav.guide.desc': 'Top 10 Vulnerabilidades Solana',
    'nav.ai_copilot': 'Assistente AI Architect',
    'nav.github_push': 'Exportar / GitHub',
    'nav.cloud_projects': 'Projetos Cloud',
    'nav.system_tour': 'Tutorial do IDE',
    'nav.audit_score': 'Auditoria de Segurança',
    'nav.critical': 'Crítica',
    'nav.criticals': 'Críticas',
    'nav.high': 'Alta',
    'nav.highs': 'Altas',

    // Modes & Language
    'mode.junior': 'Modo Júnior (Guiado)',
    'mode.advanced': 'Modo Avançado (Engenheiro)',
    'mode.junior.badge': 'Júnior / Assistido',
    'mode.advanced.badge': 'Engenheiro / Avançado',
    'lang.pt': 'Português',
    'lang.en': 'English',
    'lang.es': 'Español',

    // Junior Wizard & Explanations
    'wizard.pda.title': '🧙‍♂️ Assistente Guiado de Derivação de PDA',
    'wizard.pda.step1': 'Passo 1: Definir a Conta da Autoridade (Public Key)',
    'wizard.pda.step2': 'Passo 2: Configurar a Seed de Texto (ex: "counter", "vault")',
    'wizard.pda.step3': 'Passo 3: Encontrar o Bump Canônico Válido (off-curve)',
    'wizard.pda.why_bump': '💡 Por que usá-lo? A Solana deriva endereços fora da curva elíptica para garantir que apenas o seu Smart Contract possa assinar transações por esta conta.',
    'wizard.has_one.title': '🛡️ Por que usar `has_one = authority`?',
    'wizard.has_one.desc': 'Essa restrição do Anchor valida automaticamente se a conta passada corresponde ao campo esperado, prevenindo ataques de personificação onde um hacker passa a própria conta como autoridade.',

    // Friendly Error Decoder
    'error.decoder.title': '🔎 Tradutor Amigável de Erros da Solana',
    'error.base58': 'Erro de Decodificação Base58: Uma chave pública enviada possui caracteres inválidos ou comprimento incorreto (deve ter 32–44 caracteres base58).',
    'error.discriminator': 'Mismatch de Discriminador de Conta (AccountDiscriminatorMismatch): A conta fornecida não foi criada por este programa ou possui tipo diferente no Anchor.',
    'error.lamports': 'Saldo Insuficiente de Lamports: A conta não possui fundos suficientes para pagar a taxa de aluguel (rent-exempt) ou taxa da rede.',
    'error.pda_bump': 'Seed/Bump Inválido para PDA: As seeds fornecidas não derivam o endereço esperado ou o bump não é canônico.',
    'error.has_one': 'ConstraintHasOneViolated: A conta fornecida não corresponde à autoridade declarada na estrutura de contas.',

    // Common Buttons & Actions
    'btn.audit_now': 'Auditar Agora',
    'btn.autofix': 'Correção Automática em 1-Clique',
    'btn.simulate': 'Simular Transação',
    'btn.download_cicd': 'Baixar Esteira CI/CD Resiliente',
    'btn.export': 'Exportar Projeto',
    'btn.import': 'Importar do GitHub',
    'btn.close': 'Fechar',
    'btn.save': 'Salvar no Cloud',
  },
  en: {
    // Top Bar & Navbar
    'nav.title': 'Solana Architect',
    'nav.subtitle': 'DevSecOps & Anchor v0.30 IDE',
    'nav.editor': 'Rust IDE & Audit',
    'nav.editor.desc': 'AST Editor, Static Analysis & Auto-Fix',
    'nav.pda': 'PDA Visualizer',
    'nav.pda.desc': 'Seeds, Canonical Bumps & Derivation',
    'nav.simulator': 'Execution Simulator',
    'nav.simulator.desc': 'Instruction Tests & Signers',
    'nav.sdk': 'IDL & Client SDK',
    'nav.sdk.desc': 'TypeScript SDK & Schema JSON',
    'nav.rust_engine': 'Rust Core Engine',
    'nav.rust_engine.desc': 'Virtual Compiler BPF & LLVM',
    'nav.guide': 'Security Guide',
    'nav.guide.desc': 'Top 10 Solana Vulnerabilities',
    'nav.ai_copilot': 'AI Architect Assistant',
    'nav.github_push': 'Export / GitHub',
    'nav.cloud_projects': 'Cloud Projects',
    'nav.system_tour': 'IDE Tour',
    'nav.audit_score': 'Security Audit',
    'nav.critical': 'Critical',
    'nav.criticals': 'Criticals',
    'nav.high': 'High',
    'nav.highs': 'Highs',

    // Modes & Language
    'mode.junior': 'Junior Mode (Guided)',
    'mode.advanced': 'Advanced Mode (Engineer)',
    'mode.junior.badge': 'Junior / Assisted',
    'mode.advanced.badge': 'Engineer / Advanced',
    'lang.pt': 'Português',
    'lang.en': 'English',
    'lang.es': 'Español',

    // Junior Wizard & Explanations
    'wizard.pda.title': '🧙‍♂️ Guided PDA Derivation Wizard',
    'wizard.pda.step1': 'Step 1: Define Authority Account (Public Key)',
    'wizard.pda.step2': 'Step 2: Configure Text Seed (e.g., "counter", "vault")',
    'wizard.pda.step3': 'Step 3: Find Valid Canonical Bump (off-curve)',
    'wizard.pda.why_bump': '💡 Why use it? Solana derives addresses off the elliptic curve to ensure only your Smart Contract can sign transactions on behalf of this account.',
    'wizard.has_one.title': '🛡️ Why use `has_one = authority`?',
    'wizard.has_one.desc': 'This Anchor constraint automatically checks if the passed account matches the expected authority field, preventing impersonation attacks where an attacker passes their own account.',

    // Friendly Error Decoder
    'error.decoder.title': '🔎 Friendly Solana Error Translator',
    'error.base58': 'Base58 Decoding Error: A public key string contains invalid characters or incorrect length (must be 32-44 base58 chars).',
    'error.discriminator': 'Account Discriminator Mismatch: The provided account was not initialized by this program or belongs to a different Anchor struct type.',
    'error.lamports': 'Insufficient Lamports Balance: The account does not have enough SOL to cover rent-exemption or network transaction fees.',
    'error.pda_bump': 'Invalid Seed/Bump for PDA: The provided seeds do not derive the expected address or the bump is non-canonical.',
    'error.has_one': 'ConstraintHasOneViolated: The provided account does not match the authority declared in the account context struct.',

    // Common Buttons & Actions
    'btn.audit_now': 'Audit Now',
    'btn.autofix': '1-Click Auto-Fix',
    'btn.simulate': 'Simulate Transaction',
    'btn.download_cicd': 'Download Resilient CI/CD Pipeline',
    'btn.export': 'Export Project',
    'btn.import': 'Import from GitHub',
    'btn.close': 'Close',
    'btn.save': 'Save to Cloud',
  },
  es: {
    // Top Bar & Navbar
    'nav.title': 'Solana Architect',
    'nav.subtitle': 'DevSecOps & Anchor v0.30 IDE',
    'nav.editor': 'IDE Rust y Auditoría',
    'nav.editor.desc': 'Editor AST, Análisis Estático y Auto-Fix',
    'nav.pda': 'Visualizador de PDA',
    'nav.pda.desc': 'Semillas, Bumps Canónicos y Derivación',
    'nav.simulator': 'Simulador de Ejecución',
    'nav.simulator.desc': 'Pruebas de Instrucciones y Firmantes',
    'nav.sdk': 'IDL y SDK Cliente',
    'nav.sdk.desc': 'TypeScript SDK y Esquema JSON',
    'nav.rust_engine': 'Motor Núcleo Rust',
    'nav.rust_engine.desc': 'Compilador Virtual BPF y LLVM',
    'nav.guide': 'Guía de Seguridad',
    'nav.guide.desc': 'Top 10 Vulnerabilidades de Solana',
    'nav.ai_copilot': 'Asistente IA Architect',
    'nav.github_push': 'Exportar / GitHub',
    'nav.cloud_projects': 'Proyectos en la Nube',
    'nav.system_tour': 'Recorrido del IDE',
    'nav.audit_score': 'Auditoría de Seguridad',
    'nav.critical': 'Crítica',
    'nav.criticals': 'Críticas',
    'nav.high': 'Alta',
    'nav.highs': 'Altas',

    // Modes & Language
    'mode.junior': 'Modo Junior (Guiado)',
    'mode.advanced': 'Modo Avanzado (Ingeniero)',
    'mode.junior.badge': 'Junior / Asistido',
    'mode.advanced.badge': 'Ingeniero / Avanzado',
    'lang.pt': 'Português',
    'lang.en': 'English',
    'lang.es': 'Español',

    // Junior Wizard & Explanations
    'wizard.pda.title': '🧙‍♂️ Asistente Guiado de Derivación de PDA',
    'wizard.pda.step1': 'Paso 1: Definir Cuenta de Autoridad (Clave Pública)',
    'wizard.pda.step2': 'Paso 2: Configurar Semilla de Texto (ej: "counter", "vault")',
    'wizard.pda.step3': 'Paso 3: Encontrar Bump Canónico Válido (fuera de la curva)',
    'wizard.pda.why_bump': '💡 ¿Por qué usarlo? Solana deriva direcciones fuera de la curva elíptica para garantizar que solo su Smart Contract pueda firmar transacciones por esta cuenta.',
    'wizard.has_one.title': '🛡️ ¿Por qué usar `has_one = authority`?',
    'wizard.has_one.desc': 'Esta restricción de Anchor valida automáticamente que la cuenta enviada coincida con el campo esperado, evitando ataques de suplantación de identidad.',

    // Friendly Error Decoder
    'error.decoder.title': '🔎 Traductor Amigable de Errores de Solana',
    'error.base58': 'Error de Decodificación Base58: Una clave pública enviada contiene caracteres no válidos o longitud incorrecta (debe tener 32–44 caracteres).',
    'error.discriminator': 'Descoincidencia de Discriminador de Cuenta: La cuenta proporcionada no fue creada por este programa o pertenece a un tipo diferente.',
    'error.lamports': 'Saldo Insuficiente de Lamports: La cuenta no tiene suficientes SOL para pagar la tasa de alquiler (rent-exempt) o la tarifa de red.',
    'error.pda_bump': 'Semilla/Bump Inválido para PDA: Las semillas proporcionadas no derivan la dirección esperada o el bump no es canónico.',
    'error.has_one': 'ConstraintHasOneViolated: La cuenta proporcionada no coincide con la autoridad declarada en la estructura de cuentas.',

    // Common Buttons & Actions
    'btn.audit_now': 'Auditar Ahora',
    'btn.autofix': 'Corrección Automática en 1-Clic',
    'btn.simulate': 'Simular Transacción',
    'btn.download_cicd': 'Descargar Pipeline CI/CD Resiliente',
    'btn.export': 'Exportar Proyecto',
    'btn.import': 'Importar de GitHub',
    'btn.close': 'Cerrar',
    'btn.save': 'Guardar en la Nube',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('solana_ide_lang') as Language;
    return saved === 'en' || saved === 'es' || saved === 'pt' ? saved : 'pt';
  });

  const [userMode, setUserModeState] = useState<UserMode>(() => {
    const saved = localStorage.getItem('solana_ide_mode') as UserMode;
    return saved === 'advanced' || saved === 'junior' ? saved : 'junior';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('solana_ide_lang', lang);
  };

  const setUserMode = (mode: UserMode) => {
    setUserModeState(mode);
    localStorage.setItem('solana_ide_mode', mode);
  };

  const t = (key: string, defaultText?: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, userMode, setUserMode, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
