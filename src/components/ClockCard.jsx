import React, { memo } from 'react'
import AnalogClock from './AnalogClock.jsx'
import DigitalClock from './DigitalClock.jsx'
import { useNow } from '../hooks/useTicker.js'
import {
  getZonedParts,
  formatOffset,
  relativeToLocal,
  phaseOfDay,
  describeZone
} from '../utils/time.js'

const PHASE_ICON = { dawn: '🌅', day: '☀️', dusk: '🌆', night: '🌙' }

function ClockCard({
  zoneId,
  settings,
  localOffset,
  isPrimary,
  hasAlarm,
  onRemove,
  onPromote
}) {
  const now = useNow()
  const parts = getZonedParts(new Date(now), zoneId)
  const meta = describeZone(zoneId)
  const phase = phaseOfDay(parts.hours)

  return (
    <article className={`card phase-${phase}${isPrimary ? ' is-primary' : ''}`}>
      <header className="card-head">
        <div className="card-title">
          <h3>
            {meta.city}
            {hasAlarm && <span className="card-bell" title="Alarm set here">🔔</span>}
          </h3>
          <p className="card-sub">{meta.country}</p>
        </div>
        <div className="card-actions">
          <button
            className="icon-btn"
            title={isPrimary ? 'Already the featured clock' : 'Feature this clock'}
            aria-label={`Feature ${meta.city}`}
            disabled={isPrimary}
            onClick={() => onPromote(zoneId)}
          >
            ★
          </button>
          <button
            className="icon-btn danger"
            title="Remove city"
            aria-label={`Remove ${meta.city}`}
            onClick={() => onRemove(zoneId)}
          >
            ×
          </button>
        </div>
      </header>

      {settings.showAnalog && (
        <div className="card-face">
          <AnalogClock
            parts={parts}
            size={settings.density === 'compact' ? 108 : 138}
            smoothSweep={settings.smoothSweep}
            showSeconds={settings.showSeconds}
            showNumerals={settings.density !== 'compact'}
            accent={settings.accent}
            idSuffix={zoneId.replace(/[^a-z0-9]/gi, '')}
          />
        </div>
      )}

      <DigitalClock
        parts={parts}
        use24Hour={settings.use24Hour}
        showSeconds={settings.showSeconds}
        size={settings.density === 'compact' ? 'sm' : 'md'}
      />

      <footer className="card-foot">
        <span className="chip">{PHASE_ICON[phase]} {parts.dateLabel}</span>
        <span className="chip muted">{formatOffset(parts.offsetMinutes)}</span>
        <span className="chip muted">{relativeToLocal(parts.offsetMinutes, localOffset)}</span>
      </footer>
    </article>
  )
}

export default memo(ClockCard)
