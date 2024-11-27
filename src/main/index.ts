import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  dialog,
  IpcMainInvokeEvent,
} from 'electron'; // Electron modules
import path, { join } from 'path'; // Path utilities
import { promises as fs } from 'fs'; // Promises-based file system operations
import { exec, spawn, ChildProcess } from 'child_process'; // Command execution
import Database from 'better-sqlite3'; // SQLite database
import { electronApp, optimizer, is } from '@electron-toolkit/utils'; // Electron Toolkit utilities
import icon from '../../resources/icon.png?asset'; // Application icon
import { existsSync, readFileSync, writeFileSync } from 'fs'; // Adicionada importação no início do arquivo

interface UserProject {
  id?: number; // Adicionado opcional para operações que não precisam do ID
  name: string;
  localPath: string;
  changelogName: string;
}

export type ReleaseOptions = {
  firstRelease?: boolean;
  prerelease?: 'alpha' | 'beta';
  noVerify?: boolean;
  skipChangelog?: boolean;
  // Adicione mais opções conforme necessário
};

export type RunReleaseScriptParams = {
  newVersionType: 'major' | 'minor' | 'patch' | string; // Ex: 'major', 'minor', 'patch', ou uma versão específica '1.2.3'
  workingDirectory: string; // Caminho para o diretório de trabalho
  options?: ReleaseOptions; // Opções adicionais
  shouldBuild?: boolean;
  buildCommand?: string;
  uploadDirectory?: string;
};

// Criação e configuração do banco de dados com better-sqlite3
const db = new Database(path.join(app.getPath('userData'), 'database.db'));

// Criação das tabelas com id auto-incremental
db.exec(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theme TEXT
  );
  
  CREATE TABLE IF NOT EXISTS user_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    localPath TEXT,
    changelogName TEXT
  );
