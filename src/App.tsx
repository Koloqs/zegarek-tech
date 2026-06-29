import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  BellRing,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
} from 'lucide-react'
import './App.css'
import { OrbitalClock } from './OrbitalClock'
import { WorldGlobe } from './WorldGlobe'
import type { GlobeCity } from './WorldGlobe'

const zones: GlobeCity[] = [
  { city: 'Warszawa', zone: 'Europe/Warsaw', code: 'PL', lat: 52.2297, lon: 21.0122 },
  { city: 'Londyn', zone: 'Europe/London', code: 'UK', lat: 51.5072, lon: -0.1276 },
  { city: 'Nowy Jork', zone: 'America/New_York', code: 'NY', lat: 40.7128, lon: -74.006 },
  { city: 'Tokio', zone: 'Asia/Tokyo', code: 'JP', lat: 35.6762, lon: 139.6503 },
  { city: 'Sydney', zone: 'Australia/Sydney', code: 'AU', lat: -33.8688, lon: 151.2093 },
  { city: 'Reykjavik', zone: 'Atlantic/Reykjavik', code: 'IS', lat: 64.1466, lon: -21.9426 },
]

type Theme = 'light' | 'dark'
type FocusMode = 'focus' | 'break'

const focusDurations: Record<FocusMode, number> = {
  focus: 25 * 60,
  break: 5 * 60,
}

function formatTime(date: Date, timeZone = 'Europe/Warsaw') {
  return new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone,
  }).format(date)
}

function formatShortTime(date: Date, timeZone = 'Europe/Warsaw') {
  return new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Warsaw',
  }).format(date)
}

