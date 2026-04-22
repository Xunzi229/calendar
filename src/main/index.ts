import { app, BrowserWindow, Menu } from 'electron'
import path from 'node:path'

Menu.setApplicationMenu(null)

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 790,
    height: 690,
    minWidth: 760,
    minHeight: 640,
    backgroundColor: '#f6f9fc',
    autoHideMenuBar: true,
    title: 'Calendar',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
