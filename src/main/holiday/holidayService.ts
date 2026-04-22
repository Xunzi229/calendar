import type { HolidayDay } from '../../shared/holiday/types'
import { HolidayRepository } from './holidayRepository'
import { holidayProviders } from './providers'

export class HolidayService {
  constructor(private readonly repository: HolidayRepository) {}

  getMonth(year: number, month: number): HolidayDay[] {
    return this.repository.getMonth(year, month)
  }

  async ensureYear(year: number): Promise<void> {
    if (this.repository.hasYearData(year)) {
      return
    }

    for (const provider of holidayProviders) {
      try {
        const result = await provider.fetchYear(year)
        this.repository.importYear(result.groups, result.days, result.provider, year)
        return
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.repository.logSyncFailure(year, provider.name, message)
      }
    }
  }

  setManualDay(input: Parameters<HolidayRepository['upsertManualDay']>[0]): void {
    this.repository.upsertManualDay(input)
  }
}
