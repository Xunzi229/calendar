import type { HolidayDay, HolidayGroup, HolidayKind, HolidaySource } from '../../shared/holiday/types'

interface Statement<TParams extends unknown[] = unknown[], TResult = unknown> {
  all(...params: TParams): TResult[]
  get(...params: TParams): TResult | undefined
  run(...params: TParams): unknown
}

export interface SqliteDatabase {
  exec(sql: string): void
  prepare<TParams extends unknown[] = unknown[], TResult = unknown>(sql: string): Statement<TParams, TResult>
  transaction<T extends (...args: never[]) => unknown>(fn: T): T
}

interface HolidayDayRow {
  date: string
  year: number
  month: number
  day: number
  name: string
  kind: HolidayKind
  source: HolidaySource
  source_url?: string
  is_manual_override: 0 | 1
}

function toHolidayDay(row: HolidayDayRow): HolidayDay {
  return {
    date: row.date,
    year: row.year,
    month: row.month,
    day: row.day,
    name: row.name,
    kind: row.kind,
    source: row.source,
    sourceUrl: row.source_url,
    isManualOverride: row.is_manual_override === 1,
  }
}

export class HolidayRepository {
  constructor(private readonly db: SqliteDatabase) {}

  initialize(schemaSql: string): void {
    this.db.exec(schemaSql)
  }

  getMonth(year: number, month: number): HolidayDay[] {
    const rows = this.db
      .prepare<[number, number], HolidayDayRow>(
        `SELECT date, year, month, day, name, kind, source, source_url, is_manual_override
         FROM holiday_days
         WHERE year = ? AND month = ?
         ORDER BY date ASC`,
      )
      .all(year, month)

    return rows.map(toHolidayDay)
  }

  hasYearData(year: number): boolean {
    const row = this.db
      .prepare<[number], { total: number }>(
        `SELECT COUNT(*) AS total
         FROM holiday_days
         WHERE year = ? AND kind IN ('holiday', 'workday')`,
      )
      .get(year)

    return Boolean(row?.total)
  }

  upsertManualDay(input: {
    date: string
    name: string
    kind: HolidayKind
  }): void {
    const [year, month, day] = input.date.split('-').map(Number)

    this.db
      .prepare<[string, number, number, number, string, HolidayKind]>(
        `INSERT INTO holiday_days (
           date, year, month, day, name, kind, source, is_manual_override, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, 'manual', 1, CURRENT_TIMESTAMP)
         ON CONFLICT(date) DO UPDATE SET
           name = excluded.name,
           kind = excluded.kind,
           source = 'manual',
           is_manual_override = 1,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .run(input.date, year, month, day, input.name, input.kind)
  }

  importYear(groups: HolidayGroup[], days: HolidayDay[], provider: string, year: number): void {
    const importTransaction = this.db.transaction(() => {
      for (const group of groups) {
        const result = this.db
          .prepare<[number, string, string, string, number, HolidaySource, string | undefined, string | undefined]>(
            `INSERT INTO holiday_groups (
               year, name, start_date, end_date, duration, source, source_url, memo, updated_at
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          )
          .run(
            group.year,
            group.name,
            group.startDate,
            group.endDate,
            group.duration,
            group.source,
            group.sourceUrl,
            group.memo,
          ) as { lastInsertRowid?: number | bigint }

        const groupId = Number(result.lastInsertRowid)

        for (const day of group.days) {
          this.upsertImportedDay(day, groupId)
        }
      }

      if (!groups.length) {
        for (const day of days) {
          this.upsertImportedDay(day)
        }
      }

      this.db
        .prepare<[number, string]>(
          `INSERT INTO holiday_sync_logs (year, provider, status, message)
           VALUES (?, ?, 'success', NULL)`,
        )
        .run(year, provider)
    })

    importTransaction()
  }

  logSyncFailure(year: number, provider: string, message: string): void {
    this.db
      .prepare<[number, string, string]>(
        `INSERT INTO holiday_sync_logs (year, provider, status, message)
         VALUES (?, ?, 'failed', ?)`,
      )
      .run(year, provider, message)
  }

  private upsertImportedDay(day: HolidayDay, groupId?: number): void {
    this.db
      .prepare<
        [string, number, number, number, string, HolidayKind, HolidaySource, string | undefined, number | undefined]
      >(
        `INSERT INTO holiday_days (
           date, year, month, day, name, kind, source, source_url, group_id, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(date) DO UPDATE SET
           name = CASE
             WHEN holiday_days.is_manual_override = 1 THEN holiday_days.name
             ELSE excluded.name
           END,
           kind = CASE
             WHEN holiday_days.is_manual_override = 1 THEN holiday_days.kind
             ELSE excluded.kind
           END,
           source = CASE
             WHEN holiday_days.is_manual_override = 1 THEN holiday_days.source
             ELSE excluded.source
           END,
           source_url = CASE
             WHEN holiday_days.is_manual_override = 1 THEN holiday_days.source_url
             ELSE excluded.source_url
           END,
           group_id = CASE
             WHEN holiday_days.is_manual_override = 1 THEN holiday_days.group_id
             ELSE excluded.group_id
           END,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .run(day.date, day.year, day.month, day.day, day.name, day.kind, day.source, day.sourceUrl, groupId)
  }
}
