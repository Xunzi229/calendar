import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { desktopApi } from './api/desktop'
import type { AlmanacRecord } from '../../shared/almanac/types'
import type { ClockSnapshot } from '../../shared/clock/types'
import './styles.css'

type DayKind = 'normal' | 'holiday' | 'workday' | 'muted'
type BadgeKind = 'rest' | 'work' | 'today'
type HolidayKey = 'all' | 'new-year' | 'spring-festival' | 'qingming' | 'labor-day' | 'dragon-boat' | 'mid-autumn' | 'national-day'

interface CalendarDay {
  date: Date
  day: number
  key: string
  lunar: string
  kind: DayKind
  badge?: BadgeKind
  isCurrentMonth: boolean
  isToday: boolean
}

interface HolidayInfo {
  holidayKey?: HolidayKey
  name: string
  kind: Exclude<DayKind, 'normal' | 'muted'>
  badge: Exclude<BadgeKind, 'today'>
}

interface HolidayOption {
  key: HolidayKey
  label: string
}

interface HolidayRange {
  key: Exclude<HolidayKey, 'all'>
  name: string
  startDate: string
  endDate: string
  workdays?: string[]
}

const text = {
  allHolidays: '\u5047\u671f',
  year: '\u5e74',
  month: '\u6708',
  today: '\u4eca\u5929',
  previousMonth: '\u4e0a\u4e2a\u6708',
  nextMonth: '\u4e0b\u4e2a\u6708',
  rest: '\u4f11',
  work: '\u73ed',
  currentDay: '\u4eca',
  suitable: '\u5b9c',
  avoid: '\u5fcc',
  distance: '\u8ddd\u79bb',
  remains: '\u8fd8\u6709',
  days: '\u5929',
  nextHoliday: '\u4e0b\u4e00\u4e2a\u8282\u65e5',
  noHolidayData: '\u5f53\u524d\u5e74\u4efd\u6682\u65e0\u8be5\u8282\u5047\u65e5\u6570\u636e',
  zodiacHorse: '\u9a6c',
  settingsTitle: '\u914d\u7f6e TianAPI Key',
  apiKeyLabel: 'TianAPI Key',
  save: '\u4fdd\u5b58',
  clear: '\u6e05\u9664',
  close: '\u5173\u95ed',
  apiKeySaved: 'TianAPI Key \u5df2\u4fdd\u5b58',
  apiKeyCleared: 'TianAPI Key \u5df2\u6e05\u9664',
  apiKeyHint: '\u672a\u914d\u7f6e\u6216 Key \u5931\u6548\u65f6\uff0c\u9ec4\u5386\u9762\u677f\u4f1a\u81ea\u52a8\u9690\u85cf\u3002',
}

const weekDays = ['\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d', '\u65e5']
const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1)
const currentYear = new Date().getFullYear()

const holidayOptions: HolidayOption[] = [
  { key: 'all', label: text.allHolidays },
  { key: 'new-year', label: '\u5143\u65e6' },
  { key: 'spring-festival', label: '\u6625\u8282' },
  { key: 'qingming', label: '\u6e05\u660e\u8282' },
  { key: 'labor-day', label: '\u52b3\u52a8\u8282' },
  { key: 'dragon-boat', label: '\u7aef\u5348\u8282' },
  { key: 'mid-autumn', label: '\u4e2d\u79cb\u8282' },
  { key: 'national-day', label: '\u56fd\u5e86\u8282' },
]

const holidayRangesByYear: Record<number, HolidayRange[]> = {
  2026: [
    { key: 'new-year', name: '\u5143\u65e6', startDate: '2026-01-01', endDate: '2026-01-03', workdays: ['2026-01-04'] },
    {
      key: 'spring-festival',
      name: '\u6625\u8282',
      startDate: '2026-02-15',
      endDate: '2026-02-23',
      workdays: ['2026-02-14', '2026-02-28'],
    },
    { key: 'qingming', name: '\u6e05\u660e', startDate: '2026-04-04', endDate: '2026-04-06' },
    { key: 'labor-day', name: '\u52b3\u52a8\u8282', startDate: '2026-05-01', endDate: '2026-05-05', workdays: ['2026-05-09'] },
    { key: 'dragon-boat', name: '\u7aef\u5348\u8282', startDate: '2026-06-19', endDate: '2026-06-21' },
    { key: 'mid-autumn', name: '\u4e2d\u79cb\u8282', startDate: '2026-09-25', endDate: '2026-09-27' },
    { key: 'national-day', name: '\u56fd\u5e86\u8282', startDate: '2026-10-01', endDate: '2026-10-07', workdays: ['2026-09-20', '2026-10-10'] },
  ],
}

