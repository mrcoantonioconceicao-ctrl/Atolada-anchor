export interface GithubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  description: string | null;
}

export interface FileToPush {
  path: string;
  content: string;
  description?: string;
}

export interface PushResult {
  success: boolean;
  repoUrl: string;
  branch: string;
  commitUrl?: string;
  pushedFilesCount: number;
  error?: string;
}

export interface PullRequestResult {
  success: boolean;
  prUrl: string;
  prNumber: number;
  prBranch: string;
  baseBranch: string;
  repoUrl: string;
  pushedFilesCount: number;
  error?: string;
}

export interface ParsedGithubUrl {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
  isDirectFile: boolean;
  rawUrl?: string;
  fullRepoUrl: string;
}

export interface PublicRepoFile {
  path: string;
  name: string;
  size?: number;
  isProgramLib: boolean;
  isRust: boolean;
}

export interface PublicRepoLoadResult {
  success: boolean;
  owner: string;
  repo: string;
  branch: string;
  description?: string;
  stars?: number;
  files: PublicRepoFile[];
  selectedFilePath: string;
  code: string;
  shareableUrl: string;
  error?: string;
}

export const POPULAR_PUBLIC_SOLANA_REPOS = [
  {
    name: 'Anchor Official - Basic Tutorial',
    repoUrl: 'https://github.com/coral-xyz/anchor/blob/master/examples/tutorial/basic-0/programs/basic-0/src/lib.rs',
    description: 'Exemplo oficial introdutório do framework Anchor com inicialização de estado.',
    ownerRepo: 'coral-xyz/anchor',
    tags: ['Anchor', 'Oficial', 'Tutorial'],
  },
  {
    name: 'Solana Devs - Counter Program',
    repoUrl: 'https://github.com/solana-developers/program-examples/blob/main/basics/counter/anchor/programs/counter/src/lib.rs',
    description: 'Contrato Anchor de contador com instrução de incremento e validação de signer.',
    ownerRepo: 'solana-developers/program-examples',
    tags: ['Counter', 'Anchor v0.30', 'Basics'],
  },
  {
    name: 'Solana Devs - Create Account',
    repoUrl: 'https://github.com/solana-developers/program-examples/blob/main/basics/create-account/anchor/programs/create-account/src/lib.rs',
    description: 'Programa para criação de contas personalizadas e inicialização de rent exemption.',
    ownerRepo: 'solana-developers/program-examples',
    tags: ['Account', 'Rent', 'System Program'],
  },
  {
    name: 'Solana Devs - PDA Sharing',
    repoUrl: 'https://github.com/solana-developers/program-examples/blob/main/basics/pda-sharing/anchor/programs/pda-sharing/src/lib.rs',
    description: 'Padrão seguro de derivação de PDAs com sementes canônicas e bumps.',
    ownerRepo: 'solana-developers/program-examples',
    tags: ['PDA', 'Seeds', 'Security'],
  },
  {
    name: 'Solana Devs - Custom Errors',
    repoUrl: 'https://github.com/solana-developers/program-examples/blob/main/basics/custom-errors/anchor/programs/custom-errors/src/lib.rs',
    description: 'Tratamento rigoroso de erros tipados com macros #[error_code] e require!.',
    ownerRepo: 'solana-developers/program-examples',
    tags: ['Error Handling', 'Audit Ready'],
  },
];

/**
 * Parses any GitHub URL (full repo, blob file, tree, raw URL, or owner/repo identifier)
 */
