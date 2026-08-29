import React, { useState, useMemo, useEffect } from 'react';
import { USER_INITIAL_COUNTER_CODE } from './data/defaultContracts';
import { runAnchorSecurityAudit } from './utils/solanaUtils';
import { fetchPublicGithubRepository } from './utils/githubService';
import { Navbar } from './components/Navbar';
import { CodeEditor } from './components/CodeEditor';
import { PdaVisualizer } from './components/PdaVisualizer';
import { ExecutionSandbox } from './components/ExecutionSandbox';
import { SdkAndIdlViewer } from './components/SdkAndIdlViewer';
import { SecurityGuide } from './components/SecurityGuide';
import { RustEngineViewer } from './components/RustEngineViewer';
import { AiAssistantModal } from './components/AiAssistantModal';
import { GithubPushModal } from './components/GithubPushModal';
import { CloudProjectsModal } from './components/CloudProjectsModal';
import { SystemTourModal } from './components/SystemTourModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { recordAuditToCloud } from './firebase';
import { Globe, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState<'editor' | 'pda' | 'simulator' | 'sdk' | 'guide' | 'rust_engine'>('editor');
  const [code, setCode] = useState<string>(USER_INITIAL_COUNTER_CODE);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [isGithubOpen, setIsGithubOpen] = useState<boolean>(false);
  const [githubInitialTab, setGithubInitialTab] = useState<'import' | 'export'>('import');
  const [isCloudOpen, setIsCloudOpen] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);

  // URL Auto-Import Status State
  const [urlImportLoading, setUrlImportLoading] = useState<boolean>(false);
  const [urlImportMessage, setUrlImportMessage] = useState<{ text: string; type: 'success' | 'error' | 'loading' } | null>(null);

  const { user } = useAuth();

  // Handle URL Query Parameters (e.g. ?repo=https://github.com/coral-xyz/anchor or ?repo=owner/repo or ?file=...)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const repoParam = searchParams.get('repo') || searchParams.get('github') || searchParams.get('url') || searchParams.get('file');

    if (repoParam) {
      setUrlImportLoading(true);
      setUrlImportMessage({ text: `Carregando repositório público: ${repoParam}...`, type: 'loading' });

      fetchPublicGithubRepository(repoParam)
        .then((result) => {
          if (result.success && result.code) {
            setCode(result.code);
            setActiveTab('editor');
            setUrlImportMessage({
              text: `Repositório público carregado com sucesso: ${result.owner}/${result.repo} (${result.selectedFilePath})`,
              type: 'success',
            });
            setTimeout(() => {
              setUrlImportMessage(null);
            }, 6000);
          }
        })
        .catch((err) => {
          setUrlImportMessage({
            text: `Erro ao carregar repositório da URL: ${err.message || 'URL inválida ou repositório privado'}`,
            type: 'error',
          });
        })
        .finally(() => {
          setUrlImportLoading(false);
        });
    }
  }, []);

  // Run security audit on current code state
  const auditResult = useMemo(() => {
    return runAnchorSecurityAudit(code);
  }, [code]);

  const handleRunAudit = () => {
    setActiveTab('editor');
    // Save audit record to Cloud Firestore if logged in
    if (user) {
      recordAuditToCloud(user.uid, {
        id: `audit_${Date.now()}`,
        contractTitle: 'Solana Counter Sandbox',
        score: auditResult.score,
        passedChecks: auditResult.passedChecks,
        totalRules: auditResult.totalRules,
        isProductionReady: auditResult.isProductionReady,
      }).catch((err) => console.error('Cloud audit record error:', err));
    }
  };

  const handleResetCode = () => {
    setCode(USER_INITIAL_COUNTER_CODE);
  };

  const handleLoadContractFromCloud = (loadedCode: string) => {
    setCode(loadedCode);
    setActiveTab('editor');
  };

  const handleLoadContractFromPublicGithub = (loadedCode: string, repoInfo?: { name: string; url: string }) => {
    setCode(loadedCode);
    setActiveTab('editor');
    if (repoInfo) {
      setUrlImportMessage({
        text: `Smart Contract importado do GitHub: ${repoInfo.name}`,
        type: 'success',
      });
      setTimeout(() => {
        setUrlImportMessage(null);
      }, 5000);
    }
  };

  const handleOpenGithubModal = (tab: 'import' | 'export' = 'import') => {
    setGithubInitialTab(tab);
    setIsGithubOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col lg:flex-row font-sans selection:bg-[#1f6feb] selection:text-white antialiased">
      {/* Left Navigation & Tools Sidebar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        auditScore={auditResult.score}
        auditIssues={auditResult.issues}
        onOpenAi={() => setIsAiOpen(true)}
        onRunAudit={handleRunAudit}
        onOpenGithub={(tab?: 'import' | 'export') => handleOpenGithubModal(tab || 'import')}
        onOpenCloud={() => setIsCloudOpen(true)}
        onOpenTour={() => setIsTourOpen(true)}
      />

      {/* Main Workspace Area (Right side) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* URL Import Notification Toast / Banner */}
        {urlImportMessage && (
          <div
            className={`mx-4 mt-3 p-2.5 rounded-md border text-xs font-mono flex items-center justify-between shadow-lg animate-fadeIn shrink-0 z-20 ${
              urlImportMessage.type === 'success'
                ? 'bg-[#238636]/20 border-[#238636] text-[#7ee787]'
                : urlImportMessage.type === 'error'
                ? 'bg-[#f85149]/20 border-[#f85149] text-[#ff7b72]'
                : 'bg-[#1f6feb]/20 border-[#1f6feb] text-[#58a6ff]'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {urlImportMessage.type === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : urlImportMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#7ee787] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#ff7b72] shrink-0" />
              )}
              <span className="truncate">{urlImportMessage.text}</span>
            </div>

            <button
              onClick={() => setUrlImportMessage(null)}
              className="p-1 hover:bg-black/30 rounded text-[#8b949e] hover:text-white transition-colors shrink-0 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content View Switcher */}
        <main className="flex-1 relative flex flex-col min-w-0">
          {activeTab === 'editor' && (
            <CodeEditor
              code={code}
              setCode={setCode}
              auditIssues={auditResult.issues}
              auditScore={auditResult.score}
              onRunAudit={handleRunAudit}
              onResetCode={handleResetCode}
              onOpenGithub={(tab?: 'import' | 'export') => handleOpenGithubModal(tab || 'import')}
            />
          )}

          {activeTab === 'pda' && <PdaVisualizer />}

          {activeTab === 'simulator' && <ExecutionSandbox code={code} />}

          {activeTab === 'sdk' && <SdkAndIdlViewer code={code} onOpenGithub={() => handleOpenGithubModal('export')} />}

          {activeTab === 'rust_engine' && <RustEngineViewer />}

          {activeTab === 'guide' && <SecurityGuide />}
        </main>
      </div>

      {/* Interactive System Tour and Tutorial Modal */}
      <SystemTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigateToTab={(tab) => setActiveTab(tab)}
        onOpenGithub={() => handleOpenGithubModal('import')}
        onOpenCloud={() => setIsCloudOpen(true)}
        onOpenAi={() => setIsAiOpen(true)}
      />

      {/* AI Senior Engineer Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        currentCode={code}
        onInsertCode={(newCode) => setCode(newCode)}
      />

      {/* Push & Open GitHub Modal */}
      <GithubPushModal
        isOpen={isGithubOpen}
        onClose={() => setIsGithubOpen(false)}
        code={code}
        auditScore={auditResult.score}
        onLoadContract={handleLoadContractFromPublicGithub}
        initialTab={githubInitialTab}
      />

      {/* Firebase Cloud Projects & Sync Modal */}
      <CloudProjectsModal
        isOpen={isCloudOpen}
        onClose={() => setIsCloudOpen(false)}
        currentCode={code}
        auditScore={auditResult.score}
        onLoadContract={handleLoadContractFromCloud}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
