import React from 'react'
import { describeZone } from '../utils/time.js'

/** Modal shown while an alarm is sounding. */
export default function AlarmToast({ alarm, onDismiss, onSnooze }) {
  if (!alarm) return null
  return (
    <div className="overlay" role="alertdialog" aria-modal="true" aria-label="Alarm">
      <div className="alarm-modal">
        <div className="alarm-bell" aria-hidden="true">🔔</div>
        <p className="alarm-modal-time">{alarm.time}</p>
        <h2>{alarm.label}</h2>
        <p className="alarm-modal-zone">{describeZone(alarm.zone).city} · {alarm.zone}</p>
        <div className="alarm-modal-actions">
          <button className="btn" onClick={() => onSnooze(5)}>Snooze 5 min</button>
          <button className="btn primary" onClick={onDismiss} autoFocus>Dismiss</button>
        </div>
      </div>
    </div>
  )
}