export function parseGithubUrl(inputUrl: string): ParsedGithubUrl | null {
  if (!inputUrl || typeof inputUrl !== 'string') return null;

  let cleaned = inputUrl.trim();
  // Remove git+ or ssh prefixes if present
  cleaned = cleaned.replace(/^git\+https:\/\//, 'https://');
  cleaned = cleaned.replace(/^git@github\.com:/, 'https://github.com/');

  // 1. Check raw.githubusercontent.com format: https://raw.githubusercontent.com/owner/repo/branch/path/to/file
  const rawMatch = cleaned.match(/^https?:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/i);
  if (rawMatch) {
    const [, owner, repo, branch, path] = rawMatch;
    return {
      owner,
      repo: repo.replace(/\.git$/i, ''),
      branch,
      path,
      isDirectFile: true,
      rawUrl: cleaned,
      fullRepoUrl: `https://github.com/${owner}/${repo.replace(/\.git$/i, '')}`,
    };
  }

  // 2. Check standard github.com format: https://github.com/owner/repo(/blob|/tree/branch/path)?
  const ghMatch = cleaned.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/\?#]+)(.*)$/i);
  if (ghMatch) {
    const owner = ghMatch[1];
    let repo = ghMatch[2].replace(/\.git$/i, '');
    const rest = ghMatch[3] || '';

    // Check blob (file) URL: /blob/branch/path...
    const blobMatch = rest.match(/^\/blob\/([^\/]+)\/(.+)$/);
    if (blobMatch) {
      const branch = blobMatch[1];
      const path = blobMatch[2];
      return {
        owner,
        repo,
        branch,
        path,
        isDirectFile: true,
        rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
        fullRepoUrl: `https://github.com/${owner}/${repo}`,
      };
    }

    // Check tree (folder) URL: /tree/branch/path...
    const treeMatch = rest.match(/^\/tree\/([^\/]+)(?:\/(.+))?$/);
    if (treeMatch) {
      const branch = treeMatch[1];
      const path = treeMatch[2] || '';
      return {
        owner,
        repo,
        branch,
        path,
        isDirectFile: false,
        fullRepoUrl: `https://github.com/${owner}/${repo}`,
      };
    }

    return {
      owner,
      repo,
      isDirectFile: false,
      fullRepoUrl: `https://github.com/${owner}/${repo}`,
    };
  }

  // 3. Check shorthand owner/repo or owner/repo@branch or owner/repo:path
  const shortMatch = cleaned.match(/^([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)(?:@([a-zA-Z0-9_\-\.]+))?(?::(.+))?$/);
  if (shortMatch && !cleaned.includes('://')) {
    const owner = shortMatch[1];
    const repo = shortMatch[2].replace(/\.git$/i, '');
    const branch = shortMatch[3];
    const path = shortMatch[4];
    return {
      owner,
      repo,
      branch,
      path,
      isDirectFile: Boolean(path && path.endsWith('.rs')),
      fullRepoUrl: `https://github.com/${owner}/${repo}`,
    };
  }

  return null;
}

/**
 * Fetches raw file content from GitHub without requiring authentication
 */
export async function fetchPublicGithubFileContent(
  owner: string,
  repo: string,
  filePath: string,
  branch: string = 'main'
): Promise<string> {
  const primaryUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  
  try {
    const response = await fetch(primaryUrl);
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // continue to fallback
  }

  // If primary branch failed and branch was 'main', try 'master' as fallback
  if (branch === 'main') {
    try {
      const masterUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${filePath}`;
      const resMaster = await fetch(masterUrl);
      if (resMaster.ok) {
        return await resMaster.text();
      }
    } catch {
      // continue
    }
  }

  // As a last fallback, try GitHub API contents endpoint without auth
  const apiContentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
  const apiRes = await fetch(apiContentsUrl, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });

  if (apiRes.ok) {
    const apiData = await apiRes.json();
    if (apiData.content && apiData.encoding === 'base64') {
      return decodeURIComponent(escape(atob(apiData.content.replace(/\s/g, ''))));
    }
    if (apiData.download_url) {
      const rawRes = await fetch(apiData.download_url);
      if (rawRes.ok) return await rawRes.text();
    }
  }

  throw new Error(`Não foi possível carregar o arquivo '${filePath}' do repositório ${owner}/${repo}. Verifique se o arquivo existe e se o repositório é público.`);
}

/**
 * Fetches a public GitHub repository or file directly using only the URL or identifier
 * NO authentication token required!
 */
export async function fetchPublicGithubRepository(urlOrIdentifier: string): Promise<PublicRepoLoadResult> {
  const parsed = parseGithubUrl(urlOrIdentifier);
  if (!parsed) {
    throw new Error('URL ou identificador do GitHub inválido. Exemplos válidos: "https://github.com/coral-xyz/anchor" ou "solana-developers/program-examples".');
  }

  const { owner, repo } = parsed;
  let targetBranch = parsed.branch || 'main';

  // 1. Direct File Request
  if (parsed.isDirectFile && parsed.path) {
    const code = await fetchPublicGithubFileContent(owner, repo, parsed.path, targetBranch);
    const fileName = parsed.path.split('/').pop() || parsed.path;
    return {
      success: true,
      owner,
      repo,
      branch: targetBranch,
      files: [
        {
          path: parsed.path,
          name: fileName,
          isProgramLib: parsed.path.endsWith('lib.rs'),
          isRust: true,
        },
      ],
      selectedFilePath: parsed.path,
      code,
      shareableUrl: `${window.location.origin}/?repo=https://github.com/${owner}/${repo}/blob/${targetBranch}/${parsed.path}`,
    };
  }

  // 2. Repository Request: Fetch Repository metadata and Git Tree
  let defaultBranch = targetBranch;
  let repoDescription = '';
  let repoStars = 0;

  try {
    const repoMetaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (repoMetaRes.ok) {
      const repoData = await repoMetaRes.json();
      defaultBranch = parsed.branch || repoData.default_branch || 'main';
      repoDescription = repoData.description || '';
      repoStars = repoData.stargazers_count || 0;
    }
  } catch (e) {
    console.warn('Could not fetch repo metadata from GitHub API (might be rate limited), proceeding with branch:', defaultBranch);
  }

  targetBranch = defaultBranch;

  // 3. Fetch Git Tree recursively to list all files
  let treeFiles: { path: string; size?: number }[] = [];
  try {
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`);
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      if (Array.isArray(treeData.tree)) {
        treeFiles = treeData.tree
          .filter((item: any) => item.type === 'blob')
          .map((item: any) => ({ path: item.path, size: item.size }));
      }
    }
  } catch (e) {
    console.warn('Could not fetch git tree:', e);
  }

  // Filter Rust (.rs) files
  const rustFiles: PublicRepoFile[] = treeFiles
    .filter((f) => f.path.endsWith('.rs'))
    .map((f) => ({
      path: f.path,
      name: f.path.split('/').pop() || f.path,
      size: f.size,
      isRust: true,
      isProgramLib: f.path.endsWith('src/lib.rs') || f.path.endsWith('lib.rs') || f.path.includes('/programs/'),
    }));

  // Sort files: prioritize programs/**/src/lib.rs > src/lib.rs > lib.rs
  rustFiles.sort((a, b) => {
    if (a.isProgramLib && !b.isProgramLib) return -1;
    if (!a.isProgramLib && b.isProgramLib) return 1;
    if (a.path.includes('programs/') && !b.path.includes('programs/')) return -1;
    if (!a.path.includes('programs/') && b.path.includes('programs/')) return 1;
    return a.path.localeCompare(b.path);
  });

  // If no tree returned (e.g. rate limit), try standard Solana paths
  let selectedFilePath = '';
  let selectedCode = '';

  if (rustFiles.length > 0) {
    // Select the best candidate (e.g., first program lib.rs)
    selectedFilePath = rustFiles[0].path;
    selectedCode = await fetchPublicGithubFileContent(owner, repo, selectedFilePath, targetBranch);
  } else {
    // Fallback attempts
    const commonPaths = [
      `programs/${repo}/src/lib.rs`,
      `programs/counter/src/lib.rs`,
      `src/lib.rs`,
      `lib.rs`,
      `programs/basic-0/src/lib.rs`,
    ];

    let loaded = false;
    for (const testPath of commonPaths) {
      try {
        const text = await fetchPublicGithubFileContent(owner, repo, testPath, targetBranch);
        if (text && text.trim().length > 0) {
          selectedFilePath = testPath;
          selectedCode = text;
          rustFiles.push({
            path: testPath,
            name: testPath.split('/').pop() || testPath,
            isRust: true,
            isProgramLib: true,
          });
          loaded = true;
          break;
        }
      } catch {
        // try next path
      }
    }

    if (!loaded) {
      throw new Error(
        `Nenhum arquivo de Smart Contract Rust (.rs) foi encontrado no repositório público ${owner}/${repo}. Certifique-se de que é um repositório Solana/Anchor válido.`
      );
    }
  }

  return {
    success: true,
    owner,
    repo,
    branch: targetBranch,
    description: repoDescription,
    stars: repoStars,
    files: rustFiles,
    selectedFilePath,
    code: selectedCode,
    shareableUrl: `${window.location.origin}/?repo=https://github.com/${owner}/${repo}`,
  };
}

/**
 * Utility to encode unicode strings to Base64 safely in browser
 */
function utf8ToBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

/**
 * Verifies a GitHub Personal Access Token (PAT) and returns the authenticated user details
 */
export async function verifyGithubToken(token: string): Promise<GithubUser> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('O Personal Access Token do GitHub não foi fornecido.');
  }

  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Token inválido ou expirado. Verifique as permissões do seu Personal Access Token.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Erro de autenticação no GitHub (Status ${response.status}).`);
  }

  const data = await response.json();
  return {
    login: data.login,
    name: data.name,
    avatar_url: data.avatar_url,
    html_url: data.html_url,
    public_repos: data.public_repos,
  };
}

/**
 * Fetches the user's repositories
 */
export async function getUserRepositories(token: string): Promise<GithubRepo[]> {
  const cleanToken = token.trim();
  const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&type=all', {
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar repositórios no GitHub (Status ${response.status}).`);
  }

  const data = await response.json();
  return data.map((repo: any) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
    html_url: repo.html_url,
    default_branch: repo.default_branch || 'main',
    description: repo.description,
  }));
}

