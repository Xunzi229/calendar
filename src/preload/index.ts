import { contextBridge, ipcRenderer } from 'electron'
import type { AlmanacRecord, AlmanacResult } from '../shared/almanac/types'
import type { ClockSnapshot } from '../shared/clock/types'

contextBridge.exposeInMainWorld('calendarApi', {
  getAlmanac(date: string): Promise<AlmanacResult> {
    return ipcRenderer.invoke('almanac:get', date) as Promise<AlmanacResult>
  },
  getClockSnapshot(): Promise<ClockSnapshot> {
    return ipcRenderer.invoke('clock:get') as Promise<ClockSnapshot>
  },
  reportCalendarSize(size: { width: number; height: number }): void {
    ipcRenderer.send('calendar:resize', size)
  },
  onClockChanged(listener: (snapshot: ClockSnapshot) => void): () => void {
    const wrapped = (_event: unknown, snapshot: ClockSnapshot) => listener(snapshot)
    ipcRenderer.on('clock:changed', wrapped)

    return () => {
      ipcRenderer.removeListener('clock:changed', wrapped)
    }
  },
  onAlmanacUpdated(listener: (record: AlmanacRecord | null) => void): () => void {
    const wrapped = (_event: unknown, record: AlmanacRecord | null) => listener(record)
    ipcRenderer.on('almanac:updated', wrapped)

    return () => {
      ipcRenderer.removeListener('almanac:updated', wrapped)
    }
  },
})
