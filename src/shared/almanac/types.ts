export interface AlmanacRecord {
  date: string
  lunarMonthLabel: string
  lunarDayLabel: string
  ganzhiYear: string
  zodiac: string
  festival: string
  good: string
  bad: string
  updatedAt: number
}

export interface AlmanacResult {
  record: AlmanacRecord | null
  source: 'cache' | 'network' | 'none'
}
