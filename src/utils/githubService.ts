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

[dependencies]
anchor-lang = "0.30.0"
`;

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
├── README.md
├── client/
│   └── index.ts                 # SDK Cliente TypeScript para Interação
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
2. Instale as dependências TypeScript:
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
  ];
}