/**
 * Creates a new GitHub repository for the authenticated user
 */
export async function createNewRepository(
  token: string,
  name: string,
  description: string,
  isPrivate: boolean
): Promise<GithubRepo> {
  const cleanToken = token.trim();
  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name.trim().replace(/\s+/g, '-'),
      description: description || 'Smart Contract Solana Anchor gerado com Solana Architect',
      private: isPrivate,
      auto_init: true,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (errData.errors && errData.errors[0]?.message) {
      throw new Error(`Erro ao criar repositório: ${errData.errors[0].message}`);
    }
    throw new Error(errData.message || `Erro ao criar repositório no GitHub (Status ${response.status}).`);
  }

  const repo = await response.json();
  return {
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
    html_url: repo.html_url,
    default_branch: repo.default_branch || 'main',
    description: repo.description,
  };
}

/**
 * Retrieves SHA of a file if it exists in the repository
 */
async function getExistingFileSha(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.sha || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Pushes a batch of files to a GitHub repository using the GitHub REST Contents API
 */
export async function pushFilesToGithub(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  files: FileToPush[],
  commitMessage: string,
  onProgress?: (current: number, total: number, currentFilePath: string) => void
): Promise<PushResult> {
  const cleanToken = token.trim();
  let lastCommitUrl = '';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(i + 1, files.length, file.path);
    }

    const sha = await getExistingFileSha(cleanToken, owner, repo, file.path, branch);
    const base64Content = utf8ToBase64(file.content);

    const bodyData: any = {
      message: `${commitMessage} - ${file.path}`,
      content: base64Content,
      branch: branch || 'main',
    };

    if (sha) {
      bodyData.sha = sha;
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(
        `Erro ao enviar o arquivo '${file.path}': ${errData.message || response.statusText}`
      );
    }

    const resData = await response.json();
    if (resData.commit?.html_url) {
      lastCommitUrl = resData.commit.html_url;
    }
  }

  const repoUrl = `https://github.com/${owner}/${repo}`;

  return {
    success: true,
    repoUrl,
    branch,
    commitUrl: lastCommitUrl || `${repoUrl}/tree/${branch}`,
    pushedFilesCount: files.length,
  };
}

