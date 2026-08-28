import React, { useState, useEffect } from 'react';
import {
  GithubUser,
  GithubRepo,
  FileToPush,
  PublicRepoLoadResult,
  PublicRepoFile,
  verifyGithubToken,
  getUserRepositories,
  createNewRepository,
  pushFilesToGithub,
  generateAnchorWorkspaceFiles,
  fetchPublicGithubRepository,
  fetchPublicGithubFileContent,
  POPULAR_PUBLIC_SOLANA_REPOS,
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
  FileText,
  ShieldCheck,
  Search,
  Sparkles,
  Copy,
  Check,
  Star,
  DownloadCloud,
} from 'lucide-react';

interface GithubPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  auditScore: number;
  onLoadContract?: (code: string, repoInfo?: { name: string; url: string }) => void;
  initialTab?: 'import' | 'export';
}

export const GithubPushModal: React.FC<GithubPushModalProps> = ({
  isOpen,
  onClose,
  code,
  auditScore,
  onLoadContract,
  initialTab = 'import',
}) => {
  // Main Modal Tab: 'import' (Open Public Repo by URL) | 'export' (Push with PAT)
  const [activeModalTab, setActiveModalTab] = useState<'import' | 'export'>(initialTab);

  // -------------------------------------------------------------
  // Public Repository Import State (NO Token Required)
  // -------------------------------------------------------------
  const [publicUrlInput, setPublicUrlInput] = useState<string>('https://github.com/solana-developers/program-examples/blob/main/basics/counter/anchor/programs/counter/src/lib.rs');
  const [isLoadingPublicRepo, setIsLoadingPublicRepo] = useState<boolean>(false);
  const [publicRepoError, setPublicRepoError] = useState<string | null>(null);
  const [publicRepoData, setPublicRepoData] = useState<PublicRepoLoadResult | null>(null);
  const [selectedFileInPublicRepo, setSelectedFileInPublicRepo] = useState<string>('');
  const [isCopiedShareLink, setIsCopiedShareLink] = useState<boolean>(false);

  // -------------------------------------------------------------
  // Authenticated Export / Push State (PAT Required)
  // -------------------------------------------------------------
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

  useEffect(() => {
    if (isOpen) {
      setActiveModalTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Automatically verify token if present on load or open
  useEffect(() => {
    if (isOpen && token && !githubUser) {
      handleVerifyToken(token);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // Handlers for Public Repo Import
  // -------------------------------------------------------------
  async function handleFetchPublicRepo(urlToFetch?: string) {
    const targetUrl = urlToFetch || publicUrlInput;
    if (!targetUrl.trim()) {
      setPublicRepoError('Por favor, informe a URL de um repositório público ou arquivo no GitHub.');
      return;
    }

    setIsLoadingPublicRepo(true);
    setPublicRepoError(null);
    setPublicRepoData(null);

    try {
      const result = await fetchPublicGithubRepository(targetUrl);
      setPublicRepoData(result);
      setSelectedFileInPublicRepo(result.selectedFilePath);
    } catch (err: any) {
      setPublicRepoError(err.message || 'Falha ao buscar repositório público do GitHub.');
    } finally {
      setIsLoadingPublicRepo(false);
    }
  }

  async function handleSelectFileFromRepo(file: PublicRepoFile) {
    if (!publicRepoData) return;
    setIsLoadingPublicRepo(true);
    try {
      const content = await fetchPublicGithubFileContent(
        publicRepoData.owner,
        publicRepoData.repo,
        file.path,
        publicRepoData.branch
      );
      setPublicRepoData({
        ...publicRepoData,
        selectedFilePath: file.path,
        code: content,
        shareableUrl: `${window.location.origin}/?repo=https://github.com/${publicRepoData.owner}/${publicRepoData.repo}/blob/${publicRepoData.branch}/${file.path}`,
      });
      setSelectedFileInPublicRepo(file.path);
    } catch (err: any) {
      setPublicRepoError(err.message || 'Falha ao carregar arquivo selecionado.');
    } finally {
      setIsLoadingPublicRepo(false);
    }
  }

  function handleLoadPublicCodeIntoEditor() {
    if (!publicRepoData || !publicRepoData.code) return;
    if (onLoadContract) {
      onLoadContract(publicRepoData.code, {
        name: `${publicRepoData.owner}/${publicRepoData.repo} (${publicRepoData.selectedFilePath})`,
        url: publicRepoData.shareableUrl,
      });
    }
    onClose();
  }

  function handleCopyShareLink() {
    if (!publicRepoData) return;
    navigator.clipboard.writeText(publicRepoData.shareableUrl);
    setIsCopiedShareLink(true);
    setTimeout(() => setIsCopiedShareLink(false), 2500);
  }

  // -------------------------------------------------------------
  // Handlers for Authenticated Push
  // -------------------------------------------------------------
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
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d1117] border-b border-[#30363d] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-[#21262d] border border-[#30363d] text-[#c9d1d9]">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>GitHub Workspace & Repositórios Públicos</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-[#1f6feb]/20 text-[#58a6ff] rounded border border-[#1f6feb]/50">
                  Sem Login Obrigatório
                </span>
              </h2>
              <p className="text-[11px] text-[#8b949e]">
                Abra qualquer repositório público Solana/Anchor por URL ou sincronize seus projetos com PAT.
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

        {/* Tab Navigation (Open by URL vs Export with Token) */}
        <div className="flex items-center border-b border-[#30363d] bg-[#0d1117]/60 px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveModalTab('import')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeModalTab === 'import'
                ? 'border-[#58a6ff] text-[#58a6ff] bg-[#161b22]'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161b22]/50'
            } rounded-t`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Abrir Repositório Público (Apenas URL)</span>
            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-[#238636]/20 text-[#7ee787] border border-[#238636]/40">
              Livre
            </span>
          </button>

          <button
            onClick={() => setActiveModalTab('export')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeModalTab === 'export'
                ? 'border-[#58a6ff] text-[#58a6ff] bg-[#161b22]'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161b22]/50'
            } rounded-t`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Exportar para GitHub (Com Token PAT)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs font-sans text-[#c9d1d9] flex-1">
          {/* ========================================================================= */}
          {/* TAB 1: ABRIR REPOSITÓRIO PÚBLICO APENAS COM A URL (SEM TOKEN)             */}
          {/* ========================================================================= */}
          {activeModalTab === 'import' && (
            <div className="space-y-4">
              {/* Section 1: URL Input Box */}
              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#58a6ff] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>1. Digite ou Cole a URL do Repositório / Arquivo GitHub</span>
                  </span>
                  <span className="text-[10px] text-[#7ee787] font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#7ee787]" /> Acesso 100% Aberto
                  </span>
                </div>

                <p className="text-[11px] text-[#8b949e] leading-relaxed">
                  Você pode abrir <strong>qualquer repositório público</strong> informando a URL principal (<code className="text-[#a5d6ff]">https://github.com/owner/repo</code>), o link direto para um arquivo (<code className="text-[#a5d6ff]">.../programs/my_program/src/lib.rs</code>) ou o identificador (<code className="text-[#a5d6ff]">owner/repo</code>).
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={publicUrlInput}
                      onChange={(e) => setPublicUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFetchPublicRepo();
                      }}
                      placeholder="https://github.com/coral-xyz/anchor ou owner/repo"
                      className="w-full bg-[#161b22] text-xs font-mono text-white border border-[#30363d] rounded px-3 py-2 focus:outline-none focus:border-[#58a6ff] placeholder:text-[#484f58]"
                    />
                  </div>

                  <button
                    onClick={() => handleFetchPublicRepo()}
                    disabled={isLoadingPublicRepo || !publicUrlInput.trim()}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-50 text-white font-semibold rounded text-xs transition-colors shrink-0 shadow-sm"
                  >
                    {isLoadingPublicRepo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>{isLoadingPublicRepo ? 'Carregando...' : 'Abrir Repositório'}</span>
                  </button>
                </div>

                {publicRepoError && (
                  <div className="p-3 bg-[#f85149]/15 border border-[#f85149]/50 text-[#ff7b72] rounded text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{publicRepoError}</span>
                  </div>
                )}
              </div>

              {/* Section 2: Popular Solana Public Repositories (1-Click Loading) */}
              <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#d2a8ff] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#d2a8ff]" />
                    <span>Exemplos e Repositórios Públicos Populares</span>
                  </span>
                  <span className="text-[10px] text-[#8b949e] font-mono">1-Clique para Abrir</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {POPULAR_PUBLIC_SOLANA_REPOS.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPublicUrlInput(sample.repoUrl);
                        handleFetchPublicRepo(sample.repoUrl);
                      }}
                      className="p-2.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] hover:border-[#58a6ff] rounded text-left transition-all group flex flex-col justify-between space-y-1.5"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-white text-xs group-hover:text-[#58a6ff] flex items-center gap-1.5">
                          <Github className="w-3 h-3 text-[#8b949e] group-hover:text-white" />
                          <span>{sample.name}</span>
                        </span>
                        <ExternalLink className="w-3 h-3 text-[#8b949e] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      <p className="text-[10px] text-[#8b949e] line-clamp-2">
                        {sample.description}
                      </p>

                      <div className="flex items-center gap-1 pt-0.5">
                        {sample.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-1.5 py-0.2 text-[9px] font-mono bg-[#0d1117] text-[#58a6ff] rounded border border-[#30363d]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 3: Loaded Public Repository Details & Smart Contract Selector */}
              {publicRepoData && (
                <div className="p-4 bg-[#0d1117] border border-[#238636]/60 rounded-lg space-y-3 animate-fadeIn">
                  {/* Repo Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#30363d]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-mono flex items-center gap-1.5">
                          <Globe className="w-4 h-4 text-[#7ee787]" />
                          <span>{publicRepoData.owner} / {publicRepoData.repo}</span>
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-[#238636]/20 text-[#7ee787] rounded border border-[#238636]/40">
                          Branch: {publicRepoData.branch}
                        </span>
                        {Boolean(publicRepoData.stars) && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-[#161b22] text-[#e3b341] rounded border border-[#30363d]">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>{publicRepoData.stars}</span>
                          </span>
                        )}
                      </div>
                      {publicRepoData.description && (
                        <p className="text-[11px] text-[#8b949e] mt-1">
                          {publicRepoData.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleCopyShareLink}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-[#58a6ff] bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded transition-colors self-start sm:self-auto shrink-0"
                      title="Copiar link para abrir este repositório diretamente com URL"
                    >
                      {isCopiedShareLink ? <Check className="w-3 h-3 text-[#7ee787]" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopiedShareLink ? 'Link Copiado!' : 'Copiar Link Direto'}</span>
                    </button>
                  </div>

                  {/* Smart Contract Files List */}
                  <div>
                    <label className="block text-[11px] font-mono text-[#8b949e] mb-1.5">
                      Arquivos Smart Contract Rust Encontrados ({publicRepoData.files.length}):
                    </label>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 bg-[#161b22] p-2.5 rounded border border-[#30363d]">
                      {publicRepoData.files.map((file, fIdx) => (
                        <div
                          key={fIdx}
                          onClick={() => handleSelectFileFromRepo(file)}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                            selectedFileInPublicRepo === file.path
                              ? 'bg-[#1f6feb]/20 border border-[#1f6feb]/60 text-white'
                              : 'hover:bg-[#21262d] text-[#c9d1d9]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileCode className={`w-3.5 h-3.5 shrink-0 ${file.isProgramLib ? 'text-[#7ee787]' : 'text-[#58a6ff]'}`} />
                            <span className="font-mono text-xs truncate">{file.path}</span>
                            {file.isProgramLib && (
                              <span className="px-1.5 py-0.2 text-[9px] font-mono bg-[#238636]/30 text-[#7ee787] rounded">
                                Programa Principal
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] text-[#8b949e] font-mono shrink-0 ml-2">
                            {file.size ? `${Math.round(file.size / 1024)} KB` : 'Rust'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Code Preview Box */}
                  <div className="bg-[#161b22] p-3 rounded border border-[#30363d] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8b949e] border-b border-[#30363d] pb-1">
                      <span>Pré-visualização: {publicRepoData.selectedFilePath}</span>
                      <span>{publicRepoData.code.split('\n').length} linhas</span>
                    </div>

                    <pre className="font-mono text-[11px] text-[#c9d1d9] max-h-36 overflow-y-auto bg-[#0d1117] p-2.5 rounded border border-[#30363d]/70 leading-relaxed">
                      {publicRepoData.code.slice(0, 1200)}
                      {publicRepoData.code.length > 1200 && '\n... [restante do código carregado com sucesso]'}
                    </pre>
                  </div>

                  {/* Load into Editor Button */}
                  <div className="pt-1">
                    <button
                      onClick={handleLoadPublicCodeIntoEditor}
                      className="w-full py-2.5 px-4 bg-[#238636] hover:bg-[#2ea043] text-white font-bold text-xs rounded-md shadow-md flex items-center justify-center gap-2 transition-colors"
                    >
                      <DownloadCloud className="w-4 h-4" />
                      <span>Carregar no Editor & Iniciar Auditoria AST Completa</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: EXPORTAR COM PERSONAL ACCESS TOKEN (PAT)                          */}
          {/* ========================================================================= */}
          {activeModalTab === 'export' && (
            <div className="space-y-4">
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

              {/* Push Progress & Feedback */}
              {pushProgress && (
                <div className="p-3 bg-[#1f6feb]/15 border border-[#1f6feb]/50 rounded text-[11px] text-[#58a6ff] space-y-1.5">
                  <div className="flex items-center justify-between font-mono">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sincronizando com o GitHub...</span>
                    </span>
                    <span>
                      {pushProgress.current} / {pushProgress.total}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8b949e] truncate font-mono">
                    Arquivo: {pushProgress.file}
                  </div>
                </div>
              )}

              {pushError && (
                <div className="p-3 bg-[#f85149]/15 border border-[#f85149]/50 text-[#ff7b72] rounded text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pushError}</span>
                </div>
              )}

              {pushSuccess && (
                <div className="p-3.5 bg-[#238636]/15 border border-[#238636]/50 text-[#7ee787] rounded-lg text-[11px] space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-[#7ee787]" />
                    <span>Smart Contract sincronizado com sucesso no GitHub!</span>
                  </div>
                  <p className="text-[#c9d1d9] text-[11px]">
                    Foram enviados {pushSuccess.fileCount} arquivos para a branch{' '}
                    <strong className="text-white font-mono">{targetBranch || 'main'}</strong>.
                  </p>
                  <div className="flex items-center gap-2 pt-1 font-mono">
                    <a
                      href={pushSuccess.commitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white font-semibold rounded text-[11px] flex items-center gap-1.5 transition-colors"
                    >
                      <span>Ver Repositório no GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Action Button */}
              {githubUser && !pushSuccess && (
                <div className="pt-2">
                  <button
                    onClick={handleExecutePush}
                    disabled={isPushing}
                    className="w-full py-2.5 px-4 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white font-bold text-xs rounded-md shadow-md flex items-center justify-center gap-2 transition-colors"
                  >
                    {isPushing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Github className="w-4 h-4" />
                    )}
                    <span>
                      {isPushing ? 'Enviando Arquivos...' : 'Confirmar e Enviar para o GitHub'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
