import { app, BrowserWindow, Menu, ipcMain, screen } from 'electron'
import path from 'node:path'

Menu.setApplicationMenu(null)

let mainWindow: BrowserWindow | null = null
let launcherWindow: BrowserWindow | null = null
let isQuitting = false

const CALENDAR_WIDTH = 790
const CALENDAR_HEIGHT = 690
const LAUNCHER_SIZE = 62
const WINDOW_MARGIN = 12

function getWorkArea(): Electron.Rectangle {
  const point = launcherWindow?.getBounds() ?? screen.getCursorScreenPoint()

  return screen.getDisplayNearestPoint({ x: point.x, y: point.y }).workArea
}

function positionLauncherWindow(): void {
  if (!launcherWindow) {
    return
  }

  const { x, y, width, height } = screen.getPrimaryDisplay().workArea

  launcherWindow.setBounds({
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE,
    x: Math.round(x + width - LAUNCHER_SIZE - WINDOW_MARGIN),
    y: Math.round(y + height - LAUNCHER_SIZE - WINDOW_MARGIN),
  })
}

function positionCalendarWindow(): void {
  if (!mainWindow) {
    return
  }

  const { x, y, width, height } = getWorkArea()
  const bottomSpace = LAUNCHER_SIZE + WINDOW_MARGIN * 2
  const availableTop = y + WINDOW_MARGIN
  const preferredY = y + height - CALENDAR_HEIGHT - bottomSpace

  mainWindow.setBounds({
    width: CALENDAR_WIDTH,
    height: CALENDAR_HEIGHT,
    x: Math.round(x + width - CALENDAR_WIDTH - WINDOW_MARGIN),
    y: Math.round(Math.max(availableTop, preferredY)),
  })
}

function showCalendarWindow(): void {
  if (!mainWindow) {
    createCalendarWindow()
  }

  if (!mainWindow) {
    return
  }

  positionCalendarWindow()
  mainWindow.show()
  mainWindow.focus()
}

function hideCalendarWindow(): void {
  mainWindow?.hide()
}

function showLauncherMenu(): void {
  if (!launcherWindow) {
    return
  }

  Menu.buildFromTemplate([
    {
      label: '显示日历',
      click: showCalendarWindow,
    },
    {
      label: '隐藏日历',
      click: hideCalendarWindow,
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ]).popup({ window: launcherWindow })
}

function createLauncherHtml(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1)
  const day = String(now.getDate())

  return `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <style>
          html,
          body {
            width: 100%;
            height: 100%;
            margin: 0;
            overflow: hidden;
            background: transparent;
            font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
            user-select: none;
          }

          button {
            width: 58px;
            height: 58px;
            margin: 2px;
            display: grid;
            grid-template-rows: 20px 1fr;
            overflow: hidden;
            border: 1px solid #d8dee7;
            border-radius: 14px;
            background: #ffffff;
            box-shadow: 0 10px 28px rgba(23, 32, 51, 0.18);
            cursor: pointer;
            padding: 0;
          }

          .month {
            display: grid;
            place-items: center;
            background: #ff3b42;
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            line-height: 1;
          }

          .day {
            display: grid;
            place-items: center;
            color: #172033;
            font-size: 25px;
            font-weight: 800;
            line-height: 1;
          }
        </style>
      </head>
      <body>
        <button id="open-calendar" aria-label="显示日历">
          <span class="month">${month}月</span>
          <span class="day">${day}</span>
        </button>
        <script>
          const { ipcRenderer } = require('electron')
          document.addEventListener('contextmenu', (event) => {
            event.preventDefault()
            ipcRenderer.send('calendar:launcher-menu')
          })
          document.getElementById('open-calendar').addEventListener('click', () => {
            ipcRenderer.send('calendar:show')
          })
        </script>
      </body>
    </html>
  `
}

function createLauncherWindow(): void {
  launcherWindow = new BrowserWindow({
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    title: 'Calendar Launcher',
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  })

  launcherWindow.on('closed', () => {
    launcherWindow = null
  })

  launcherWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createLauncherHtml())}`)
  launcherWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })
  positionLauncherWindow()
  launcherWindow.show()
}

function createCalendarWindow(): void {
  mainWindow = new BrowserWindow({
    width: CALENDAR_WIDTH,
    height: CALENDAR_HEIGHT,
    minWidth: 760,
    minHeight: 640,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#f6f9fc',
    autoHideMenuBar: true,
    show: false,
    title: 'Calendar',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('blur', () => {
    hideCalendarWindow()
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      hideCalendarWindow()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
}

ipcMain.on('calendar:show', () => {
  showCalendarWindow()
})

ipcMain.on('calendar:launcher-menu', () => {
  showLauncherMenu()
})

app.whenReady().then(() => {
  createCalendarWindow()
  createLauncherWindow()

  screen.on('display-metrics-changed', () => {
    positionLauncherWindow()
    positionCalendarWindow()
  })

  app.on('activate', () => {
    showCalendarWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  if (isQuitting && process.platform !== 'darwin') {
    app.quit()
  }
})