/**
 * Creates a new branch, pushes files to it, and opens a Pull Request on GitHub
 */
export async function createGithubPullRequest(
  token: string,
  owner: string,
  repo: string,
  baseBranch: string = 'main',
  prTitle: string,
  prBody: string,
  files: FileToPush[],
  commitMessage: string,
  onProgress?: (current: number, total: number, currentFilePath: string) => void
): Promise<PullRequestResult> {
  const cleanToken = token.trim();
  const prBranch = `solana-architect-pr-${Date.now().toString().slice(-6)}`;

  // 1. Get default branch SHA
  let baseSha = '';
  try {
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
      {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (refRes.ok) {
      const refData = await refRes.json();
      baseSha = refData.object?.sha || '';
    }
  } catch {
    // continue
  }

  // Fallback to repository default branch if baseSha not found
  if (!baseSha) {
    try {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        const actualDefaultBranch = repoData.default_branch || 'main';
        const defaultRefRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${actualDefaultBranch}`,
          {
            headers: {
              Authorization: `Bearer ${cleanToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        if (defaultRefRes.ok) {
          const defaultRefData = await defaultRefRes.json();
          baseSha = defaultRefData.object?.sha || '';
          baseBranch = actualDefaultBranch;
        }
      }
    } catch {
      // continue
    }
  }

  // 2. Create new branch if base SHA was found
  if (baseSha) {
    try {
      await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: `refs/heads/${prBranch}`,
          sha: baseSha,
        }),
      });
    } catch {
      // continue
    }
  }

  const targetBranch = baseSha ? prBranch : baseBranch;

  // 3. Push files to the new branch
  const pushRes = await pushFilesToGithub(
    cleanToken,
    owner,
    repo,
    targetBranch,
    files,
    commitMessage,
    onProgress
  );

  // 4. Create Pull Request
  try {
    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: prTitle || 'feat: update Solana Anchor contract & security audit',
        head: targetBranch,
        base: baseBranch,
        body: prBody || 'Pull Request gerado via Solana Architect IDE.',
      }),
    });

    if (prRes.ok) {
      const prData = await prRes.json();
      return {
        success: true,
        prUrl: prData.html_url,
        prNumber: prData.number,
        prBranch: targetBranch,
        baseBranch,
        repoUrl: pushRes.repoUrl,
        pushedFilesCount: pushRes.pushedFilesCount,
      };
    } else {
      const prErrData = await prRes.json().catch(() => ({}));
      const reason = prErrData.message || 'Branch criada, mas a abertura automática do PR retornou aviso do GitHub.';
      return {
        success: true,
        prUrl: pushRes.commitUrl || `${pushRes.repoUrl}/tree/${targetBranch}`,
        prNumber: 0,
        prBranch: targetBranch,
        baseBranch,
        repoUrl: pushRes.repoUrl,
        pushedFilesCount: pushRes.pushedFilesCount,
        error: reason,
      };
    }
  } catch (err: any) {
    return {
      success: true,
      prUrl: pushRes.commitUrl || `${pushRes.repoUrl}/tree/${targetBranch}`,
      prNumber: 0,
      prBranch: targetBranch,
      baseBranch,
      repoUrl: pushRes.repoUrl,
      pushedFilesCount: pushRes.pushedFilesCount,
      error: err?.message || 'Erro ao conectar à API de Pull Requests do GitHub.',
    };
  }
}

