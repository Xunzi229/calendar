import { contextBridge, ipcRenderer } from 'electron'
import type { AlmanacRecord, AlmanacResult } from '../shared/almanac/types'

contextBridge.exposeInMainWorld('calendarApi', {
  getAlmanac(date: string): Promise<AlmanacResult> {
    return ipcRenderer.invoke('almanac:get', date) as Promise<AlmanacResult>
  },
  reportCalendarSize(size: { width: number; height: number }): void {
    ipcRenderer.send('calendar:resize', size)
  },
  onAlmanacUpdated(listener: (record: AlmanacRecord | null) => void): () => void {
    const wrapped = (_event: unknown, record: AlmanacRecord | null) => listener(record)
    ipcRenderer.on('almanac:updated', wrapped)

    return () => {
      ipcRenderer.removeListener('almanac:updated', wrapped)
    }
  },
})
