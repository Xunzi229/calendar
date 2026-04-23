import { app, BrowserWindow, Menu, ipcMain, screen } from 'electron'
import path from 'node:path'
import { AlmanacService } from './almanac/almanacService'

Menu.setApplicationMenu(null)

let mainWindow: BrowserWindow | null = null
let launcherWindow: BrowserWindow | null = null
let configWindow: BrowserWindow | null = null
let isQuitting = false
let calendarWindowSize = {
  width: 760,
  height: 552,
}

const almanacService = new AlmanacService()
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
  const maxWidth = Math.max(360, width - WINDOW_MARGIN * 2)
  const maxHeight = Math.max(240, height - bottomSpace - WINDOW_MARGIN)
  const nextWidth = Math.min(calendarWindowSize.width, maxWidth)
  const nextHeight = Math.min(calendarWindowSize.height, maxHeight)
  const preferredY = y + height - nextHeight - bottomSpace

  mainWindow.setBounds({
    width: nextWidth,
    height: nextHeight,
    x: Math.round(x + width - nextWidth - WINDOW_MARGIN),
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

function showConfigWindow(): void {
  if (configWindow) {
    configWindow.show()
    configWindow.focus()
    return
  }

  const currentKey = almanacService.getApiKey()

  configWindow = new BrowserWindow({
    width: 360,
    height: 214,
    resizable: false,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    title: '配置 TianAPI Key',
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  })

  configWindow.on('closed', () => {
    configWindow = null
  })

  const html = `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            margin: 0;
            padding: 18px;
            font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
            color: #172033;
            background: #f6f9fc;
          }
          h1 {
            margin: 0 0 10px;
            font-size: 16px;
          }
          p {
            margin: 0 0 12px;
            color: #667085;
            font-size: 13px;
            line-height: 1.5;
          }
          input {
            width: 100%;
            height: 36px;
            padding: 0 12px;
            border: 1px solid #d8dee7;
            border-radius: 8px;
            box-sizing: border-box;
          }
          .actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 14px;
          }
          button {
            min-width: 84px;
            height: 34px;
            border: 1px solid #d8dee7;
            border-radius: 8px;
            background: #ffffff;
            cursor: pointer;
          }
          .primary {
            background: #5b6cff;
            border-color: #5b6cff;
            color: #ffffff;
          }
        </style>
      </head>
      <body>
        <h1>配置 TianAPI Key</h1>
        <p>未配置或 Key 异常时，底部黄历区域将自动隐藏，不显示空白占位。</p>
        <input id="api-key" value="${currentKey}" placeholder="请输入 TianAPI Key" />
        <div class="actions">
          <button id="clear-key">清除</button>
          <button id="save-key" class="primary">保存</button>
        </div>
        <script>
          const { ipcRenderer } = require('electron')
          const input = document.getElementById('api-key')
          document.getElementById('save-key').addEventListener('click', async () => {
            await ipcRenderer.invoke('settings:set-api-key', input.value || '')
            window.close()
          })
          document.getElementById('clear-key').addEventListener('click', async () => {
            await ipcRenderer.invoke('settings:set-api-key', '')
            window.close()
          })
        </script>
      </body>
    </html>
  `

  configWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
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
    {
      label: '配置 TianAPI Key',
      click: showConfigWindow,
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
  return `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <style>
          html, body {
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
          <span id="launcher-month" class="month"></span>
          <span id="launcher-day" class="day"></span>
        </button>
        <script>
          const { ipcRenderer } = require('electron')
          const monthElement = document.getElementById('launcher-month')
          const dayElement = document.getElementById('launcher-day')
          const openButton = document.getElementById('open-calendar')
          let midnightTimer = null
          let watchdogTimer = null
          let lastTimezoneOffset = new Date().getTimezoneOffset()
          let lastTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
          let lastNow = Date.now()

          function refreshLauncherDate() {
            const now = new Date()
            monthElement.textContent = String(now.getMonth() + 1) + '月'
            dayElement.textContent = String(now.getDate())
            openButton.setAttribute('aria-label', '显示日历 ' + monthElement.textContent + dayElement.textContent)
            lastTimezoneOffset = now.getTimezoneOffset()
            lastTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
            lastNow = Date.now()
          }

          function scheduleMidnightRefresh() {
            if (midnightTimer) {
              clearTimeout(midnightTimer)
            }

            const now = new Date()
            const nextMidnight = new Date(now)
            nextMidnight.setHours(24, 0, 0, 50)
            midnightTimer = setTimeout(() => {
              refreshLauncherDate()
              scheduleMidnightRefresh()
            }, Math.max(100, nextMidnight.getTime() - now.getTime()))
          }

          function startClockWatchdog() {
            if (watchdogTimer) {
              clearInterval(watchdogTimer)
            }

            watchdogTimer = setInterval(() => {
              const now = new Date()
              const currentTimestamp = Date.now()
              const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
              const clockJumped = Math.abs(currentTimestamp - lastNow - 15000) > 4000
              const dayChanged = monthElement.textContent !== String(now.getMonth() + 1) + '月' || dayElement.textContent !== String(now.getDate())
              const timezoneChanged = now.getTimezoneOffset() !== lastTimezoneOffset || currentTimeZone !== lastTimeZone

              if (clockJumped || dayChanged || timezoneChanged) {
                refreshLauncherDate()
                scheduleMidnightRefresh()
              } else {
                lastNow = currentTimestamp
              }
            }, 15000)
          }

          document.addEventListener('contextmenu', (event) => {
            event.preventDefault()
            ipcRenderer.send('calendar:launcher-menu')
          })
          openButton.addEventListener('click', () => {
            ipcRenderer.send('calendar:show')
          })
          refreshLauncherDate()
          scheduleMidnightRefresh()
          startClockWatchdog()
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
    width: calendarWindowSize.width,
    height: calendarWindowSize.height,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#f6f9fc',
    autoHideMenuBar: true,
    show: false,
    title: 'Calendar',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
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

ipcMain.on('calendar:resize', (_event, size: { width?: number; height?: number }) => {
  const nextWidth = Math.max(720, Math.ceil(size.width ?? calendarWindowSize.width))
  const nextHeight = Math.max(360, Math.ceil(size.height ?? calendarWindowSize.height))

  if (nextWidth === calendarWindowSize.width && nextHeight === calendarWindowSize.height) {
    return
  }

  calendarWindowSize = {
    width: nextWidth,
    height: nextHeight,
  }

  positionCalendarWindow()
})

ipcMain.handle('settings:set-api-key', async (_event, value: string) => {
  almanacService.setApiKey(value)

  if (mainWindow) {
    mainWindow.webContents.send('almanac:updated', null)
  }
})

ipcMain.handle('almanac:get', async (_event, date: string) => {
  return almanacService.getAlmanac(date)
})

almanacService.on('updated', (record) => {
  if (mainWindow) {
    mainWindow.webContents.send('almanac:updated', record)
  }
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