const festivalMap: Record<string, string> = {
  '01-01': '\u5143\u65e6',
  '02-14': '\u60c5\u4eba\u8282',
  '03-08': '\u5987\u5973\u8282',
  '03-12': '\u690d\u6811\u8282',
  '04-01': '\u611a\u4eba\u8282',
  '04-22': '\u5730\u7403\u65e5',
  '05-01': '\u52b3\u52a8\u8282',
  '05-04': '\u9752\u5e74\u8282',
  '06-01': '\u513f\u7ae5\u8282',
  '09-10': '\u6559\u5e08\u8282',
  '10-01': '\u56fd\u5e86\u8282',
  '12-25': '\u5723\u8bde\u8282',
}

const lunarFallback = [
  '\u521d\u4e00',
  '\u521d\u4e8c',
  '\u521d\u4e09',
  '\u521d\u56db',
  '\u521d\u4e94',
  '\u521d\u516d',
  '\u521d\u4e03',
  '\u521d\u516b',
  '\u521d\u4e5d',
  '\u521d\u5341',
  '\u5341\u4e00',
  '\u5341\u4e8c',
  '\u5341\u4e09',
  '\u5341\u56db',
  '\u5341\u4e94',
  '\u5341\u516d',
  '\u5341\u4e03',
  '\u5341\u516b',
  '\u5341\u4e5d',
  '\u4e8c\u5341',
  '\u5eff\u4e00',
  '\u5eff\u4e8c',
  '\u5eff\u4e09',
  '\u5eff\u56db',
  '\u5eff\u4e94',
  '\u5eff\u516d',
  '\u5eff\u4e03',
  '\u5eff\u516b',
  '\u5eff\u4e5d',
  '\u4e09\u5341',
  '\u521d\u4e00',
]

