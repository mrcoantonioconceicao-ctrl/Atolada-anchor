import React, { useState } from 'react';
import {
  Cloud,
  Save,
  Trash2,
  FolderOpen,
  LogIn,
  LogOut,
  ShieldCheck,
  Calendar,
  Code2,
  X,
  Check,
  AlertCircle,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveContractToCloud, deleteContractFromCloud, CloudContract } from '../firebase';

interface CloudProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCode: string;
  auditScore: number;
  onLoadContract: (code: string, title?: string) => void;
}

export const CloudProjectsModal: React.FC<CloudProjectsModalProps> = ({
  isOpen,
  onClose,
  currentCode,
  auditScore,
  onLoadContract,
}) => {
  const { user, login, logout, cloudContracts, auditHistory, isFirebaseConnected, isLoggingIn } = useAuth();
  const [contractTitle, setContractTitle] = useState<string>('Meu Smart Contract Solana');
  const [contractDesc, setContractDesc] = useState<string>('Contrato Anchor auditado e validado.');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'contracts' | 'history'>('contracts');

  if (!isOpen) return null;

  const handleSaveCurrent = async () => {
    let currentUser = user;
    if (!currentUser) {
      currentUser = await login();
      if (!currentUser) return;
    }

    if (!contractTitle.trim()) return;

    setIsSaving(true);
    try {
      const contractId = `contract_${Date.now()}`;
      await saveContractToCloud(user.uid, {
        id: contractId,
        title: contractTitle.trim(),
        description: contractDesc.trim(),
        sourceCode: currentCode,
        templateType: 'custom',
        auditScore,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save contract:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (contractId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (confirm('Tem certeza que deseja excluir este contrato da nuvem?')) {
      try {
        await deleteContractFromCloud(user.uid, contractId);
      } catch (err) {
        console.error('Failed to delete contract:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#1f6feb26] border border-[#1f6feb]/50 text-[#58a6ff]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Firebase Cloud Sync & Projetos</span>
                {isFirebaseConnected && (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-[#238636]/20 text-[#7ee787] rounded border border-[#238636]/40">
                    Conectado
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#8b949e]">
                Persistência de smart contracts Anchor e histórico de auditorias no Firestore.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8b949e] hover:text-white rounded hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Auth Banner */}
        <div className="p-4 bg-[#161b22] border-b border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-9 h-9 rounded-full border border-[#30363d]"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#1f6feb] text-white flex items-center justify-center font-bold text-sm">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">
                  {user.displayName || 'Desenvolvedor Solana'}
                </div>
                <div className="text-[11px] text-[#8b949e] truncate">{user.email}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#8b949e]">
              <AlertCircle className="w-4 h-4 text-[#ffa657]" />
              <span>Faça login com sua conta Google para sincronizar contratos em nuvem.</span>
            </div>
          )}

          <div>
            {user ? (
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#ff7b72] hover:text-white bg-[#21262d] hover:bg-[#b62324] border border-[#30363d] rounded transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Desconectar</span>
              </button>
            ) : (
              <button
                onClick={() => login()}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isLoggingIn ? 'Conectando...' : 'Entrar com Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Save Current Contract Section */}
        {user && (
          <div className="p-4 bg-[#0d1117] border-b border-[#30363d] space-y-3">
            <div className="text-xs font-bold text-[#c9d1d9] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5 text-[#7ee787]" />
                Salvar Contrato Atual na Nuvem
              </span>
              <span className="text-[11px] font-mono text-[#8b949e]">
                Nota de Auditoria: {auditScore}/100
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                placeholder="Título do contrato (ex: Vault Staking)"
                className="px-3 py-1.5 text-xs bg-[#161b22] border border-[#30363d] rounded text-white focus:outline-hidden focus:border-[#58a6ff]"
              />
              <input
                type="text"
                value={contractDesc}
                onChange={(e) => setContractDesc(e.target.value)}
                placeholder="Descrição rápida da regra"
                className="px-3 py-1.5 text-xs bg-[#161b22] border border-[#30363d] rounded text-white focus:outline-hidden focus:border-[#58a6ff]"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveCurrent}
                disabled={isSaving || !contractTitle.trim()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 rounded transition-colors shadow-sm"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Salvo no Firestore!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar no Firestore'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab Selector */}
        <div className="px-4 pt-3 bg-[#161b22] border-b border-[#30363d] flex gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'contracts'
                ? 'border-[#58a6ff] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Contratos Salvos ({cloudContracts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'history'
                ? 'border-[#58a6ff] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Histórico de Auditorias ({auditHistory.length})</span>
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0d1117] space-y-2">
          {!user ? (
            <div className="py-8 text-center text-xs text-[#8b949e] space-y-2">
              <Cloud className="w-8 h-8 text-[#58a6ff] mx-auto opacity-40" />
              <p>Conecte sua conta para acessar seus contratos e auditorias armazenados no Firestore.</p>
            </div>
          ) : activeTab === 'contracts' ? (
            cloudContracts.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8b949e] space-y-2">
                <FileCode className="w-8 h-8 text-[#8b949e] mx-auto opacity-30" />
                <p>Nenhum contrato salvo em sua conta ainda. Salve seu primeiro smart contract acima!</p>
              </div>
            ) : (
              cloudContracts.map((contract) => (
                <div
                  key={contract.id}
                  onClick={() => {
                    onLoadContract(contract.sourceCode, contract.title);
                    onClose();
                  }}
                  className="p-3 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-lg cursor-pointer transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs truncate">{contract.title}</span>
                      <span
                        className={`px-1.5 py-0.2 text-[10px] font-mono rounded border ${
                          contract.auditScore >= 80
                            ? 'bg-[#238636]/20 text-[#7ee787] border-[#238636]/50'
                            : 'bg-[#ff7b72]/20 text-[#ff7b72] border-[#ff7b72]/50'
                        }`}
                      >
                        Nota: {contract.auditScore}/100
                      </span>
                    </div>
                    {contract.description && (
                      <p className="text-[11px] text-[#8b949e] truncate">{contract.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadContract(contract.sourceCode, contract.title);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-[#1f6feb26] hover:bg-[#1f6feb40] text-[#58a6ff] border border-[#1f6feb]/50 rounded text-xs transition-colors"
                    >
                      Carregar
                    </button>
                    <button
                      onClick={(e) => handleDelete(contract.id, e)}
                      className="p-1 text-[#8b949e] hover:text-[#ff7b72] rounded hover:bg-[#30363d] transition-colors"
                      title="Excluir da Nuvem"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )
          ) : auditHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8b949e] space-y-2">
              <ShieldCheck className="w-8 h-8 text-[#8b949e] mx-auto opacity-30" />
              <p>Nenhuma auditoria registrada no histórico. Execute a auditoria no editor para registrar.</p>
            </div>
          ) : (
            auditHistory.map((report) => (
              <div
                key={report.id}
                className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">{report.contractTitle}</div>
                  <div className="text-[11px] text-[#8b949e]">
                    {report.passedChecks} de {report.totalRules} regras aprovadas
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 font-mono text-xs rounded border ${
                      report.isProductionReady
                        ? 'bg-[#238636]/20 text-[#7ee787] border-[#238636]/50'
                        : 'bg-[#ff7b72]/20 text-[#ff7b72] border-[#ff7b72]/50'
                    }`}
                  >
                    Score: {report.score}/100
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
