export type ReleaseOptions = {
  firstRelease?: boolean;
  prerelease?: string; // Ex: 'alpha', 'beta', etc.
  noVerify?: boolean;
  skipChangelog?: boolean;
  // Adicione mais opções conforme necessário
};

export type RunReleaseScriptParams = {
  newVersionType: 'major' | 'minor' | 'path' | string; // Ex: 'major', 'minor', 'patch', ou uma versão específica '1.2.3'
  workingDirectory: string; // Caminho para o diretório de trabalho
  options?: ReleaseOptions; // Opções adicionais
  shouldBuild?: boolean;
  buildCommand?: string;
  uploadDirectory?: string;
};