function classNames(...names: Array<string | false | undefined>): string {
  return names.filter(Boolean).join(' ')
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatMonthDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${month}-${day}`
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function isSameDate(left: Date, right: Date): boolean {
  return formatDate(left) === formatDate(right)
}

function getMondayFirstWeekday(date: Date): number {
  return (date.getDay() + 6) % 7
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1)

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  }
}

function eachDate(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cursor = parseDate(startDate)
  const end = parseDate(endDate)

  while (cursor <= end) {
    dates.push(formatDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

function buildHolidayMap(year: number): Record<string, HolidayInfo> {
  const result: Record<string, HolidayInfo> = {}

  for (const range of holidayRangesByYear[year] ?? []) {
    for (const date of eachDate(range.startDate, range.endDate)) {
      result[date] = {
        holidayKey: range.key,
        name: range.name,
        kind: 'holiday',
        badge: 'rest',
      }
    }

    for (const date of range.workdays ?? []) {
      result[date] = {
        holidayKey: range.key,
        name: '\u8865\u73ed',
        kind: 'workday',
        badge: 'work',
      }
    }
  }

  return result
}

function getHolidayRange(year: number, key: HolidayKey): HolidayRange | undefined {
  if (key === 'all') {
    return undefined
  }

  return holidayRangesByYear[year]?.find((range) => range.key === key)
}

function getDisplayText(date: Date, holidayMap: Record<string, HolidayInfo>): string {
  const fullDate = formatDate(date)
  const monthDay = formatMonthDay(date)

  return holidayMap[fullDate]?.name ?? festivalMap[monthDay] ?? lunarFallback[(date.getDate() - 1) % lunarFallback.length]
}

function buildMonthDays(year: number, month: number, holidayMap: Record<string, HolidayInfo>, today: Date): CalendarDay[] {
  const firstDay = new Date(year, month - 1, 1)
  const startOffset = getMondayFirstWeekday(firstDay)
  const gridStart = new Date(year, month - 1, 1 - startOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)

    const fullDate = formatDate(date)
    const info = holidayMap[fullDate]
    const isCurrentMonth = date.getMonth() === month - 1
    const isToday = isSameDate(date, today)
    const kind: DayKind = !isCurrentMonth ? 'muted' : info?.kind ?? 'normal'

    return {
      date,
      day: date.getDate(),
      key: fullDate,
      lunar: getDisplayText(date, holidayMap),
      kind,
      badge: isToday ? 'today' : info?.badge,
      isCurrentMonth,
      isToday,
    }
  })
}

function getCountdown(selectedDate: Date, holidayMap: Record<string, HolidayInfo>): { name: string; days: number } {
  const candidates = Object.entries(holidayMap)
    .filter(([, info]) => info.kind === 'holiday')
    .map(([date, info]) => ({
      date: parseDate(date),
      name: info.name,
    }))
    .filter((item) => item.date >= parseDate(formatDate(selectedDate)))
    .sort((left, right) => left.date.getTime() - right.date.getTime())

  const next = candidates[0]

  if (!next) {
    return { name: text.nextHoliday, days: 0 }
  }

  const diff = next.date.getTime() - parseDate(formatDate(selectedDate)).getTime()

  return {
    name: `${next.date.getFullYear()}${text.year}${next.name}`,
    days: Math.ceil(diff / 86400000),
  }
}

function badgeText(badge: BadgeKind): string {
  if (badge === 'rest') {
    return text.rest
  }

  if (badge === 'work') {
    return text.work
  }

  return text.currentDay
}

function buildYearWindow(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function toClockDate(snapshot: ClockSnapshot): Date {
  return new Date(snapshot.iso)
}

function SettingsApp(): React.ReactElement {
  const [apiKey, setApiKey] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    void desktopApi.getApiKey().then((value) => {
      if (!cancelled) {
        setApiKey(value)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function saveApiKey(): Promise<void> {
    setBusy(true)
    setMessage('')

    try {
      await desktopApi.setApiKey(apiKey)
      setMessage(apiKey.trim() ? text.apiKeySaved : text.apiKeyCleared)
    } finally {
      setBusy(false)
    }
  }

  async function clearApiKey(): Promise<void> {
    setBusy(true)
    setMessage('')

    try {
      setApiKey('')
      await desktopApi.setApiKey('')
      setMessage(text.apiKeyCleared)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="settings-shell">
      <section className="settings-window">
        <div className="settings-panel__header">
          <strong>{text.settingsTitle}</strong>
          <span>{text.apiKeyHint}</span>
        </div>
        <label className="settings-field">
          <span>{text.apiKeyLabel}</span>
          <input
            className="settings-input"
            value={apiKey}
            placeholder="请输入 TianAPI Key"
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>
        <div className="settings-actions">
          <button className="settings-button" disabled={busy} onClick={() => void clearApiKey()}>
            {text.clear}
          </button>
          <button className="settings-button primary" disabled={busy} onClick={() => void saveApiKey()}>
            {text.save}
          </button>
          <button className="settings-button" disabled={busy} onClick={() => void desktopApi.closeCurrentWindow()}>
            {text.close}
          </button>
        </div>
        {message && <p className="settings-feedback">{message}</p>}
      </section>
    </main>
  )
}

function CalendarApp(): React.ReactElement {
  const calendarWindowRef = useRef<HTMLElement | null>(null)
  const lastClockSnapshotRef = useRef<ClockSnapshot | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayKey>('all')
  const [statusMessage, setStatusMessage] = useState('')
  const [yearMenuOpen, setYearMenuOpen] = useState(false)
  const [monthMenuOpen, setMonthMenuOpen] = useState(false)
  const [holidayMenuOpen, setHolidayMenuOpen] = useState(false)
  const [yearWindow, setYearWindow] = useState({ start: currentYear - 4, end: currentYear + 6 })
  const [almanacRecord, setAlmanacRecord] = useState<AlmanacRecord | null>(null)
  const previousTodayKeyRef = useRef(formatDate(now))

  const holidayMap = useMemo(() => buildHolidayMap(viewYear), [viewYear])
  const days = useMemo(() => buildMonthDays(viewYear, viewMonth, holidayMap, now), [holidayMap, now, viewMonth, viewYear])
  const selectedText = getDisplayText(selectedDate, holidayMap)
  const countdown = getCountdown(selectedDate, holidayMap)
  const visibleYears = useMemo(() => buildYearWindow(yearWindow.start, yearWindow.end), [yearWindow])

  function refreshAlmanac(date: Date): void {
    void desktopApi.getAlmanac(formatDate(date)).then((result) => {
      setAlmanacRecord(result.record)
    })
  }

  function jumpToDate(date: Date): void {
    setViewYear(date.getFullYear())
    setViewMonth(date.getMonth() + 1)
    setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    setSelectedHoliday('all')
    setStatusMessage('')
    ensureYearVisible(date.getFullYear())
  }

  useEffect(() => {
    let cancelled = false
    let pollTimer = 0

    const syncClockSnapshot = (snapshot: ClockSnapshot): void => {
      const previous = lastClockSnapshotRef.current

      if (
        !previous ||
        previous.iso !== snapshot.iso ||
        previous.dateKey !== snapshot.dateKey ||
        previous.timezoneOffset !== snapshot.timezoneOffset ||
        previous.timeZone !== snapshot.timeZone
      ) {
        lastClockSnapshotRef.current = snapshot
        setNow(toClockDate(snapshot))
      }
    }

    void desktopApi.getClockSnapshot().then((snapshot) => {
      if (!cancelled) {
        syncClockSnapshot(snapshot)
      }
    })

    const unsubscribe = desktopApi.onClockChanged((snapshot) => {
      syncClockSnapshot(snapshot)
    })

    pollTimer = window.setInterval(() => {
      void desktopApi.getClockSnapshot().then((snapshot) => {
        if (!cancelled) {
          syncClockSnapshot(snapshot)
        }
      })
    }, 30000)

    return () => {
      cancelled = true
      window.clearInterval(pollTimer)
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const selectedDateKey = formatDate(selectedDate)

    void desktopApi.getAlmanac(selectedDateKey).then((result) => {
      if (!cancelled) {
        setAlmanacRecord(result.record)
      }
    })

    return () => {
      cancelled = true
    }
  }, [selectedDate])

  useEffect(() => {
    const preventContextMenu = (event: MouseEvent): void => {
      event.preventDefault()
    }

    document.addEventListener('contextmenu', preventContextMenu)

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu)
    }
  }, [])

  useEffect(() => {
    const target = calendarWindowRef.current

    if (!target) {
      return
    }

    const reportSize = (): void => {
      const rect = target.getBoundingClientRect()
      void desktopApi.reportCalendarSize({
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
      })
    }

    const observer = new ResizeObserver(() => {
      reportSize()
    })

    observer.observe(target)
    reportSize()

    return () => {
      observer.disconnect()
    }
  }, [almanacRecord, statusMessage, viewMonth, viewYear, yearMenuOpen, monthMenuOpen, holidayMenuOpen])

  useEffect(() => {
    return desktopApi.onAlmanacUpdated((record) => {
      if (record === null) {
        refreshAlmanac(selectedDate)
        return
      }

      if (record.date === formatDate(selectedDate)) {
        setAlmanacRecord(record)
      }
    })
  }, [selectedDate])

  useEffect(() => {
    return desktopApi.onCalendarShown(() => {
      void desktopApi.getClockSnapshot().then((snapshot) => {
        lastClockSnapshotRef.current = snapshot
        const today = toClockDate(snapshot)
        setNow(today)
        jumpToDate(today)
        refreshAlmanac(today)
      })
    })
  }, [])

  useEffect(() => {
    const previousTodayKey = previousTodayKeyRef.current
    const currentTodayKey = formatDate(now)

    if (previousTodayKey !== currentTodayKey) {
      setSelectedDate((current) => (formatDate(current) === previousTodayKey ? new Date(now) : current))

      if (viewYear === parseDate(previousTodayKey).getFullYear() && viewMonth === parseDate(previousTodayKey).getMonth() + 1) {
        setViewYear(now.getFullYear())
        setViewMonth(now.getMonth() + 1)
      }
    }

    previousTodayKeyRef.current = currentTodayKey
  }, [now, viewMonth, viewYear])

  function jumpToHoliday(year: number, key: HolidayKey): boolean {
    const range = getHolidayRange(year, key)

    if (!range) {
      return false
    }

    const date = parseDate(range.startDate)
    setViewYear(date.getFullYear())
    setViewMonth(date.getMonth() + 1)
    setSelectedDate(date)
    setStatusMessage(`${range.name}: ${range.startDate} - ${range.endDate}`)

    return true
  }

  function ensureYearVisible(year: number): void {
    setYearWindow((current) => ({
      start: Math.min(current.start, year - 4),
      end: Math.max(current.end, year + 6),
    }))
  }

  function changeYear(year: number): void {
    setViewYear(year)
    ensureYearVisible(year)
    setYearMenuOpen(false)

    if (selectedHoliday !== 'all' && !jumpToHoliday(year, selectedHoliday)) {
      setStatusMessage(text.noHolidayData)
    }
  }

  function changeMonthValue(month: number): void {
    setViewMonth(month)
    setMonthMenuOpen(false)
    setStatusMessage('')
  }

  function handleYearScroll(event: React.UIEvent<HTMLDivElement>): void {
    const target = event.currentTarget
    const nearTop = target.scrollTop < 24
    const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 24

    if (nearTop) {
      setYearWindow((current) => ({ ...current, start: current.start - 10 }))
    }

    if (nearBottom) {
      setYearWindow((current) => ({ ...current, end: current.end + 10 }))
    }
  }

  function changeHoliday(key: HolidayKey): void {
    setSelectedHoliday(key)
    setHolidayMenuOpen(false)

    if (key === 'all') {
      setStatusMessage('')
      return
    }

    if (!jumpToHoliday(viewYear, key)) {
      setStatusMessage(text.noHolidayData)
    }
  }

  function changeMonth(delta: number): void {
    const next = addMonths(viewYear, viewMonth, delta)
    setViewYear(next.year)
    setViewMonth(next.month)
    ensureYearVisible(next.year)
    setStatusMessage('')
  }

  function jumpToday(): void {
    jumpToDate(now)
  }

  function selectDay(day: CalendarDay): void {
    setSelectedDate(day.date)
    setStatusMessage('')

    if (!day.isCurrentMonth) {
      setViewYear(day.date.getFullYear())
      setViewMonth(day.date.getMonth() + 1)
      ensureYearVisible(day.date.getFullYear())
    }
  }

  return (
    <main
      className="app-shell"
      onClick={() => {
        setYearMenuOpen(false)
        setMonthMenuOpen(false)
        setHolidayMenuOpen(false)
      }}
    >
      <section ref={calendarWindowRef} className="calendar-window">
        <header className="toolbar">
          <div className="toolbar-start" onClick={(event) => event.stopPropagation()}>
            <div className="picker holiday-picker">
              <button
                aria-expanded={holidayMenuOpen}
                aria-label={text.allHolidays}
                className="control picker-button holiday-control"
                onClick={() => {
                  setHolidayMenuOpen((open) => !open)
                  setYearMenuOpen(false)
                  setMonthMenuOpen(false)
                }}
              >
                <span>{holidayOptions.find((option) => option.key === selectedHoliday)?.label ?? text.allHolidays}</span>
                <span className="select-caret" aria-hidden="true" />
              </button>
              {holidayMenuOpen && (
                <div className="picker-menu holiday-menu">
                  {holidayOptions.map((option) => {
                    const disabled = option.key !== 'all' && !getHolidayRange(viewYear, option.key)

                    return (
                      <button
                        key={option.key}
                        className={classNames('picker-option', option.key === selectedHoliday && 'is-active')}
                        disabled={disabled}
                        onClick={() => {
                          if (!disabled) {
                            changeHoliday(option.key)
                          }
                        }}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="toolbar-center" onClick={(event) => event.stopPropagation()}>
            <div className="year-picker">
              <button
                aria-expanded={yearMenuOpen}
                aria-label={text.year}
                className="control year-picker-button"
                onClick={() => {
                  setYearMenuOpen((open) => !open)
                  setMonthMenuOpen(false)
                  setHolidayMenuOpen(false)
                }}
              >
                <span>
                  {viewYear}
                  {text.year}
                </span>
                <span className="select-caret" aria-hidden="true" />
              </button>
              {yearMenuOpen && (
                <div className="year-menu" onScroll={handleYearScroll}>
                  {visibleYears.map((year) => (
                    <button
                      key={year}
                      className={classNames('year-option', year === viewYear && 'is-active')}
                      onClick={() => changeYear(year)}
                    >
                      {year}
                      {text.year}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="arrow-button" aria-label={text.previousMonth} onClick={() => changeMonth(-1)}>
              {'<'}
            </button>
            <div className="picker">
              <button
                aria-expanded={monthMenuOpen}
                aria-label={text.month}
                className="control picker-button control-month"
                onClick={() => {
                  setMonthMenuOpen((open) => !open)
                  setYearMenuOpen(false)
                  setHolidayMenuOpen(false)
                }}
              >
                <span>
                  {viewMonth}
                  {text.month}
                </span>
                <span className="select-caret" aria-hidden="true" />
              </button>
              {monthMenuOpen && (
                <div className="picker-menu month-menu">
                  {monthOptions.map((month) => (
                    <button
                      key={month}
                      className={classNames('picker-option', month === viewMonth && 'is-active')}
                      onClick={() => changeMonthValue(month)}
                    >
                      {month}
                      {text.month}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="arrow-button" aria-label={text.nextMonth} onClick={() => changeMonth(1)}>
              {'>'}
            </button>
          </div>

          <button className="today-button" onClick={jumpToday}>
            {text.today}
          </button>
        </header>

        {statusMessage && <div className="status-strip">{statusMessage}</div>}

        <div className="calendar-body">
          <div className="week-grid">
            {weekDays.map((day, index) => (
              <div key={day} className={classNames('week-day', index > 4 && 'weekend')}>
                {day}
              </div>
            ))}
          </div>

          <div className="month-grid">
            {days.map((day) => {
              const isSelected = isSameDate(day.date, selectedDate)

              return (
                <button
                  key={day.key}
                  className={classNames(
                    'day-cell',
                    day.kind === 'muted' && 'is-muted',
                    day.kind === 'holiday' && 'is-holiday',
                    day.kind === 'workday' && 'is-workday',
                    isSelected && 'is-selected',
                  )}
                  onClick={() => selectDay(day)}
                >
                  {day.badge && (
                    <span
                      className={classNames(
                        'day-badge',
                        day.badge === 'rest' && 'badge-rest',
                        day.badge === 'work' && 'badge-work',
                        day.badge === 'today' && 'badge-today',
                      )}
                    >
                      {badgeText(day.badge)}
                    </span>
                  )}
                  <span className="day-number">{day.day}</span>
                  <span className="lunar-text">{day.lunar}</span>
                </button>
              )
            })}
          </div>
        </div>

        {almanacRecord && (
          <footer className="detail-panel">
            <div className="festival-links">
              <a href="#selected-day">{selectedText}</a>
            </div>

            <article className="almanac-card">
              <div className="lunar-summary">
                <strong>
                  {almanacRecord.lunarMonthLabel || `${selectedDate.getMonth() + 1}${text.month}`}{' '}
                  {almanacRecord.lunarDayLabel || lunarFallback[(selectedDate.getDate() - 1) % lunarFallback.length]}
                </strong>
                <span>
                  {almanacRecord.ganzhiYear || `${selectedDate.getFullYear()}${text.year}`} {almanacRecord.zodiac || text.zodiacHorse}
                </span>
              </div>

              <div className="almanac-lines">
                <p>
                  <span className="almanac-tag tag-good">{text.suitable}</span>
                  {almanacRecord.good}
                </p>
                <p>
                  <span className="almanac-tag tag-bad">{text.avoid}</span>
                  {almanacRecord.bad}
                </p>
              </div>
            </article>

            <div className="countdown-line">
              <span aria-hidden="true">o</span>
              {text.distance} {countdown.name} {text.remains} <strong>{countdown.days}</strong> {text.days}
            </div>
          </footer>
        )}
      </section>
    </main>
  )
}

const isSettingsView = new URLSearchParams(window.location.search).get('view') === 'settings'

createRoot(document.getElementById('root')!).render(isSettingsView ? <SettingsApp /> : <CalendarApp />)
