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
