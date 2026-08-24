import React, { useState, useEffect } from 'react';
import {
  GithubUser,
  GithubRepo,
  FileToPush,
  verifyGithubToken,
  getUserRepositories,
  createNewRepository,
  pushFilesToGithub,
  generateAnchorWorkspaceFiles,
} from '../utils/githubService';
import { generateAnchorIdl, generateTypeScriptClientCode } from '../utils/solanaUtils';
import {
  Github,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  GitBranch,
  FileCode,
  Package,
  ExternalLink,
  Lock,
  Globe,
  Loader2,
  X,
  Key,
  LogOut,
  RefreshCw,
  UploadCloud,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface GithubPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  auditScore: number;
}

export const GithubPushModal: React.FC<GithubPushModalProps> = ({
  isOpen,
  onClose,
  code,
  auditScore,
}) => {
  // Token state
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem('solana_architect_github_token') || '';
  });
  const [showTokenInput, setShowTokenInput] = useState<boolean>(true);
  const [isVerifyingToken, setIsVerifyingToken] = useState<boolean>(false);
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Repositories state
  const [userRepos, setUserRepos] = useState<GithubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  const [repoMode, setRepoMode] = useState<'existing' | 'new'>('new');

  // Repo form state
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [newRepoName, setNewRepoName] = useState<string>('solana-anchor-counter');
  const [newRepoDesc, setNewRepoDesc] = useState<string>('Smart Contract Solana Anchor auditado com Solana Architect');
  const [isPrivateRepo, setIsPrivateRepo] = useState<boolean>(false);
  const [targetBranch, setTargetBranch] = useState<string>('main');
  const [commitMessage, setCommitMessage] = useState<string>('feat: update Solana Anchor contract via Solana Architect');
  const [exportScope, setExportScope] = useState<'workspace' | 'contract_only'>('workspace');

  // Execution & Progress state
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [pushProgress, setPushProgress] = useState<{ current: number; total: number; file: string } | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushSuccess, setPushSuccess] = useState<{ repoUrl: string; commitUrl: string; fileCount: number } | null>(null);

  // Program ID
  const programId = 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';

  // Automatically verify token if present on load or open
  useEffect(() => {
    if (isOpen && token && !githubUser) {
      handleVerifyToken(token);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleVerifyToken(tokenToVerify: string) {
    setIsVerifyingToken(true);
    setTokenError(null);
    try {
      const user = await verifyGithubToken(tokenToVerify);
      setGithubUser(user);
      localStorage.setItem('solana_architect_github_token', tokenToVerify);
      setShowTokenInput(false);

      // Fetch user repos
      setIsLoadingRepos(true);
      try {
        const repos = await getUserRepositories(tokenToVerify);
        setUserRepos(repos);
        if (repos.length > 0) {
          setSelectedRepo(repos[0].name);
        }
      } catch (e) {
        console.error('Erro ao buscar repositórios:', e);
      } finally {
        setIsLoadingRepos(false);
      }
    } catch (err: any) {
      setGithubUser(null);
      setTokenError(err.message || 'Falha ao autenticar no GitHub com o token informado.');
    } finally {
      setIsVerifyingToken(false);
    }
  }

  function handleDisconnectAccount() {
    localStorage.removeItem('solana_architect_github_token');
    setGithubUser(null);
    setToken('');
    setShowTokenInput(true);
    setUserRepos([]);
    setPushSuccess(null);
    setPushError(null);
  }

  function prepareFilesToPush(): FileToPush[] {
    const idl = generateAnchorIdl(code, programId);
    const tsClient = generateTypeScriptClientCode(programId, '2X7m...pda');

    if (exportScope === 'contract_only') {
      return [
        {
          path: 'programs/solana_sandbox_counter/src/lib.rs',
          content: code,
          description: 'Smart Contract Rust Anchor',
        },
      ];
    }

    return generateAnchorWorkspaceFiles(code, programId, auditScore, idl, tsClient);
  }

  async function handleExecutePush() {
    if (!githubUser) {
      setPushError('Por favor, autentique com seu Personal Access Token do GitHub primeiro.');
      return;
    }

    setIsPushing(true);
    setPushError(null);
    setPushSuccess(null);

    try {
      let targetRepoName = selectedRepo;
      let branchName = targetBranch.trim() || 'main';

      // 1. Create repo if in 'new' mode
      if (repoMode === 'new') {
        if (!newRepoName.trim()) {
          throw new Error('Informe um nome válido para o novo repositório.');
        }
        setPushProgress({ current: 0, total: 1, file: 'Criando novo repositório no GitHub...' });
        const createdRepo = await createNewRepository(
          token,
          newRepoName,
          newRepoDesc,
          isPrivateRepo
        );
        targetRepoName = createdRepo.name;
        branchName = createdRepo.default_branch || 'main';

        // Add newly created repo to list
        setUserRepos((prev) => [createdRepo, ...prev]);
        setSelectedRepo(createdRepo.name);
      }

      // 2. Prepare files
      const files = prepareFilesToPush();

      // 3. Push files to repository
      const result = await pushFilesToGithub(
        token,
        githubUser.login,
        targetRepoName,
        branchName,
        files,
        commitMessage,
        (current, total, file) => {
          setPushProgress({ current, total, file });
        }
      );

      setPushSuccess({
        repoUrl: result.repoUrl,
        commitUrl: result.commitUrl || result.repoUrl,
        fileCount: result.pushedFilesCount,
      });
    } catch (err: any) {
      setPushError(err.message || 'Erro ao enviar os arquivos para o GitHub.');
    } finally {
      setIsPushing(false);
      setPushProgress(null);
    }
  }

  const previewFiles = prepareFilesToPush();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d1117] border-b border-[#30363d] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-[#21262d] border border-[#30363d] text-[#c9d1d9]">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Exportar Smart Contract para o GitHub</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-[#1f6feb]/20 text-[#58a6ff] rounded border border-[#1f6feb]/50">
                  GitHub REST API
                </span>
              </h2>
              <p className="text-[11px] text-[#8b949e]">
                Salve seu contrato Anchor, IDL e SDK diretamente em um repositório remoto.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#8b949e] hover:text-white rounded-md hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs font-sans text-[#c9d1d9] flex-1">
          {/* Section 1: Authentication */}
          <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#58a6ff] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>1. Autenticação com Personal Access Token (PAT)</span>
              </span>

              {githubUser && (
                <button
                  onClick={handleDisconnectAccount}
                  className="text-[11px] text-[#ff7b72] hover:underline flex items-center gap-1 font-mono"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Desconectar Conta</span>
                </button>
              )}
            </div>

            {!githubUser || showTokenInput ? (
              <div className="space-y-2.5">
                <p className="text-[#8b949e] text-[11px] leading-relaxed">
                  Para que a IDE possa enviar e criar repositórios com segurança, insira um{' '}
                  <strong className="text-[#c9d1d9]">Personal Access Token (PAT)</strong> do GitHub com o escopo completo <code className="text-[#58a6ff]">repo</code>.
                </p>

                <div className="p-2.5 bg-[#161b22] border border-[#30363d] rounded text-[11px] space-y-1.5 text-[#c9d1d9]">
                  <div className="font-bold text-[#58a6ff] flex items-center gap-1.5 font-mono">
                    <Lock className="w-3.5 h-3.5 text-[#e3b341]" />
                    <span>Permissões do Token para Repositórios Privados e Públicos:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[#8b949e] text-[10px] pl-1 font-mono">
                    <li>
                      <strong className="text-white">PAT Classic:</strong> Selecione a caixa principal <code className="text-[#7ee787]">repo</code> (garante controle total em repositórios públicos e privados).
                    </li>
                    <li>
                      <strong className="text-white">Fine-Grained Token:</strong> Selecione <code className="text-[#7ee787]">All repositories</code> e defina as permissões de <code className="text-[#7ee787]">Contents (Read and write)</code> e <code className="text-[#7ee787]">Administration (Read and write)</code>.
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="ghp_xxxx... ou github_pat_xxxx..."
                      className="w-full bg-[#161b22] text-xs font-mono text-white border border-[#30363d] rounded px-3 py-2 focus:outline-none focus:border-[#58a6ff] placeholder:text-[#484f58]"
                    />
                  </div>

                  <button
                    onClick={() => handleVerifyToken(token)}
                    disabled={isVerifyingToken || !token.trim()}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white font-semibold rounded text-xs transition-colors shrink-0"
                  >
                    {isVerifyingToken ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>{isVerifyingToken ? 'Verificando...' : 'Autenticar Token'}</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] pt-1">
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Solana+Architect+IDE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#58a6ff] hover:underline flex items-center gap-1 font-mono font-bold"
                  >
                    <span>Gerar Token Automático com escopo 'repo' no GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <span className="text-[#8b949e] text-[10px] font-mono">
                    🔒 Salvo localmente apenas no seu navegador.
                  </span>
                </div>

                {tokenError && (
                  <div className="p-2.5 bg-[#f85149]/15 border border-[#f85149]/50 text-[#ff7b72] rounded text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{tokenError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-[#161b22] p-2.5 rounded border border-[#30363d]">
                <div className="flex items-center gap-2.5">
                  <img
                    src={githubUser.avatar_url}
                    alt={githubUser.login}
                    className="w-8 h-8 rounded-full border border-[#30363d]"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                      <span>{githubUser.name || githubUser.login}</span>
                      <span className="text-[#8b949e] font-normal font-mono">(@{githubUser.login})</span>
                    </div>
                    <span className="text-[10px] text-[#7ee787] flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3 text-[#7ee787]" /> Token Autenticado ({githubUser.public_repos} repositórios)
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowTokenInput(true)}
                  className="px-2 py-1 text-[11px] text-[#8b949e] hover:text-white bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d] rounded transition-colors"
                >
                  Alterar Token
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Repository Settings */}
          {githubUser && (
            <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#d2a8ff] flex items-center gap-1.5">
                <FolderPlus className="w-3.5 h-3.5" />
                <span>2. Destino do Repositório</span>
              </span>

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRepoMode('new')}
                  className={`p-2.5 rounded border text-left flex items-start gap-2 transition-all ${
                    repoMode === 'new'
                      ? 'bg-[#1f6feb]/15 border-[#1f6feb] text-white'
                      : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/50'
                  }`}
                >
                  <FolderPlus className={`w-4 h-4 shrink-0 mt-0.5 ${repoMode === 'new' ? 'text-[#58a6ff]' : ''}`} />
                  <div>
                    <div className="font-bold text-xs">Criar Novo Repositório</div>
                    <div className="text-[10px] text-[#8b949e]">Cria um repositório automatizado no seu GitHub</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRepoMode('existing')}
                  className={`p-2.5 rounded border text-left flex items-start gap-2 transition-all ${
                    repoMode === 'existing'
                      ? 'bg-[#1f6feb]/15 border-[#1f6feb] text-white'
                      : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/50'
                  }`}
                >
                  <GitBranch className={`w-4 h-4 shrink-0 mt-0.5 ${repoMode === 'existing' ? 'text-[#58a6ff]' : ''}`} />
                  <div>
                    <div className="font-bold text-xs">Repositório Existente</div>
                    <div className="text-[10px] text-[#8b949e]">Envia os arquivos para um projeto já criado</div>
                  </div>
                </button>
              </div>

              {/* Repo Form Fields */}
              {repoMode === 'new' ? (
                <div className="space-y-2.5 bg-[#161b22] p-3 rounded border border-[#30363d]">
                  <div>
                    <label className="block text-[11px] font-mono text-[#8b949e] mb-1">
                      Nome do Novo Repositório:
                    </label>
                    <input
                      type="text"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="ex: solana-anchor-counter"
                      className="w-full bg-[#0d1117] text-xs font-mono text-white border border-[#30363d] rounded px-3 py-1.5 focus:outline-none focus:border-[#58a6ff]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#8b949e] mb-1">
                      Descrição:
                    </label>
                    <input
                      type="text"
                      value={newRepoDesc}
                      onChange={(e) => setNewRepoDesc(e.target.value)}
                      placeholder="Descrição do seu programa Solana..."
                      className="w-full bg-[#0d1117] text-xs font-mono text-white border border-[#30363d] rounded px-3 py-1.5 focus:outline-none focus:border-[#58a6ff]"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <label className="text-[11px] font-mono text-[#8b949e]">Visibilidade:</label>
                    <button
                      type="button"
                      onClick={() => setIsPrivateRepo(false)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono border ${
                        !isPrivateRepo
                          ? 'bg-[#238636]/20 border-[#238636] text-[#7ee787]'
                          : 'bg-[#0d1117] border-[#30363d] text-[#8b949e]'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      <span>Público</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPrivateRepo(true)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono border ${
                        isPrivateRepo
                          ? 'bg-[#d29922]/20 border-[#d29922] text-[#ffa657]'
                          : 'bg-[#0d1117] border-[#30363d] text-[#8b949e]'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                      <span>Privado</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 bg-[#161b22] p-3 rounded border border-[#30363d]">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-mono text-[#8b949e]">
                        Selecionar Repositório:
                      </label>
                      <button
                        onClick={() => handleVerifyToken(token)}
                        className="text-[10px] text-[#58a6ff] hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> Atualizar Lista
                      </button>
                    </div>

                    {isLoadingRepos ? (
                      <div className="p-2 text-center text-[#8b949e] flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Carregando seus repositórios...</span>
                      </div>
                    ) : userRepos.length > 0 ? (
                      <select
                        value={selectedRepo}
                        onChange={(e) => setSelectedRepo(e.target.value)}
                        className="w-full bg-[#0d1117] text-xs font-mono text-white border border-[#30363d] rounded px-3 py-1.5 focus:outline-none focus:border-[#58a6ff]"
                      >
                        {userRepos.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.full_name} {r.private ? '(Privado)' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={selectedRepo}
                        onChange={(e) => setSelectedRepo(e.target.value)}
                        placeholder="Nome do repositório (ex: meu-projeto-solana)"
                        className="w-full bg-[#0d1117] text-xs font-mono text-white border border-[#30363d] rounded px-3 py-1.5 focus:outline-none focus:border-[#58a6ff]"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Branch & Commit Message */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-mono text-[#8b949e] mb-1">Branch:</label>
                  <input
                    type="text"
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    placeholder="main"
                    className="w-full bg-[#161b22] text-xs font-mono text-white border border-[#30363d] rounded px-2.5 py-1 focus:outline-none focus:border-[#58a6ff]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono text-[#8b949e] mb-1">Mensagem do Commit:</label>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="ex: feat: update Solana Anchor contract"
                    className="w-full bg-[#161b22] text-xs font-mono text-white border border-[#30363d] rounded px-2.5 py-1 focus:outline-none focus:border-[#58a6ff]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Scope Selection & File Preview */}
          {githubUser && (
            <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#7ee787] flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>3. Pacote de Exportação e Pré-Visualização</span>
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope('workspace')}
                  className={`p-2.5 rounded border text-left transition-all ${
                    exportScope === 'workspace'
                      ? 'bg-[#238636]/15 border-[#238636] text-white'
                      : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/50'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1 text-[#7ee787]">
                    <Package className="w-3.5 h-3.5" />
                    <span>Workspace Completo Anchor</span>
                  </div>
                  <div className="text-[10px] text-[#8b949e] mt-0.5">
                    Inclui lib.rs, Anchor.toml, Cargo.toml, IDL, SDK Client e README com nota de auditoria (7 arquivos)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('contract_only')}
                  className={`p-2.5 rounded border text-left transition-all ${
                    exportScope === 'contract_only'
                      ? 'bg-[#238636]/15 border-[#238636] text-white'
                      : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/50'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center gap-1 text-[#58a6ff]">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Apenas Smart Contract</span>
                  </div>
                  <div className="text-[10px] text-[#8b949e] mt-0.5">
                    Envia unicamente o arquivo de código Rust (<code className="text-[#a5d6ff]">programs/.../lib.rs</code>)
                  </div>
                </button>
              </div>

              {/* Files Preview List */}
              <div className="bg-[#161b22] p-3 rounded border border-[#30363d] space-y-1.5 font-mono text-[11px]">
                <div className="text-[#8b949e] font-bold text-[10px] uppercase border-b border-[#30363d] pb-1 flex justify-between">
                  <span>Arquivos a serem sincronizados ({previewFiles.length}):</span>
                  <span>Branch: {targetBranch || 'main'}</span>
                </div>

                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {previewFiles.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[#c9d1d9] py-0.5">
                      <span className="flex items-center gap-1.5 truncate">
                        <FileText className="w-3 h-3 text-[#58a6ff] shrink-0" />
                        <span className="text-[#a5d6ff]">{f.path}</span>
                      </span>
                      <span className="text-[10px] text-[#8b949e] shrink-0">
                        {f.content.length} B
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Status Banners */}
          {pushError && (
            <div className="p-3 bg-[#f85149]/15 border border-[#f85149]/60 text-[#ff7b72] rounded-md text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#ff7b72]" />
              <div className="leading-relaxed">{pushError}</div>
            </div>
          )}

          {pushProgress && (
            <div className="p-3 bg-[#1f6feb]/15 border border-[#1f6feb]/60 text-[#58a6ff] rounded-md text-xs space-y-1.5">
              <div className="flex items-center justify-between font-mono font-bold">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-[#58a6ff]" />
                  <span>Enviando arquivos para o GitHub...</span>
                </span>
                <span>
                  {pushProgress.current} de {pushProgress.total}
                </span>
              </div>

              <p className="text-[11px] font-mono text-[#c9d1d9] truncate">
                Processando: {pushProgress.file}
              </p>

              <div className="w-full bg-[#0d1117] h-1.5 rounded-full overflow-hidden border border-[#30363d]">
                <div
                  className="bg-[#58a6ff] h-full transition-all duration-300"
                  style={{
                    width: `${pushProgress.total > 0 ? (pushProgress.current / pushProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {pushSuccess && (
            <div className="p-4 bg-[#238636]/20 border border-[#238636]/60 text-[#7ee787] rounded-lg text-xs space-y-2.5 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#7ee787] shrink-0" />
                <span className="font-bold text-sm text-white">
                  Smart Contract exportado com sucesso para o GitHub!
                </span>
              </div>

              <p className="text-[11px] text-[#c9d1d9] leading-relaxed">
                Foram sincronizados <strong className="text-white">{pushSuccess.fileCount} arquivo(s)</strong> no seu repositório.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                <a
                  href={pushSuccess.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold rounded flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>Abrir Repositório</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                {pushSuccess.commitUrl && (
                  <a
                    href={pushSuccess.commitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] rounded flex items-center gap-1.5 transition-colors"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-[#58a6ff]" />
                    <span>Ver Commit</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d1117] border-t border-[#30363d] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#8b949e] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors"
          >
            Fechar
          </button>

          {githubUser && !pushSuccess && (
            <button
              type="button"
              onClick={handleExecutePush}
              disabled={isPushing}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white font-semibold rounded text-xs transition-colors shadow-sm"
            >
              {isPushing ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <UploadCloud className="w-4 h-4 text-white" />
              )}
              <span>{isPushing ? 'Enviando...' : 'Confirmar e Enviar para o GitHub'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
