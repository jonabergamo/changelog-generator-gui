import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { exec } from 'child_process'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
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

ipcMain.handle('select-folder-and-generate-changelog', async () => {
  // Abre o seletor de pastas
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  const selectedPath = result.filePaths[0]
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
