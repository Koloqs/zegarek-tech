import { useCallback, useEffect, useMemo, useState } from 'react'
import { Crosshair, MapPinned, Moon, Sparkles, Sun } from 'lucide-react'
import tzLookup from 'tz-lookup'
import './App.css'
import { WorldGlobe } from './WorldGlobe'
import type { GlobeCity, GlobeSelection } from './WorldGlobe'

const zones: GlobeCity[] = [
  { city: 'Warszawa', zone: 'Europe/Warsaw', code: 'PL', lat: 52.2297, lon: 21.0122 },
  { city: 'Londyn', zone: 'Europe/London', code: 'UK', lat: 51.5072, lon: -0.1276 },
  { city: 'Nowy Jork', zone: 'America/New_York', code: 'NY', lat: 40.7128, lon: -74.006 },
  { city: 'Tokio', zone: 'Asia/Tokyo', code: 'JP', lat: 35.6762, lon: 139.6503 },
  { city: 'Sydney', zone: 'Australia/Sydney', code: 'AU', lat: -33.8688, lon: 151.2093 },
  { city: 'Reykjavik', zone: 'Atlantic/Reykjavik', code: 'IS', lat: 64.1466, lon: -21.9426 },
  { city: 'Kair', zone: 'Africa/Cairo', code: 'EG', lat: 30.0444, lon: 31.2357 },
  { city: 'Rio de Janeiro', zone: 'America/Sao_Paulo', code: 'BR', lat: -22.9068, lon: -43.1729 },
]

type Theme = 'light' | 'dark'

function formatTime(date: Date, timeZone = 'Europe/Warsaw') {
  return new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone,
  }).format(date)
}

function formatDate(date: Date, timeZone = 'Europe/Warsaw') {
  return new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(date)
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

function distanceKm(from: { lat: number; lon: number }, to: { lat: number; lon: number }) {
  const radius = 6371
  const fromLat = (from.lat * Math.PI) / 180
  const toLat = (to.lat * Math.PI) / 180
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180
  const deltaLon = ((to.lon - from.lon) * Math.PI) / 180
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nearestCity(lat: number, lon: number) {
  return zones.reduce((best, city) => {
    const distance = distanceKm({ lat, lon }, city)
    return distance < best.distance ? { city, distance } : best
  }, { city: zones[0], distance: Number.POSITIVE_INFINITY })
}

function selectionFromCity(city: GlobeCity): GlobeSelection {
  return {
    code: city.code,
    label: city.city,
    lat: city.lat,
    lon: city.lon,
    nearestCity: city.city,
    zone: city.zone,
  }
}

function coordinatesLabel(lat: number, lon: number) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(1)}°${ns}, ${Math.abs(lon).toFixed(1)}°${ew}`
}

function App() {
  const [now, setNow] = useState(() => new Date())
  const [theme, setTheme] = useState<Theme>(getTheme)
  const [selection, setSelection] = useState<GlobeSelection>(() => selectionFromCity(zones[0]))

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 250)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('zegarek-theme', theme)
  }, [theme])

  const resolveSelection = useCallback((lat: number, lon: number): GlobeSelection => {
    const nearest = nearestCity(lat, lon)
    let zone = 'Etc/UTC'

    try {
      zone = tzLookup(lat, lon)
    } catch {
      zone = 'Etc/UTC'
    }

    return {
      code: 'GPS',
      label: coordinatesLabel(lat, lon),
      lat,
      lon,
      nearestCity: nearest.city.city,
      zone,
    }
  }, [])

  const dayStats = useMemo(() => {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const elapsed = now.getTime() - start.getTime()
    const dayLength = end.getTime() - start.getTime()
    const percent = Math.min(100, Math.max(0, (elapsed / dayLength) * 100))

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
    }
  }, [now])

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Nagłówek strony">
        <a className="brand" href="/" aria-label="zegarek.tech">
          <span className="brand-mark" aria-hidden="true">
            <Sparkles size={15} strokeWidth={2.4} />
          </span>
          <span>zegarek.tech</span>
        </a>
        <p className="topbar-time">{formatTime(now)} Warszawa</p>
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

      <section className="globe-hero" aria-labelledby="main-clock-title">
        <div className="globe-copy">
          <p className="eyebrow">interaktywny czas świata</p>
          <h1 id="main-clock-title">Kliknij Ziemię</h1>
          <p className="date-line">
            Wybierz dowolny punkt na globie. Strona wyliczy jego strefę czasową
            i pokaże lokalną godzinę.
          </p>

          <div className="selected-time-panel" aria-live="polite">
            <div>
              <span>{selection.code}</span>
              <h2>{selection.label}</h2>
              <p>Najbliżej: {selection.nearestCity}</p>
            </div>
            <strong>{formatTime(now, selection.zone)}</strong>
            <small>
              {getZoneLabel(now, selection.zone)} · {formatDate(now, selection.zone)}
            </small>
          </div>
        </div>

        <div className="globe-panel is-primary">
          <WorldGlobe
            cities={zones}
            selected={selection}
            onSelect={setSelection}
            resolveSelection={resolveSelection}
          />
          <div className="globe-live-chip" aria-live="polite">
            <span>{selection.code}</span>
            <strong>{formatTime(now, selection.zone)}</strong>
            <small>{selection.label}</small>
          </div>
          <div className="globe-hint">
            <Crosshair size={17} />
            <span>Kliknij kontynent, ocean albo marker miasta</span>
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
          <p className="eyebrow">punkty startowe</p>
          <h2 id="world-times-title">Miasta</h2>
        </div>

        <div className="world-stage">
          <div className="zone-grid">
            {zones.map((item) => (
              <button
                className={`zone-card ${item.zone === selection.zone && selection.code !== 'GPS' ? 'is-active' : ''}`}
                data-zone={item.code}
                key={item.zone}
                onClick={() => setSelection(selectionFromCity(item))}
                type="button"
              >
                <div>
                  <span>{item.city}</span>
                  <em>{getZoneLabel(now, item.zone)}</em>
                </div>
                <strong>{formatTime(now, item.zone)}</strong>
                <small>
                  <MapPinned size={14} />
                  {item.code}
                </small>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
