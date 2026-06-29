import { useEffect, useMemo, useState } from 'react'
import './App.css'

const zones = [
  { city: 'Warszawa', zone: 'Europe/Warsaw' },
  { city: 'Londyn', zone: 'Europe/London' },
  { city: 'Nowy Jork', zone: 'America/New_York' },
  { city: 'Tokio', zone: 'Asia/Tokyo' },
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Warsaw',
  }).format(date)
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

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('zegarek-theme', theme)
  }, [theme])

  const hands = useMemo(() => {
    const seconds = now.getSeconds()
    const minutes = now.getMinutes() + seconds / 60
    const hours = (now.getHours() % 12) + minutes / 60

    return {
      hour: hours * 30,
      minute: minutes * 6,
      second: seconds * 6,
    }
  }, [now])

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Nagłówek strony">
        <a className="brand" href="/" aria-label="zegarek.tech">
          <span className="brand-mark" aria-hidden="true"></span>
          zegarek.tech
        </a>
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        >
          {theme === 'dark' ? 'Jasny' : 'Ciemny'}
        </button>
      </header>

      <section className="clock-hero" aria-labelledby="main-clock-title">
        <div className="time-panel">
          <p className="eyebrow">Czas lokalny</p>
          <h1 id="main-clock-title">{formatTime(now)}</h1>
          <p className="date-line">{formatDate(now)}</p>
        </div>

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
      </section>

      <section className="world-times" aria-labelledby="world-times-title">
        <div>
          <p className="eyebrow">Na szybko</p>
          <h2 id="world-times-title">Zegary światowe</h2>
        </div>
        <div className="zone-grid">
          {zones.map((item) => (
            <article className="zone-card" key={item.zone}>
              <span>{item.city}</span>
              <strong>{formatTime(now, item.zone)}</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
