import { app } from 'electron'
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import type { AlmanacRecord, AlmanacResult } from '../../shared/almanac/types'

interface TianApiResponse {
  code: number
  msg: string
  result?: {
    gregoriandate: string
    festival?: string
    tiangandizhiyear?: string
    shengxiao?: string
    lubarmonth?: string
    lunarday?: string
    fitness?: string
    taboo?: string
  }
}

interface AppConfig {
  tianApiKey?: string
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeList(value: string | undefined): string {
  return (value ?? '')
    .replace(/[.。]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export class AlmanacService extends EventEmitter {
  private readonly configPath = path.join(app.getPath('userData'), 'calendar.config.json')
  private readonly databasePath = path.join(app.getPath('userData'), 'calendar-cache.sqlite')
  private readonly database: DatabaseSync

  constructor() {
    super()
    this.database = new DatabaseSync(this.databasePath)
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS almanac_cache (
        date TEXT PRIMARY KEY,
        lunar_month_label TEXT NOT NULL,
        lunar_day_label TEXT NOT NULL,
        ganzhi_year TEXT NOT NULL,
        zodiac TEXT NOT NULL,
        festival TEXT NOT NULL,
        good TEXT NOT NULL,
        bad TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
  }

  getApiKey(): string {
    return this.readConfig().tianApiKey?.trim() ?? ''
  }

  setApiKey(value: string): void {
    const nextConfig = this.readConfig()
    const key = value.trim()

    if (key) {
      nextConfig.tianApiKey = key
    } else {
      delete nextConfig.tianApiKey
    }

    fs.writeFileSync(this.configPath, JSON.stringify(nextConfig, null, 2), 'utf8')
  }

  async getAlmanac(date: string): Promise<AlmanacResult> {
    if (!this.getApiKey()) {
      return {
        record: null,
        source: 'none',
      }
    }

    const cached = this.getCached(date)

    if (cached) {
      this.refreshInBackground(date)
      return {
        record: cached,
        source: 'cache',
      }
    }

    const fetched = await this.fetchAndCache(date)

    return {
      record: fetched,
      source: fetched ? 'network' : 'none',
    }
  }

  private readConfig(): AppConfig {
    if (!fs.existsSync(this.configPath)) {
      return {}
    }

    try {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf8')) as AppConfig
    } catch {
      return {}
    }
  }

  private getCached(date: string): AlmanacRecord | null {
    const row = this.database
      .prepare(`
        SELECT
          date,
          lunar_month_label,
          lunar_day_label,
          ganzhi_year,
          zodiac,
          festival,
          good,
          bad,
          updated_at
        FROM almanac_cache
        WHERE date = ?
      `)
      .get(date) as
      | {
          date: string
          lunar_month_label: string
          lunar_day_label: string
          ganzhi_year: string
          zodiac: string
          festival: string
          good: string
          bad: string
          updated_at: number
        }
      | undefined

    if (!row) {
      return null
    }

    return {
      date: row.date,
      lunarMonthLabel: row.lunar_month_label,
      lunarDayLabel: row.lunar_day_label,
      ganzhiYear: row.ganzhi_year,
      zodiac: row.zodiac,
      festival: row.festival,
      good: row.good,
      bad: row.bad,
      updatedAt: row.updated_at,
    }
  }

  private async fetchAndCache(date: string): Promise<AlmanacRecord | null> {
    const apiKey = this.getApiKey()

    if (!apiKey) {
      return null
    }

    try {
      const response = await fetch(`https://apis.tianapi.com/lunar/index?key=${encodeURIComponent(apiKey)}&date=${encodeURIComponent(date)}`)
      const data = (await response.json()) as TianApiResponse

      if (data.code !== 200 || !data.result) {
        return null
      }

      const record: AlmanacRecord = {
        date: data.result.gregoriandate || date,
        lunarMonthLabel: data.result.lubarmonth || '',
        lunarDayLabel: data.result.lunarday || '',
        ganzhiYear: data.result.tiangandizhiyear || '',
        zodiac: data.result.shengxiao || '',
        festival: data.result.festival || '',
        good: normalizeList(data.result.fitness),
        bad: normalizeList(data.result.taboo),
        updatedAt: Date.now(),
      }

      if (!record.good || !record.bad) {
        return null
      }

      this.database
        .prepare(`
          INSERT INTO almanac_cache (
            date, lunar_month_label, lunar_day_label, ganzhi_year, zodiac, festival, good, bad, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(date) DO UPDATE SET
            lunar_month_label = excluded.lunar_month_label,
            lunar_day_label = excluded.lunar_day_label,
            ganzhi_year = excluded.ganzhi_year,
            zodiac = excluded.zodiac,
            festival = excluded.festival,
            good = excluded.good,
            bad = excluded.bad,
            updated_at = excluded.updated_at
        `)
        .run(
          record.date,
          record.lunarMonthLabel,
          record.lunarDayLabel,
          record.ganzhiYear,
          record.zodiac,
          record.festival,
          record.good,
          record.bad,
          record.updatedAt,
        )

      return record
    } catch {
      return null
    }
  }

  private refreshInBackground(date: string): void {
    const today = formatDate(new Date())

    if (date !== today || !this.getApiKey()) {
      return
    }

    void this.fetchAndCache(date).then((record) => {
      if (record) {
        this.emit('updated', record)
      }
    })
  }
}