`);

// Função para criar a janela principal
function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    frame: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    const url = new URL(details.url);

    // Apenas abrir links com protocolo seguro
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      shell.openExternal(details.url);
    }

    return { action: 'deny' }; // Bloquear outros tipos de links
  });

  ipcMain.on('app:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('app:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('app:close', () => {
    app.quit();
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Quando o Electron estiver pronto, cria a janela
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window: BrowserWindow) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Sair quando todas as janelas estiverem fechadas, exceto no macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Manipulação de preferências do usuário
ipcMain.handle(
  'get-preferences',
  async (): Promise<{ theme: string } | null> => {
    try {
      const row = db
        .prepare('SELECT theme FROM user_preferences LIMIT 1')
        .get();
      const theme = row ? row.theme : 'system';
      return { theme };
    } catch (err) {
      console.error(err);
      return null;
    }
  },
);

ipcMain.handle(
  'set-preferences',
  async (
    _: IpcMainInvokeEvent,
    theme: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const stmt = db.prepare(`
      INSERT INTO user_preferences (id, theme)
      VALUES (1, ?)
      ON CONFLICT(id) DO UPDATE SET theme = excluded.theme
    `);
      stmt.run(theme);
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  },
);

// Manipulação de projetos do usuário
ipcMain.handle('get-projects', async (): Promise<UserProject[]> => {
  try {
    const rows = db.prepare('SELECT * FROM user_projects').all();
    const projects: UserProject[] = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      localPath: row.localPath,
      changelogName: row.changelogName,
    }));
    return projects;
  } catch (err) {
    console.error(err);
    return [];
  }
});

ipcMain.handle(
  'set-projects',
  async (
    _: IpcMainInvokeEvent,
    project: UserProject,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const stmt = db.prepare(`
      INSERT INTO user_projects (name, localPath, changelogName)
      VALUES (?, ?, ?)
    `);
      stmt.run(project.name, project.localPath, project.changelogName);
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  },
);

ipcMain.handle(
  'remove-project',
  async (
    _: IpcMainInvokeEvent,
    projectId: number,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const stmt = db.prepare(`
      DELETE FROM user_projects
      WHERE id = ?
    `);
      stmt.run(projectId);

      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  },
);

ipcMain.handle(
  'remove-project-by-path',
  async (
    _: IpcMainInvokeEvent,
    localPath: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const stmt = db.prepare(`
      DELETE FROM user_projects
      WHERE localPath = ?
    `);
      stmt.run(localPath);

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao remover o projeto:', err.message);
      return { success: false, error: err.message };
    }
  },
);

ipcMain.handle(
  'add-new-version',
  async (
    _: IpcMainInvokeEvent,
    selectedPath: string,
  ): Promise<{ success: boolean; output?: string; error?: string }> => {
    const command = 'standard-version';

    try {
      const output = await new Promise<string>((resolve, reject) => {
        exec(command, { cwd: selectedPath }, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else if (stderr) {
            reject(new Error(stderr));
          } else {
            console.log(stdout);
            resolve(stdout);
          }
        });
      });

      return { success: true, output };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      } else {
        return { success: false, error: 'An unknown error occurred' };
      }
    }
  },
);

ipcMain.handle(
  'select-folder',
  async (): Promise<{
    success?: boolean;
    canceled?: boolean;
    folderName?: string;
    selectedPath?: string;
  }> => {
    // Abre o seletor de pastas
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    // Verifica se a seleção foi cancelada ou se não há pastas selecionadas
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const selectedPath = result.filePaths[0];
    const folderName = path.basename(selectedPath);

    return { success: true, folderName, selectedPath };
  },
);

ipcMain.handle(
  'generate-changelog',
  async (
    _: IpcMainInvokeEvent,
    selectedPath: string,
  ): Promise<{ success: boolean; output?: string; error?: string }> => {
    const command = 'conventional-changelog -p angular -i CHANGELOG.md -s -r 0';

    try {
      const output = await new Promise<string>((resolve, reject) => {
        exec(command, { cwd: selectedPath }, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else if (stderr) {
            reject(new Error(stderr));
          } else {
            resolve(stdout);
          }
        });
      });

      return { success: true, output };
    } catch (error) {
      // Verifica se o erro é uma instância de Error
      if (error instanceof Error) {
        return { success: false, error: error.message };
      } else {
        // Caso contrário, retorna uma mensagem de erro genérica
        return { success: false, error: 'An unknown error occurred' };
      }
    }
  },
);

// Função auxiliar para executar comandos de forma síncrona com Promises
function runCommand(
  command: string,
  cwd: string,
  errorMessage: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(command, {
      shell: true,
      cwd,
      stdio: 'inherit',
    });

    child.on('error', (error: Error) => {
      console.error(`${errorMessage}: ${error.message}`);
      reject(error);
    });

    child.on('exit', (code: number | null) => {
      if (code !== 0) {
        const error = new Error(`${errorMessage} Código de saída: ${code}`);
        reject(error);
      } else {
        resolve('');
      }
    });
  });
}

ipcMain.handle(
  'run-release-script',
  async (
    _: IpcMainInvokeEvent,
    params: RunReleaseScriptParams & {
      shouldBuild?: boolean;
      buildCommand?: string;
      uploadDirectory?: string;
    },
  ): Promise<{ success: boolean; error?: string }> => {
    const {
      newVersionType,
      workingDirectory,
      options,
      shouldBuild = false,
      buildCommand = 'npm run build',
      uploadDirectory = 'dist',
    } = params;

    try {
      // Montar o comando dinamicamente com base nas opções fornecidas
      let command = `npx standard-version --release-as ${newVersionType}`;

      // Adicionar opções extras ao comando se existirem
      if (options) {
        if (options.firstRelease) {
          command += ' --first-release';
        }
        if (options.prerelease) {
          command += ` --prerelease ${options.prerelease}`;
        }
        if (options.noVerify) {
          command += ' --no-verify';
        }
        if (options.skipChangelog) {
          command += ' --skip.changelog';
        }
      }

      // Executar o comando: `npx standard-version`
      await runCommand(
        command,
        workingDirectory,
        'Erro ao executar o standard-version.',
      );

      console.log('Versão criada com sucesso!');

      // Ler a nova versão do package.json
      const packageJsonPath = path.join(workingDirectory, 'package.json');
      const packageJsonContent: string = await fs.readFile(
        packageJsonPath,
        'utf8',
      );
      const packageJson: { version: string } = JSON.parse(packageJsonContent);
      const { version } = packageJson;

      console.log(`Nova versão detectada: ${version}`);

      // Verificar se deve executar o build
      if (shouldBuild) {
        console.log(`Executando comando de build: ${buildCommand}`);

        await runCommand(
          buildCommand,
          workingDirectory,
          'Erro ao executar o build.',
        );

        console.log('Build gerado com sucesso!');
      } else {
        console.log('Build ignorado conforme configuração.');
      }

      // Fazer push das mudanças e tags
      const pushCommand = `git push origin --follow-tags --no-verify`;
      await runCommand(
        pushCommand,
        workingDirectory,
        'Erro ao fazer push dos commits e tags.',
      );

      console.log('Commits e tags enviados com sucesso!');

      if (!shouldBuild) return { success: true };

      // Caminho do diretório de upload
      const uploadPath = path.join(workingDirectory, uploadDirectory);

      // Caminho do executável gerado
      const executablePath = path.join(
        uploadPath,
        `changelog-gen-${version}.AppImage`,
      );

      console.log(`Arquivo para upload localizado em: ${executablePath}`);

      // Criar a release no GitHub e fazer upload do executável
      const releaseCommand = `gh release create v${version} ${executablePath} -t "v${version}" -n "Release v${version}"`;
      await runCommand(
        releaseCommand,
        workingDirectory,
        'Erro ao criar a release ou fazer upload do executável.',
      );

      console.log('Release criada e executável adicionado com sucesso!');

      return { success: true };
    } catch (error: any) {
      console.error(`Erro no processo de release: ${error.message}`);
      return { success: false, error: error.message };
    }
  },
);

ipcMain.handle(
  'get-project-version',
  async (
    _: IpcMainInvokeEvent,
    selectedPath: string,
  ): Promise<{ success: boolean; version?: string; error?: string }> => {
    const command = 'git describe --tags --abbrev=0';

    try {
      const version = await new Promise<string>((resolve, reject) => {
        exec(command, { cwd: selectedPath }, (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else if (stderr) {
            reject(new Error(stderr));
          } else {
            resolve(stdout.trim());
          }
        });
      });

      return { success: true, version };
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      } else {
        return { success: false, error: 'An unknown error occurred' };
      }
    }
  },
);

ipcMain.handle(
  'read-changelog',
  async (_: IpcMainInvokeEvent, projectPath: string): Promise<string> => {
    try {
      const changelogPath = path.join(projectPath, 'CHANGELOG.md');

      // Verifica se o arquivo existe
      if (!existsSync(changelogPath)) {
        console.log('CHANGELOG.md não encontrado. Criando o arquivo...');

        // Cria o arquivo com um conteúdo inicial (ou vazio)
        writeFileSync(changelogPath, '', 'utf-8');
      }

      // Lê o conteúdo do arquivo
      const content: string = readFileSync(changelogPath, 'utf-8');
      return content;
    } catch (error: any) {
      console.error('Erro ao manipular CHANGELOG.md:', error);
      throw new Error(
        error.message || 'Erro desconhecido ao ler o CHANGELOG.md',
      );
    }
  },
);

ipcMain.handle(
  'open-changelog-in-explorer',
  async (
    _: IpcMainInvokeEvent,
    projectPath: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const changelogPath = path.join(projectPath, 'CHANGELOG.md');

      // Verifica se o arquivo existe
      if (!existsSync(changelogPath)) {
        console.log('CHANGELOG.md não encontrado. Criando o arquivo...');

        // Cria o arquivo vazio
        writeFileSync(changelogPath, '', 'utf-8');
      }

      // Abre o arquivo no explorador
      shell.showItemInFolder(changelogPath);

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao abrir o arquivo no explorador:', error);
      return { success: false, error: error.message };
    }
  },
);

ipcMain.handle(
  'open-project-in-vscode',
  async (
    _: IpcMainInvokeEvent,
    projectPath: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Verifica se o diretório existe
      if (!existsSync(projectPath)) {
        throw new Error('Diretório do projeto não encontrado.');
      }

      // Abre o projeto no VSCode
      spawn('code', [projectPath], { shell: true });

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao abrir o projeto no VSCode:', error);
      return { success: false, error: error.message };
    }
  },
);

ipcMain.handle(
  'open-link',
  async (
    _: IpcMainInvokeEvent,
    url: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      shell.openExternal(url);
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao abrir o link:', error);
      return { success: false, error: error.message };
    }
  },
);