function formatFocus(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function getZoneLabel(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('pl-PL', {
    timeZone,
    timeZoneName: 'short',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value
}

function getTheme(): Theme {
  const savedTheme = window.localStorage.getItem('zegarek-theme')

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function App() {
  const [now, setNow] = useState(() => new Date())
  const [theme, setTheme] = useState<Theme>(getTheme)
  const [focusMode, setFocusMode] = useState<FocusMode>('focus')
  const [focusLeft, setFocusLeft] = useState(focusDurations.focus)
  const [focusRunning, setFocusRunning] = useState(false)
  const [selectedZone, setSelectedZone] = useState(zones[0].zone)

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 250)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('zegarek-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!focusRunning) return

    const timer = window.setInterval(() => {
      setFocusLeft((current) => {
        if (current <= 1) {
          setFocusRunning(false)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [focusRunning])

  const hands = useMemo(() => {
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000
    const minutes = now.getMinutes() + seconds / 60
    const hours = (now.getHours() % 12) + minutes / 60

    return {
      hour: hours * 30,
      minute: minutes * 6,
      second: seconds * 6,
    }
  }, [now])

  const dayStats = useMemo(() => {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const elapsed = now.getTime() - start.getTime()
    const dayLength = end.getTime() - start.getTime()
    const percent = Math.min(100, Math.max(0, (elapsed / dayLength) * 100))
    const leftSeconds = Math.max(0, Math.round((end.getTime() - now.getTime()) / 1000))
    const leftHours = Math.floor(leftSeconds / 3600)
    const leftMinutes = Math.floor((leftSeconds % 3600) / 60)

    const weekDay = (now.getDay() + 6) % 7
    const weekPercent = ((weekDay * dayLength + elapsed) / (7 * dayLength)) * 100

    const yearStart = new Date(now.getFullYear(), 0, 1)
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1)
    const yearPercent =
      ((now.getTime() - yearStart.getTime()) /
        (yearEnd.getTime() - yearStart.getTime())) *
      100

    return {
      day: percent,
      week: weekPercent,
      year: yearPercent,
      left: `${leftHours}h ${String(leftMinutes).padStart(2, '0')}m`,
    }
  }, [now])

  const selectedCity = useMemo(
    () => zones.find((item) => item.zone === selectedZone) ?? zones[0],
    [selectedZone],
  )

  const focusProgress =
    ((focusDurations[focusMode] - focusLeft) / focusDurations[focusMode]) * 100

  const switchFocusMode = (mode: FocusMode) => {
    setFocusMode(mode)
    setFocusLeft(focusDurations[mode])
    setFocusRunning(false)
  }

  const resetFocus = () => {
    setFocusLeft(focusDurations[focusMode])
    setFocusRunning(false)
  }

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Nagłówek strony">
        <a className="brand" href="/" aria-label="zegarek.tech">
          <span className="brand-mark" aria-hidden="true">
            <Sparkles size={15} strokeWidth={2.4} />
          </span>
          <span>zegarek.tech</span>
        </a>
        <p className="topbar-time">{formatShortTime(now)} Warszawa</p>
        <button
          className="icon-button"
          type="button"
          onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          aria-label={theme === 'dark' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'}
          title={theme === 'dark' ? 'Jasny motyw' : 'Ciemny motyw'}
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </header>

      <section className="clock-hero" aria-labelledby="main-clock-title">
        <div className="hero-copy">
          <p className="eyebrow">czas lokalny</p>
          <h1 id="main-clock-title">{formatTime(now)}</h1>
          <p className="date-line">{formatDate(now)}</p>

          <div className="day-rail" aria-label="Postęp dnia">
            <div className="day-rail-track">
              <span style={{ width: `${dayStats.day}%` }}></span>
            </div>
            <div className="day-rail-meta">
              <span>{dayStats.day.toFixed(1)}% dnia</span>
              <span>do północy {dayStats.left}</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <OrbitalClock date={now} />
          <div className="analog-clock" aria-hidden="true">
            <span className="tick tick-12">12</span>
            <span className="tick tick-3">3</span>
            <span className="tick tick-6">6</span>
            <span className="tick tick-9">9</span>
            <span
              className="hand hour-hand"
              style={{ transform: `rotate(${hands.hour}deg)` }}
            ></span>
            <span
              className="hand minute-hand"
              style={{ transform: `rotate(${hands.minute}deg)` }}
            ></span>
            <span
              className="hand second-hand"
              style={{ transform: `rotate(${hands.second}deg)` }}
            ></span>
            <span className="pin"></span>
          </div>
        </div>
      </section>

      <section className="rhythm-strip" aria-label="Rytm czasu">
        <article className="metric-card">
          <span>Dzień</span>
          <strong>{dayStats.day.toFixed(1)}%</strong>
          <meter min="0" max="100" value={dayStats.day} />
        </article>
        <article className="metric-card">
          <span>Tydzień</span>
          <strong>{dayStats.week.toFixed(1)}%</strong>
          <meter min="0" max="100" value={dayStats.week} />
        </article>
        <article className="metric-card">
          <span>Rok</span>
          <strong>{dayStats.year.toFixed(1)}%</strong>
          <meter min="0" max="100" value={dayStats.year} />
        </article>
      </section>

      <section className="world-times" aria-labelledby="world-times-title">
        <div className="section-heading">
          <p className="eyebrow">strefy</p>
          <h2 id="world-times-title">Ziemia czasu</h2>
        </div>

        <div className="world-stage">
          <div className="globe-panel">
            <WorldGlobe
              cities={zones}
              selectedZone={selectedCity.zone}
              onSelect={setSelectedZone}
            />
            <article className="selected-city-card" aria-live="polite">
              <span>{selectedCity.code}</span>
              <h3>{selectedCity.city}</h3>
              <strong>{formatTime(now, selectedCity.zone)}</strong>
              <p>{getZoneLabel(now, selectedCity.zone)}</p>
            </article>
          </div>

          <div className="zone-grid">
            {zones.map((item) => (
              <button
                className={`zone-card ${item.zone === selectedCity.zone ? 'is-active' : ''}`}
                data-zone={item.code}
                key={item.zone}
                onClick={() => setSelectedZone(item.zone)}
                type="button"
              >
                <div>
                  <span>{item.city}</span>
                  <em>{getZoneLabel(now, item.zone)}</em>
                </div>
                <strong>{formatTime(now, item.zone)}</strong>
                <small>{item.code}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="focus-studio" aria-labelledby="focus-title">
        <div className="section-heading">
          <p className="eyebrow">focus</p>
          <h2 id="focus-title">Minutnik</h2>
        </div>

        <div className="focus-panel">
          <div
            className="focus-orbit"
            style={{ '--focus-progress': `${focusProgress}%` } as CSSProperties}
          >
            <span>{formatFocus(focusLeft)}</span>
          </div>

          <div className="focus-controls" aria-label="Sterowanie minutnikiem">
            <div className="segmented-control">
              <button
                className={focusMode === 'focus' ? 'is-active' : ''}
                type="button"
                onClick={() => switchFocusMode('focus')}
              >
                Praca
              </button>
              <button
                className={focusMode === 'break' ? 'is-active' : ''}
                type="button"
                onClick={() => switchFocusMode('break')}
              >
                Pauza
              </button>
            </div>

            <div className="icon-row">
              <button
                className="round-action"
                type="button"
                onClick={() => setFocusRunning((current) => !current)}
                aria-label={focusRunning ? 'Pauza' : 'Start'}
                title={focusRunning ? 'Pauza' : 'Start'}
              >
                {focusRunning ? <Pause size={21} /> : <Play size={21} />}
              </button>
              <button
                className="round-action"
                type="button"
                onClick={resetFocus}
                aria-label="Reset"
                title="Reset"
              >
                <RotateCcw size={20} />
              </button>
              <button
                className="round-action"
                type="button"
                aria-label="Sygnał"
                title="Sygnał"
              >
                <BellRing size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
