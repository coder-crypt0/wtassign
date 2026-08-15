import React, { useCallback, useEffect, useMemo, useState } from 'react'
import HeroClock from './components/HeroClock.jsx'
import ClockCard from './components/ClockCard.jsx'
import ZonePicker from './components/ZonePicker.jsx'
import AlarmPanel from './components/AlarmPanel.jsx'
import AlarmToast from './components/AlarmToast.jsx'
import ControlBar from './components/ControlBar.jsx'
import { useNowSecond, useTickerControls, usePersistentState } from './hooks/useTicker.js'
import { useAlarms } from './hooks/useAlarms.js'
import { getZonedParts, describeZone, canonicalZone, LOCAL_ZONE } from './utils/time.js'

const DEFAULT_ZONES = [
  LOCAL_ZONE,
  'America/New_York',
  'Europe/London',
  'Asia/Tokyo',
  'Australia/Sydney'
].filter((z, i, a) => a.indexOf(z) === i)

const DEFAULT_SETTINGS = {
  use24Hour: false,
  showSeconds: true,
  showAnalog: true,
  smoothSweep: true,
  density: 'comfortable',
  accent: '#5eead4',
  muted: false,
  paused: false
}

/** Rolling frames-per-second readout for the performance strip. */
function useFps() {
  const [fps, setFps] = useState(60)
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf
    const loop = (t) => {
      frames++
      if (t - last >= 1000) {
        setFps(Math.round((frames * 1000) / (t - last)))
        frames = 0
        last = t
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return fps
}

export default function App() {
  const [zones, setZones] = usePersistentState('chronosphere.zones', DEFAULT_ZONES)
  const [primary, setPrimary] = usePersistentState('chronosphere.primary', DEFAULT_ZONES[0])
  const [settings, setSettings] = usePersistentState('chronosphere.settings', DEFAULT_SETTINGS)

  const now = useNowSecond()
  const fps = useFps()

  useTickerControls({ paused: settings.paused, smoothSweep: settings.smoothSweep })

  const { alarms, ringing, addAlarm, removeAlarm, toggleAlarm, dismiss, snooze } =
    useAlarms(now, { muted: settings.muted })

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', settings.accent)
  }, [settings.accent])

  const update = useCallback(
    (patch) => setSettings((s) => ({ ...s, ...patch })),
    [setSettings]
  )

  const addZone = useCallback(
    (id) => setZones((list) => (list.includes(id) ? list : [...list, id])),
    [setZones]
  )

  const removeZone = useCallback(
    (id) =>
      setZones((list) => {
        const next = list.filter((z) => z !== id)
        return next.length ? next : list // never empty the board
      }),
    [setZones]
  )

  // Boards saved before the alias table existed may hold deprecated zone ids.
  useEffect(() => {
    setZones((list) => {
      const next = [...new Set(list.map(canonicalZone))]
      return next.length === list.length && next.every((z, i) => z === list[i]) ? list : next
    })
    setPrimary((p) => canonicalZone(p))
  }, [setZones, setPrimary])

  // Keep the featured clock pointing at a city that is still on the board.
  useEffect(() => {
    if (!zones.includes(primary)) setPrimary(zones[0])
  }, [zones, primary, setPrimary])

  const localOffset = useMemo(
    () => getZonedParts(new Date(now), LOCAL_ZONE).offsetMinutes,
    [now]
  )

  const alarmZones = useMemo(
    () => new Set(alarms.filter((a) => a.enabled).map((a) => a.zone)),
    [alarms]
  )

  // Sort west-to-east so the board reads like a strip map of the world.
  const orderedZones = useMemo(() => {
    const withOffset = zones.map((z) => ({
      z,
      off: getZonedParts(new Date(now), z).offsetMinutes
    }))
    withOffset.sort((a, b) => a.off - b.off)
    return withOffset.map((x) => x.z)
    // Offsets only change at DST boundaries; recomputing per minute is plenty.
  }, [zones, Math.floor(now / 60000)]) // eslint-disable-line react-hooks/exhaustive-deps

  const activePrimary = zones.includes(primary) ? primary : zones[0]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>Chronosphere</h1>
            <p>Real-time world clock dashboard</p>
          </div>
        </div>
        <div className="status">
          <span className="stat">
            <em>{zones.length}</em> cities
          </span>
          <span className="stat">
            <em>{alarms.filter((a) => a.enabled).length}</em> alarms
          </span>
          <span className="stat">
            <em>{fps}</em> fps
          </span>
          <span className={`stat live${settings.paused ? ' is-paused' : ''}`}>
            <i /> {settings.paused ? 'Paused' : 'Live'}
          </span>
        </div>
      </header>

      <ControlBar settings={settings} update={update} />

      <main className="layout">
        <div className="main-col">
          <HeroClock zoneId={activePrimary} settings={settings} />

          <section className="board" aria-label="World clocks">
            <div className="section-head">
              <h2>World board</h2>
              <span className="badge">sorted west → east</span>
            </div>
            <div className={`grid density-${settings.density}`}>
              {orderedZones.map((z) => (
                <ClockCard
                  key={z}
                  zoneId={z}
                  settings={settings}
                  localOffset={localOffset}
                  isPrimary={z === activePrimary}
                  hasAlarm={alarmZones.has(z)}
                  onRemove={removeZone}
                  onPromote={setPrimary}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="side-col">
          <ZonePicker selected={zones} onAdd={addZone} />
          <AlarmPanel
            zones={orderedZones}
            alarms={alarms}
            now={now}
            onAdd={addAlarm}
            onRemove={removeAlarm}
            onToggle={toggleAlarm}
          />
        </aside>
      </main>

      <footer className="footer">
        <span>Local zone: {describeZone(LOCAL_ZONE).city} ({LOCAL_ZONE})</span>
        <span>One rAF ticker · {zones.length} synchronised faces</span>
      </footer>

      <AlarmToast alarm={ringing} onDismiss={dismiss} onSnooze={snooze} />
    </div>
  )
}
