import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import path, { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { exec, spawn } from 'child_process';
import Database from 'better-sqlite3';

interface UserProject {
  name: string;
  localPath: string;
  changelogName: string;
}

export type ReleaseOptions = {
  firstRelease?: boolean;
  prerelease?: 'alpha' | 'beta'; // Ex: 'alpha', 'beta', etc.
  noVerify?: boolean;
  skipChangelog?: boolean;
  // Adicione mais opções conforme necessário
};

export type RunReleaseScriptParams = {
  newVersionType: 'major' | 'minor' | 'path' | string; // Ex: 'major', 'minor', 'patch', ou uma versão específica '1.2.3'
  workingDirectory: string; // Caminho para o diretório de trabalho
  options?: ReleaseOptions; // Opções adicionais
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
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.maximize();

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
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
  app.on('browser-window-created', (_, window) => {
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
ipcMain.handle('get-preferences', async () => {
  try {
    const row = db.prepare('SELECT theme FROM user_preferences LIMIT 1').get();
    const theme = row ? row.theme : 'system';
    return { theme };
  } catch (err) {
    console.error(err);
    return null;
  }
});

ipcMain.handle('set-preferences', (_, theme: string) => {
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
});

// Manipulação de projetos do usuário
ipcMain.handle('get-projects', async () => {
  try {
    const rows = db.prepare('SELECT * FROM user_projects').all();
    const projects: UserProject[] = rows.map((row: any) => ({
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

ipcMain.handle('set-projects', (_, project: UserProject) => {
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
});

ipcMain.handle('add-new-version', async (_, selectedPath) => {
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
});

ipcMain.handle('select-folder', async () => {
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
});

ipcMain.handle('generate-changelog', async (_, selectedPath) => {
  const command = 'conventional-changelog -p angular -i CHANGELOG.md -s -r 0';

  try {
    const output = await new Promise((resolve, reject) => {
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
});

ipcMain.handle(
  'run-release-script',
  async (_, { newVersionType, workingDirectory, options }) => {
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

    // Executar o primeiro comando: `npx standard-version`
    const child = spawn(command, {
      shell: true,
      cwd: workingDirectory,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      console.error(`Erro ao executar o comando: ${error.message}`);
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        console.error('Erro ao executar o standard-version.');
      } else {
        console.log('Versão criada com sucesso!');

        // Criar o executável com o comando de build
        const buildCommand = 'npm run build:win'; // ou o comando específico para criar o executável
        const buildChild = spawn(buildCommand, {
          shell: true,
          cwd: workingDirectory,
          stdio: 'inherit',
        });

        buildChild.on('error', (error) => {
          console.error(`Erro ao executar o build: ${error.message}`);
        });

        buildChild.on('exit', (buildCode) => {
          if (buildCode !== 0) {
            console.error('Erro ao gerar o build.');
          } else {
            console.log('Build gerado com sucesso!');

            // Caminho do executável gerado
            const executablePath = path.join(
              workingDirectory,
              'dist',
              'my-executable.exe',
            ); // ajuste conforme necessário

            // Adicionar o executável à tag no Git
            const tagCommand = `git push --follow-tags origin feature/ui-improvements && git tag -a v${newVersionType} -m "Versão ${newVersionType}" && git push origin v${newVersionType}`;
            const tagChild = spawn(tagCommand, {
              shell: true,
              cwd: workingDirectory,
              stdio: 'inherit',
            });

            tagChild.on('error', (error) => {
              console.error(`Erro ao criar a tag: ${error.message}`);
            });

            tagChild.on('exit', (tagCode) => {
              if (tagCode !== 0) {
                console.error('Erro ao criar ou fazer push da tag.');
              } else {
                console.log('Tag criada e enviada com sucesso!');

                // Adicionar o executável à tag usando `git`
                const releaseAssetCommand = `gh release upload v${newVersionType} ${executablePath}`;
                const releaseAssetChild = spawn(releaseAssetCommand, {
                  shell: true,
                  cwd: workingDirectory,
                  stdio: 'inherit',
                });

                releaseAssetChild.on('error', (error) => {
                  console.error(
                    `Erro ao adicionar o executável à tag: ${error.message}`,
                  );
                });

                releaseAssetChild.on('exit', (releaseAssetCode) => {
                  if (releaseAssetCode !== 0) {
                    console.error('Erro ao adicionar o executável à tag.');
                  } else {
                    console.log('Executável adicionado com sucesso à tag!');
                  }
                });
              }
            });
          }
        });
      }
    });
  },
);

ipcMain.handle('get-project-version', async (_, selectedPath) => {
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
});
