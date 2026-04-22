import type { HolidayDay, HolidayGroup, HolidayProvider, HolidayProviderResult } from '../../shared/holiday/types'

interface AilccDay {
  holiday: boolean
  name: string
  date: string
  extra_info?: string
}

interface AilccResponse {
  code: number
  holiday?: Record<string, AilccDay>
}

interface ChinaHolidayCalendarGroup {
  Name: string
  StartDate: string
  EndDate: string
  Duration: number
  CompDays?: string[]
  URL?: string
  Memo?: string
}

interface ChinaHolidayCalendarResponse {
  Years?: Record<string, ChinaHolidayCalendarGroup[]>
}

const REQUEST_TIMEOUT_MS = 8000

function splitDate(date: string): Pick<HolidayDay, 'year' | 'month' | 'day'> {
  const [year, month, day] = date.split('-').map(Number)

  return { year, month, day }
}

function eachDate(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const start = splitDate(startDate)
  const finish = splitDate(endDate)
  const cursor = new Date(Date.UTC(start.year, start.month - 1, start.day))
  const end = new Date(Date.UTC(finish.year, finish.month - 1, finish.day))

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dates
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

export const ailccHolidayProvider: HolidayProvider = {
  name: 'holiday.ailcc.com',
  async fetchYear(year: number): Promise<HolidayProviderResult> {
    const data = await fetchJson<AilccResponse>(`https://holiday.ailcc.com/api/holiday/year/${year}`)

    if (data.code !== 0 || !data.holiday) {
      throw new Error('Ailcc holiday API returned an invalid response')
    }

    const days = Object.values(data.holiday).map((item) => {
      const parts = splitDate(item.date)
      const cleanName = item.name.replace(/[（(]休[）)]/g, '').replace(/[（(]班[）)]/g, '')

      return {
        date: item.date,
        ...parts,
        name: item.extra_info || cleanName,
        kind: item.holiday ? 'holiday' : 'workday',
        source: 'api',
      } satisfies HolidayDay
    })

    return {
      provider: 'holiday.ailcc.com',
      year,
      groups: [],
      days,
    }
  },
}

export const chinaHolidayCalendarProvider: HolidayProvider = {
  name: 'lanceliao/china-holiday-calender',
  async fetchYear(year: number): Promise<HolidayProviderResult> {
    const data = await fetchJson<ChinaHolidayCalendarResponse>(
      'https://www.shuyz.com/githubfiles/china-holiday-calender/master/holidayAPI.json',
    )
    const rawGroups = data.Years?.[String(year)]

    if (!rawGroups?.length) {
      throw new Error(`No holiday data found for ${year}`)
    }

    const groups: HolidayGroup[] = []
    const days: HolidayDay[] = []

    for (const rawGroup of rawGroups) {
      const groupDays = eachDate(rawGroup.StartDate, rawGroup.EndDate).map((date) => ({
        date,
        ...splitDate(date),
        name: rawGroup.Name,
        kind: 'holiday',
        source: 'api',
        sourceUrl: rawGroup.URL,
      }) satisfies HolidayDay)

      const workdays = (rawGroup.CompDays ?? []).map((date) => ({
        date,
        ...splitDate(date),
        name: `${rawGroup.Name}调休补班`,
        kind: 'workday',
        source: 'api',
        sourceUrl: rawGroup.URL,
      }) satisfies HolidayDay)

      groups.push({
        year,
        name: rawGroup.Name,
        startDate: rawGroup.StartDate,
        endDate: rawGroup.EndDate,
        duration: rawGroup.Duration,
        source: 'api',
        sourceUrl: rawGroup.URL,
        memo: rawGroup.Memo,
        days: [...groupDays, ...workdays],
      })
      days.push(...groupDays, ...workdays)
    }

    return {
      provider: 'lanceliao/china-holiday-calender',
      year,
      groups,
      days,
    }
  },
}

export const holidayProviders: HolidayProvider[] = [chinaHolidayCalendarProvider, ailccHolidayProvider]
