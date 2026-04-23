import type { AlmanacRecord, AlmanacResult } from '../../shared/almanac/types'
import type { ClockSnapshot } from '../../shared/clock/types'

declare global {
  interface Window {
    calendarApi: {
      getAlmanac(date: string): Promise<AlmanacResult>
      getClockSnapshot(): Promise<ClockSnapshot>
      reportCalendarSize(size: { width: number; height: number }): void
      onClockChanged(listener: (snapshot: ClockSnapshot) => void): () => void
      onAlmanacUpdated(listener: (record: AlmanacRecord | null) => void): () => void
    }
  }
}

export {}
