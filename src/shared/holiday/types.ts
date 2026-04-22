export type HolidayKind = 'holiday' | 'workday' | 'festival'

export type HolidaySource = 'manual' | 'gov' | 'api' | 'seed'

export interface HolidayDay {
  date: string
  year: number
  month: number
  day: number
  name: string
  kind: HolidayKind
  source: HolidaySource
  sourceUrl?: string
  isManualOverride?: boolean
}

export interface HolidayGroup {
  year: number
  name: string
  startDate: string
  endDate: string
  duration: number
  source: HolidaySource
  sourceUrl?: string
  memo?: string
  days: HolidayDay[]
}

export interface HolidayProviderResult {
  provider: string
  year: number
  groups: HolidayGroup[]
  days: HolidayDay[]
}

export interface HolidayProvider {
  name: string
  fetchYear(year: number): Promise<HolidayProviderResult>
}