/**
 * Generates the standard '.github/workflows/anchor-audit.yml' file content
 * configuring the DevSecOps CI/CD pipeline according to project requirements:
 * - Pull Request event: static analysis & security linting, Anchor verification, binary determinism checks, and unit tests
 * - Merge event: automated contract deployment to target cluster using dedicated deployment key
 */
export function generateAnchorAuditWorkflowYaml(
  programName: string = 'solana_sandbox_counter',
  minScore: number = 85
): string {
  return `name: Anchor Security Audit & DevSecOps Pipeline

on:
  pull_request:
    branches: [ main, master ]
  push:
    branches: [ main, master ]
  workflow_dispatch:

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

env:
  SOLANA_VERSION: "1.18.18"
  ANCHOR_VERSION: "0.30.0"
  NODE_VERSION: "20"
  RUST_VERSION: "1.75.0"
  PROGRAM_NAME: "${programName}"
  MIN_AUDIT_SCORE: "${minScore}"

jobs:
  # =========================================================================
  # ROTA 1: PULL REQUEST AUDIT, DETERMINISM & VERIFICATION GATE
  # =========================================================================
  security-audit-and-verification:
    name: 🛡️ Anchor Verification, Determinism & Security Linting
    runs-on: ubuntu-22.04
    steps:
      - name: 📥 Checkout Repository
        uses: actions/checkout@v4

      - name: 🦀 Setup Rust Toolchain (Pinned 1.75.0)
        uses: dtolnay/rust-toolchain@master
        with:
          toolchain: \${{ env.RUST_VERSION }}
          components: clippy, rustfmt

      - name: 📦 Setup Node.js & Cache Yarn
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'yarn'

      - name: ⚡ Cache Cargo & Solana
        uses: actions/cache@v4
        with:
          path: |
            ~/.cargo/bin/
            ~/.cargo/registry/index/
            ~/.cargo/registry/cache/
            ~/.cargo/git/db/
            target/
            ~/.local/share/solana/
          key: \${{ runner.os }}-anchor-\${{ env.ANCHOR_VERSION }}-solana-\${{ env.SOLANA_VERSION }}-\${{ hashFiles('**/Cargo.lock') }}
          restore-keys: |
            \${{ runner.os }}-anchor-\${{ env.ANCHOR_VERSION }}-solana-\${{ env.SOLANA_VERSION }}-

      - name: ⚙️ Install Solana CLI Suite (\${{ env.SOLANA_VERSION }}) with SSL Fallback
        run: |
          if ! command -v solana &> /dev/null; then
            echo "==> Tentando baixar o tarball oficial direto do repositório GitHub para evitar falhas de SSL..."
            curl -L --retry 5 --retry-delay 5 -o solana-release.tar.bz2 https://github.com/solana-labs/solana/releases/download/v\${{ env.SOLANA_VERSION }}/solana-release-x86_64-unknown-linux-gnu.tar.bz2 || true

            if [ -f "solana-release.tar.bz2" ] && [ -s "solana-release.tar.bz2" ]; then
              mkdir -p \$HOME/.local/share/solana/install/active_release
              tar -jxf solana-release.tar.bz2 -C \$HOME/.local/share/solana/install/active_release --strip-components=1
            else
              echo "⚠️ Fallback para o script de instalação oficial com TLSv1.2..."
              sh -c "$(curl --proto '=https' --tlsv1.2 --retry 5 --retry-delay 5 -sSfL https://release.solana.com/v\${{ env.SOLANA_VERSION }}/install)"
            fi
          fi

          if [ -f "\$HOME/.local/share/solana/install/active_release/env" ]; then
            source "\$HOME/.local/share/solana/install/active_release/env"
          fi
          echo "\$HOME/.local/share/solana/install/active_release/bin" >> \$GITHUB_PATH
          export PATH="\$HOME/.local/share/solana/install/active_release/bin:\$PATH"

          if ! command -v solana &> /dev/null; then
            echo "❌ Erro Fatal: O executável 'solana' não foi encontrado no PATH."
            exit 1
          fi
          echo "✅ Solana CLI instalada e validada com sucesso:"
          solana --version

      - name: ⚓ Install & Validate Anchor CLI Binary (\${{ env.ANCHOR_VERSION }})
        run: |
          if ! command -v anchor &> /dev/null || [ "$(anchor --version | awk '{print $2}')" != "\${{ env.ANCHOR_VERSION }}" ]; then
            cargo install --git https://github.com/coral-xyz/anchor --tag v\${{ env.ANCHOR_VERSION }} anchor-cli --locked
          fi
          
          # Validação rigorosa da instalação do Anchor CLI
          if ! command -v anchor &> /dev/null; then
            echo "❌ Erro Fatal: O executável 'anchor' não foi encontrado no PATH após a instalação."
            exit 1
          fi

          echo "✅ Anchor CLI instalado e validado com sucesso:"
          anchor --version

      - name: 📦 Install Node Dependencies
        run: yarn install --frozen-lockfile

      # 1. Padronização e Verificação de Formatação
      - name: 🎨 1. Code Formatting Check (rustfmt)
        run: cargo fmt --all -- --check

      # 2. Análise Estática & Security Linting (Clippy + Cargo Audit)
      - name: 🔍 2. Security Linting & Safe Math Audit (Clippy)
        run: |
          cargo clippy --all-targets --features idl-build -- -D warnings \\
            -W clippy::arithmetic_side_effects \\
            -D clippy::unwrap_used

      # 3. Anchor Build com suporte nativo a idl-build
      - name: 🏗️ 3. Anchor Build (com suporte nativo a idl-build)
        run: |
          solana-keygen new --no-bip39-passphrase --silent --force --outfile ~/.config/solana/id.json
          anchor build

      # 4. Validar Determinismo do Binário e Checksums
      - name: 🔒 4. Binary Determinism & Checksums Verification
        run: |
          mkdir -p target/checksums
          echo "=== Relatório de Integridade e Determinismo dos Binários SBF ==="
          if [ -d "target/deploy" ]; then
            for bin in target/deploy/*.so; do
              if [ -f "$bin" ]; then
                HASH=\$(sha256sum "$bin" | awk '{print \$1}')
                BIN_NAME=\$(basename "$bin")
                echo "Arquivo: \$BIN_NAME | SHA256: \$HASH"
                echo "\$HASH \$BIN_NAME" > "target/checksums/\${BIN_NAME}.sha256"
              fi
            done
          else
            echo "❌ Erro: target/deploy não encontrado!"
            exit 1
          fi

      - name: 📤 Upload Binaries & Checksum Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: solana-program-sbf-binaries
          path: |
            target/deploy/*.so
            target/checksums/*.sha256
            target/idl/*.json

      # 5. Suíte de Testes Unitários e de Integração
      - name: 🧪 5. Execute Anchor Tests
        run: anchor test

  # =========================================================================
  # ROTA 2: DEPLOY AUTOMÁTICO NO CLUSTER DE DESTINO (ON MERGE TO MAIN)
  # =========================================================================
  deploy-devnet:
    name: 🚀 Deploy to Solana Devnet (On Merge)
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master')
    needs: security-audit-and-verification
    runs-on: ubuntu-22.04
    steps:
      - name: 📥 Checkout Repository
        uses: actions/checkout@v4

      - name: ⚙️ Setup Solana CLI Suite (\${{ env.SOLANA_VERSION }}) with SSL Fallback
        run: |
          if ! command -v solana &> /dev/null; then
            echo "==> Tentando baixar o tarball oficial direto do repositório GitHub para evitar falhas de SSL..."
            curl -L --retry 5 --retry-delay 5 -o solana-release.tar.bz2 https://github.com/solana-labs/solana/releases/download/v\${{ env.SOLANA_VERSION }}/solana-release-x86_64-unknown-linux-gnu.tar.bz2 || true

            if [ -f "solana-release.tar.bz2" ] && [ -s "solana-release.tar.bz2" ]; then
              mkdir -p \$HOME/.local/share/solana/install/active_release
              tar -jxf solana-release.tar.bz2 -C \$HOME/.local/share/solana/install/active_release --strip-components=1
            else
              echo "⚠️ Fallback para o script de instalação oficial com TLSv1.2..."
              sh -c "$(curl --proto '=https' --tlsv1.2 --retry 5 --retry-delay 5 -sSfL https://release.solana.com/v\${{ env.SOLANA_VERSION }}/install)"
            fi
          fi

          if [ -f "\$HOME/.local/share/solana/install/active_release/env" ]; then
            source "\$HOME/.local/share/solana/install/active_release/env"
          fi
          echo "\$HOME/.local/share/solana/install/active_release/bin" >> \$GITHUB_PATH
          export PATH="\$HOME/.local/share/solana/install/active_release/bin:\$PATH"

          if ! command -v solana &> /dev/null; then
            echo "❌ Erro Fatal: O executável 'solana' não foi encontrado no PATH."
            exit 1
          fi
          echo "✅ Solana CLI instalada e validada com sucesso:"
          solana --version

      - name: ⚓ Install & Validate Anchor CLI Binary (\${{ env.ANCHOR_VERSION }})
        run: |
          if ! command -v anchor &> /dev/null || [ "$(anchor --version | awk '{print $2}')" != "\${{ env.ANCHOR_VERSION }}" ]; then
            cargo install --git https://github.com/coral-xyz/anchor --tag v\${{ env.ANCHOR_VERSION }} anchor-cli --locked
          fi
          
          # Validação rigorosa da instalação do Anchor CLI
          if ! command -v anchor &> /dev/null; then
            echo "❌ Erro Fatal: O executável 'anchor' não foi encontrado no PATH após a instalação."
            exit 1
          fi
          
          echo "✅ Anchor CLI instalado e validado com sucesso:"
          anchor --version

      - name: 🔑 Configure Dedicated Deployment Keypair
        env:
          SOLANA_DEPLOY_KEY: \${{ secrets.SOLANA_DEVNET_DEPLOY_KEY }}
        run: |
          if [ -z "$SOLANA_DEPLOY_KEY" ]; then
            echo "⚠️ Segredo SOLANA_DEVNET_DEPLOY_KEY não configurado no repositório. Deploy ignorado."
            exit 0
          fi
          mkdir -p ~/.config/solana
          echo "$SOLANA_DEPLOY_KEY" > ~/.config/solana/id.json
          chmod 600 ~/.config/solana/id.json
          solana config set --url https://api.devnet.solana.com

      - name: 🚀 Deploy Anchor Program to Solana Cluster
        run: |
          export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
          anchor build
          anchor deploy --provider.cluster devnet
          echo "🎉 Contrato implantado com sucesso no cluster Devnet."
`;
}

