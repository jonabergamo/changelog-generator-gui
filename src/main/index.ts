import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import path, { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { exec } from 'child_process'
import sqlite3 from 'sqlite3'

interface UserPreferences {
  theme: string
}

interface UserProject {
  name: string
  localPath: string
  changelogName: string
}

// Criação do banco de dados
const db = new sqlite3.Database('./database.db')

db.serialize(() => {
  // Criação das tabelas com id auto-incremental
  db.run(
    'CREATE TABLE IF NOT EXISTS user_preferences (id INTEGER PRIMARY KEY AUTOINCREMENT, theme TEXT)'
  )
  db.run(
    'CREATE TABLE IF NOT EXISTS user_projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, localPath TEXT, changelogName TEXT)'
  )
})

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
      contextIsolation: false
    }
  })

  mainWindow.maximize()

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  ipcMain.on('app:minimize', () => {
    mainWindow.minimize()
  })

  ipcMain.on('app:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.on('app:close', () => {
    app.quit()
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('generate-changelog', (_, args) => {
  const projectPath = args.path

  // Comando para gerar o changelog
  const command = 'conventional-changelog -p conventionalcommits -i CHANGELOG.md -s -r 1'

  // Navegar até o diretório do projeto e executar o comando
  exec(command, { cwd: projectPath }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao executar o comando: ${error.message}`)
      return
    }
    if (stderr) {
      console.error(`Erro no comando: ${stderr}`)
      return
    }
    console.log(`Saída do comando:\n${stdout}`)
  })
})

ipcMain.handle('select-folder', async () => {
  // Abre o seletor de pastas
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })

  // Verifica se a seleção foi cancelada ou se não há pastas selecionadas
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  const selectedPath = result.filePaths[0]
  const folderName = path.basename(selectedPath)

  return { success: true, folderName, selectedPath }
})

ipcMain.handle('generate-changelog', async (_, selectedPath) => {
  const command = 'conventional-changelog -p angular -i CHANGELOG.md -s -r 0'

  try {
    const output = await new Promise((resolve, reject) => {
      exec(command, { cwd: selectedPath }, (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else if (stderr) {
          reject(new Error(stderr))
        } else {
          resolve(stdout)
        }
      })
    })

    return { success: true, output }
  } catch (error) {
    // Verifica se o erro é uma instância de Error
    if (error instanceof Error) {
      return { success: false, error: error.message }
    } else {
      // Caso contrário, retorna uma mensagem de erro genérica
      return { success: false, error: 'An unknown error occurred' }
    }
  }
})
// Manipulação de preferências do usuário
ipcMain.handle('get-preferences', async () => {
  return new Promise<UserPreferences | null>((resolve, reject) => {
    db.all('SELECT theme FROM user_preferences LIMIT 1', [], (err, rows: UserPreferences[]) => {
      if (err) {
        reject(err)
      }

      if (rows) {
        // Se não houver dados, retornar null
        const theme = rows.length > 0 ? rows[0]?.theme : 'system'
        resolve({ theme })
      }
    })
  })
})

ipcMain.handle('set-preferences', (_, theme: string) => {
  const stmt = db.prepare('REPLACE INTO user_preferences (id, theme) VALUES (1, ?)')
  stmt.run(theme)
  stmt.finalize()
})

// Manipulação de projetos do usuário
ipcMain.handle('get-projects', async () => {
  return new Promise<UserProject[]>((resolve, reject) => {
    db.all('SELECT * FROM user_projects', [], (err, rows) => {
      if (err) {
        reject(err)
      }
      // Mapeia as linhas para UserProject
      const projects: UserProject[] = rows.map((row: any) => ({
        name: row.name,
        localPath: row.localPath,
        changelogName: row.changelogName
      }))
      resolve(projects)
    })
  })
})

ipcMain.handle('set-projects', (_, project: UserProject) => {
  const stmt = db.prepare(
    'INSERT INTO user_projects (name, localPath, changelogName) VALUES (?, ?, ?)'
  )
  stmt.run(project.name, project.localPath, project.changelogName)
  stmt.finalize()
})

ipcMain.handle('add-new-version', async (_, selectedPath) => {
  const command = 'standard-version'

  try {
    const output = await new Promise((resolve, reject) => {
      exec(command, { cwd: selectedPath }, (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else if (stderr) {
          reject(new Error(stderr))
        } else {
          console.log(stdout)
          resolve(stdout)
        }
      })
    })

    return { success: true, output }
  } catch (error) {
    // Verifica se o erro é uma instância de Error
    if (error instanceof Error) {
      return { success: false, error: error.message }
    } else {
      // Caso contrário, retorna uma mensagem de erro genérica
      return { success: false, error: 'An unknown error occurred' }
    }
  }
})

ipcMain.handle(
  'run-release-script',
  async (_, { newVersionType, developBranch, mainBranch, prefix, workingDirectory }) => {
    const scriptPath = path.join(__dirname, './release.ps1') // Caminho para o script

    const command = `
      param (
        [string]$NewVersionType = "${newVersionType}",
        [string]$DevelopBranch = "${developBranch}",
        [string]$MainBranch = "${mainBranch}",
        [string]$Prefix = "${prefix}",
        [string]$WorkingDirectory = "${workingDirectory}"
      )

      # 1. Verificar se existem mudanças não comitadas
      $status = git status --porcelain
      if ($status) {
        Write-Host "Erro: Existem mudanças não comitadas. Commite ou stashe suas mudanças antes de continuar." -ForegroundColor Red
        exit 1
      }

      # 2. Instalar 'standard-version' globalmente se não estiver instalado
      Write-Host "Verificando se 'standard-version' está instalado globalmente..." -ForegroundColor Green
      if (-not (Get-Command standard-version -ErrorAction SilentlyContinue)) {
        Write-Host "'standard-version' não encontrado, instalando globalmente..." -ForegroundColor Yellow
        npm install -g standard-version
      }

      # 3. Mudança para o diretório de trabalho
      Write-Host "Mudando para o diretório de trabalho '$WorkingDirectory'..."
      Set-Location '$WorkingDirectory'

      # 4. Checkout na branch de desenvolvimento e atualizá-la
      Write-Host "Fazendo checkout na branch '$DevelopBranch' e atualizando-a..." -ForegroundColor Green
      git checkout '$DevelopBranch'
      git pull origin '$DevelopBranch'

      # 5. Criar uma nova versão
      Write-Host "Criando nova versão usando 'standard-version'..." -ForegroundColor Green
      npx standard-version --release-as '$NewVersionType'

      # 6. Capturar a nova versão gerada
      $NewVersion = git describe --tags --abbrev=0
      $ReleaseBranch = "$Prefix$NewVersion"

      # 7. Criar a nova branch de release
      Write-Host "Criando a branch de release '$ReleaseBranch'..." -ForegroundColor Green
      git checkout -b '$ReleaseBranch'

      # 8. Commit e Push da nova branch de release
      Write-Host "Fazendo commit e push da nova branch de release..." -ForegroundColor Green
      git add .
      git commit -m "chore(release): $NewVersion"
      git push origin '$ReleaseBranch'

      # 9. Merge da branch de release de volta para '$DevelopBranch'
      Write-Host "Merge da branch de release '$ReleaseBranch' para '$DevelopBranch'..." -ForegroundColor Green
      git checkout '$DevelopBranch'
      git merge --no-ff '$ReleaseBranch'

      # 10. Push das mudanças na '$DevelopBranch'
      Write-Host "Fazendo push das mudanças na branch '$DevelopBranch'..." -ForegroundColor Green
      git push origin '$DevelopBranch'

      # 11. Limpeza da branch de release (opcional)
      Write-Host "Deletando a branch de release '$ReleaseBranch'..." -ForegroundColor Green
      git branch -d '$ReleaseBranch'
      git push origin --delete '$ReleaseBranch'

      Write-Host "Fluxo de release completo com sucesso!" -ForegroundColor Green
    `

    try {
      const output = await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else if (stderr) {
            reject(new Error(stderr))
          } else {
            resolve(stdout)
          }
        })
      })

      return { success: true, output }
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message }
      } else {
        return { success: false, error: 'An unknown error occurred' }
      }
    }
  }
)
