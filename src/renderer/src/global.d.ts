import type { AlmanacRecord, AlmanacResult } from '../../shared/almanac/types'

declare global {
  interface Window {
    calendarApi: {
      getAlmanac(date: string): Promise<AlmanacResult>
      reportCalendarSize(size: { width: number; height: number }): void
      onAlmanacUpdated(listener: (record: AlmanacRecord | null) => void): () => void
    }
  }
}

export {}