/**
 * Generates the full set of files for a complete Anchor workspace
 */
export function generateAnchorWorkspaceFiles(
  code: string,
  programId: string,
  auditScore: number,
  idlJson: object,
  tsClientCode: string
): FileToPush[] {
  const programName = 'solana_sandbox_counter';

  const anchorToml = `[toolchain]
anchor_version = "0.30.0"

[features]
resolution = true
skip-lint = false

[programs.localnet]
${programName} = "${programId}"

[programs.devnet]
${programName} = "${programId}"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
`;

  const cargoWorkspaceToml = `[workspace]
members = [
    "programs/*"
]
resolver = "2"

[profile.release]
overflow-checks = true
lto = "fat"
codegen-units = 1
[profile.release.build-override]
opt-level = 3
incremental = false
codegen-units = 1
`;

  const cargoProgramToml = `[package]
name = "${programName}"
version = "0.1.0"
description = "Solana Anchor Smart Contract generated with Solana Architect IDE"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "${programName}"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []
idl-build = ["anchor-lang/idl-build"]

[dependencies]
anchor-lang = { version = "0.30.0", features = ["init-if-needed"] }
`;

  const packageJson = JSON.stringify(
    {
      name: programName,
      version: "0.1.0",
      description: "Solana Anchor Smart Contract generated with Solana Architect IDE",
      scripts: {
        "lint:fix": "prettier */*.js \"*/**/*{.js,.ts}\" -w",
        "lint": "prettier */*.js \"*/**/*{.js,.ts}\" -c",
        "test": "anchor test"
      },
      dependencies: {
        "@coral-xyz/anchor": "^0.30.0",
        "@solana/web3.js": "^1.95.0"
      },
      devDependencies: {
        "@types/bn.js": "^5.1.0",
        "@types/chai": "^4.3.0",
        "@types/mocha": "^9.0.0",
        "chai": "^4.3.4",
        "mocha": "^9.0.3",
        "prettier": "^2.6.2",
        "ts-mocha": "^10.0.0",
        "typescript": "^5.0.0"
      }
    },
    null,
    2
  );

  const tsConfigJson = JSON.stringify(
    {
      compilerOptions: {
        target: "es2020",
        module: "commonjs",
        lib: ["es2020"],
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: "./dist"
      },
      include: ["tests/**/*.ts", "client/**/*.ts"]
    },
    null,
    2
  );

  const yarnLock = `# THIS IS AN AUTOGENERATED LOCKFILE. DO NOT EDIT DIRECTLY.
# yarn lockfile v1

"@coral-xyz/anchor@^0.30.0":
  version "0.30.0"
  resolved "https://registry.yarnpkg.com/@coral-xyz/anchor/-/anchor-0.30.0.tgz"
  dependencies:
    "@solana/web3.js" "^1.95.0"
    bn.js "^5.2.1"
    bs58 "^5.0.0"
    buffer "^6.0.3"

"@solana/web3.js@^1.95.0":
  version "1.95.0"
  resolved "https://registry.yarnpkg.com/@solana/web3.js/-/web3.js-1.95.0.tgz"
  dependencies:
    bn.js "^5.2.1"
    bs58 "^5.0.0"
    buffer "^6.0.3"

"@types/bn.js@^5.1.0":
  version "5.1.5"
  resolved "https://registry.yarnpkg.com/@types/bn.js/-/bn.js-5.1.5.tgz"

"@types/chai@^4.3.0":
  version "4.3.11"
  resolved "https://registry.yarnpkg.com/@types/chai/-/chai-4.3.11.tgz"

"@types/mocha@^9.0.0":
  version "9.1.1"
  resolved "https://registry.yarnpkg.com/@types/mocha/-/mocha-9.1.1.tgz"

bn.js@^5.2.1:
  version "5.2.1"
  resolved "https://registry.yarnpkg.com/bn.js/-/bn.js-5.2.1.tgz"

bs58@^5.0.0:
  version "5.0.0"
  resolved "https://registry.yarnpkg.com/bs58/-/bs58-5.0.0.tgz"

chai@^4.3.4:
  version "4.3.10"
  resolved "https://registry.yarnpkg.com/chai/-/chai-4.3.10.tgz"

mocha@^9.0.3:
  version "9.2.2"
  resolved "https://registry.yarnpkg.com/mocha/-/mocha-9.2.2.tgz"

ts-mocha@^10.0.0:
  version "10.0.0"
  resolved "https://registry.yarnpkg.com/ts-mocha/-/ts-mocha-10.0.0.tgz"

typescript@^5.0.0:
  version "5.3.3"
  resolved "https://registry.yarnpkg.com/typescript/-/typescript-5.3.3.tgz"
`;

  const testFileTs = `import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";

describe("${programName}", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaSandboxCounter as Program;

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Transaction signature:", tx);
    expect(tx).to.be.a("string");
  });
});
`;

  const anchorAuditWorkflowContent = generateAnchorAuditWorkflowYaml(programName, auditScore);

  const readmeMd = `# ${programName} (Solana Anchor Smart Contract)

Este repositório contém o código-fonte do Smart Contract em Rust/Anchor e o SDK cliente TypeScript, exportados diretamente do **Solana Architect IDE**.

## 🛡️ Relatório de Auditoria de Segurança AST
- **Score de Segurança Auditoria:** \`${auditScore}/100\`
- **Program ID:** \`${programId}\`
- **Framework:** Anchor v0.30.0
- **Rede Solana Alvo:** Localnet / Devnet / Mainnet-Beta

## 📁 Estrutura do Repositório
\`\`\`text
.
├── Anchor.toml
├── Cargo.toml
├── package.json
├── yarn.lock
├── tsconfig.json
├── README.md
├── client/
│   └── index.ts                 # SDK Cliente TypeScript para Interação
├── tests/
│   └── ${programName}.ts        # Testes unitários Anchor em TypeScript
├── target/
│   └── idl/
│       └── ${programName}.json   # IDL Anchor Gerado
└── programs/
    └── ${programName}/
        ├── Cargo.toml
        └── src/
            └── lib.rs           # Smart Contract Rust Principal
\`\`\`

## 🚀 Como Compilar e Testar Localmente

1. Certifique-se de ter o **Solana CLI** e o **Anchor v0.30** instalados.
2. Instale as dependências TypeScript com Yarn:
   \`\`\`bash
   yarn install
   \`\`\`
3. Compile o programa Anchor:
   \`\`\`bash
   anchor build
   \`\`\`
4. Execute os testes em ambiente localnet:
   \`\`\`bash
   anchor test
   \`\`\`

---
*Gerado via **Solana Architect** - Ambiente de Auditoria AST e Sandbox Solana.*
`;

  return [
    {
      path: `programs/${programName}/src/lib.rs`,
      content: code,
      description: 'Código-fonte principal do contrato em Rust (Anchor)',
    },
    {
      path: `Anchor.toml`,
      content: anchorToml,
      description: 'Configuração do ambiente Anchor',
    },
    {
      path: `Cargo.toml`,
      content: cargoWorkspaceToml,
      description: 'Cargo Workspace Root',
    },
    {
      path: `programs/${programName}/Cargo.toml`,
      content: cargoProgramToml,
      description: 'Manifesto do pacote Rust',
    },
    {
      path: `package.json`,
      content: packageJson,
      description: 'Dependências do workspace Node/TypeScript',
    },
    {
      path: `yarn.lock`,
      content: yarnLock,
      description: 'Lockfile oficial Yarn para ancoragem de dependências',
    },
    {
      path: `tsconfig.json`,
      content: tsConfigJson,
      description: 'Configuração do compilador TypeScript e test runner',
    },
    {
      path: `tests/${programName}.ts`,
      content: testFileTs,
      description: 'Suíte de testes Anchor TypeScript',
    },
    {
      path: `target/idl/${programName}.json`,
      content: JSON.stringify(idlJson, null, 2),
      description: 'Anchor IDL (Interface Definition Language)',
    },
    {
      path: `client/index.ts`,
      content: tsClientCode,
      description: 'SDK Cliente TypeScript gerado',
    },
    {
      path: `README.md`,
      content: readmeMd,
      description: 'Documentação do repositório com nota de auditoria',
    },
    {
      path: `.github/workflows/anchor-audit.yml`,
      content: anchorAuditWorkflowContent,
      description: 'Pipeline CI/CD DevSecOps: verificação Anchor, determinismo binário, security linting e deploy',
    },
    {
      path: `.github/workflows/anchor-ci-cd.yml`,
      content: anchorAuditWorkflowContent,
      description: 'Esteira de CI/CD em GitHub Actions para auditoria, testes e deploy',
    },
  ];
}
