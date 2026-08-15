import React, { memo } from 'react'
import { formatDigital } from '../utils/time.js'

function DigitalClock({ parts, use24Hour, showSeconds, size = 'md', blinkColon = true }) {
  const t = formatDigital(parts, use24Hour, showSeconds)
  const colonOff = blinkColon && parts.seconds % 2 === 1

  return (
    <div className={`digital digital-${size}`}>
      <span className="digital-unit">{t.hours}</span>
      <span className={`digital-colon${colonOff ? ' is-dim' : ''}`}>:</span>
      <span className="digital-unit">{t.minutes}</span>
      {t.seconds !== null && (
        <>
          <span className={`digital-colon${colonOff ? ' is-dim' : ''}`}>:</span>
          <span className="digital-unit digital-seconds">{t.seconds}</span>
        </>
      )}
      {t.suffix && <span className="digital-suffix">{t.suffix}</span>}
    </div>
  )
}

export default memo(DigitalClock)
