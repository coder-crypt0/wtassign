// Time-zone helpers built on Intl. Formatters are expensive to construct, so
// every one we build is cached and reused for the lifetime of the page.

const partsCache = new Map()
const labelCache = new Map()

function partsFormatter(timeZone) {
  let f = partsCache.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short'
    })
    partsCache.set(timeZone, f)
  }
  return f
}

function labelFormatter(timeZone) {
  let f = labelCache.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    })
    labelCache.set(timeZone, f)
  }
  return f
}

/**
 * Break a Date down into the wall-clock fields of a given IANA time zone.
 * Returns hours/minutes/seconds plus the millisecond remainder (which is
 * zone-independent) so hands can sweep smoothly.
 */
export function getZonedParts(date, timeZone) {
  const parts = partsFormatter(timeZone).formatToParts(date)
  const bag = {}
  for (const p of parts) if (p.type !== 'literal') bag[p.type] = p.value

  const hours = Number(bag.hour) % 24
  const minutes = Number(bag.minute)
  const seconds = Number(bag.second)
  const ms = date.getMilliseconds()

  // Reading the zone's wall clock as if it were UTC and diffing against the
  // real instant gives the zone's current offset, DST included.
  const asUTC = Date.UTC(
    Number(bag.year),
    Number(bag.month) - 1,
    Number(bag.day),
    hours,
    minutes,
    seconds
  )
  const offsetMinutes = Math.round((asUTC - date.getTime() - ms) / 60000)

  return {
    hours,
    minutes,
    seconds,
    ms,
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    weekday: bag.weekday,
    offsetMinutes,
    dateLabel: labelFormatter(timeZone).format(date)
  }
}

export function formatOffset(offsetMinutes) {
  const sign = offsetMinutes < 0 ? '-' : '+'
  const abs = Math.abs(offsetMinutes)
  const h = String(Math.floor(abs / 60)).padStart(2, '0')
  const m = String(abs % 60).padStart(2, '0')
  return `UTC${sign}${h}:${m}`
}

export function pad(n) {
  return String(n).padStart(2, '0')
}

/** Split the clock into the pieces the digital readout needs. */
export function formatDigital(parts, use24Hour, showSeconds) {
  let h = parts.hours
  let suffix = ''
  if (!use24Hour) {
    suffix = h >= 12 ? 'PM' : 'AM'
    h = h % 12 === 0 ? 12 : h % 12
  }
  return {
    hours: use24Hour ? pad(h) : String(h),
    minutes: pad(parts.minutes),
    seconds: showSeconds ? pad(parts.seconds) : null,
    suffix
  }
}

/** Difference in whole/fractional hours between a zone and the local zone. */
export function relativeToLocal(offsetMinutes, localOffsetMinutes) {
  const diff = (offsetMinutes - localOffsetMinutes) / 60
  if (diff === 0) return 'Same as local'
  const sign = diff > 0 ? '+' : '-'
  const abs = Math.abs(diff)
  const text = Number.isInteger(abs) ? abs : abs.toFixed(1)
  return `${sign}${text} h vs local`
}

/** Crude day/night banding used to tint the cards. */
export function phaseOfDay(hours) {
  if (hours < 5) return 'night'
  if (hours < 8) return 'dawn'
  if (hours < 17) return 'day'
  if (hours < 20) return 'dusk'
  return 'night'
}

// Some platforms still report deprecated zone names; fold them onto the
// canonical id so the local clock matches an entry in the catalog.
const ZONE_ALIASES = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Europe/Kiev': 'Europe/Kyiv',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'Etc/UTC': 'UTC',
  'Etc/GMT': 'UTC'
}

export function canonicalZone(id) {
  return ZONE_ALIASES[id] || id
}

export const LOCAL_ZONE = canonicalZone(
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
)

// A curated set is friendlier than the ~600 entry IANA list, and it keeps the
// picker usable on a phone.
export const ZONE_CATALOG = [
  { id: 'Pacific/Honolulu', city: 'Honolulu', country: 'United States' },
  { id: 'America/Anchorage', city: 'Anchorage', country: 'United States' },
  { id: 'America/Los_Angeles', city: 'Los Angeles', country: 'United States' },
  { id: 'America/Denver', city: 'Denver', country: 'United States' },
  { id: 'America/Chicago', city: 'Chicago', country: 'United States' },
  { id: 'America/New_York', city: 'New York', country: 'United States' },
  { id: 'America/Toronto', city: 'Toronto', country: 'Canada' },
  { id: 'America/Mexico_City', city: 'Mexico City', country: 'Mexico' },
  { id: 'America/Bogota', city: 'Bogotá', country: 'Colombia' },
  { id: 'America/Sao_Paulo', city: 'São Paulo', country: 'Brazil' },
  { id: 'America/Argentina/Buenos_Aires', city: 'Buenos Aires', country: 'Argentina' },
  { id: 'Atlantic/Reykjavik', city: 'Reykjavík', country: 'Iceland' },
  { id: 'Europe/London', city: 'London', country: 'United Kingdom' },
  { id: 'Europe/Dublin', city: 'Dublin', country: 'Ireland' },
  { id: 'Europe/Lisbon', city: 'Lisbon', country: 'Portugal' },
  { id: 'Europe/Madrid', city: 'Madrid', country: 'Spain' },
  { id: 'Europe/Paris', city: 'Paris', country: 'France' },
  { id: 'Europe/Berlin', city: 'Berlin', country: 'Germany' },
  { id: 'Europe/Amsterdam', city: 'Amsterdam', country: 'Netherlands' },
  { id: 'Europe/Zurich', city: 'Zürich', country: 'Switzerland' },
  { id: 'Europe/Rome', city: 'Rome', country: 'Italy' },
  { id: 'Europe/Stockholm', city: 'Stockholm', country: 'Sweden' },
  { id: 'Europe/Athens', city: 'Athens', country: 'Greece' },
  { id: 'Europe/Istanbul', city: 'Istanbul', country: 'Türkiye' },
  { id: 'Europe/Moscow', city: 'Moscow', country: 'Russia' },
  { id: 'Africa/Lagos', city: 'Lagos', country: 'Nigeria' },
  { id: 'Africa/Cairo', city: 'Cairo', country: 'Egypt' },
  { id: 'Africa/Nairobi', city: 'Nairobi', country: 'Kenya' },
  { id: 'Africa/Johannesburg', city: 'Johannesburg', country: 'South Africa' },
  { id: 'Asia/Jerusalem', city: 'Jerusalem', country: 'Israel' },
  { id: 'Asia/Dubai', city: 'Dubai', country: 'UAE' },
  { id: 'Asia/Karachi', city: 'Karachi', country: 'Pakistan' },
  { id: 'Asia/Kolkata', city: 'Mumbai', country: 'India' },
  { id: 'Asia/Kathmandu', city: 'Kathmandu', country: 'Nepal' },
  { id: 'Asia/Dhaka', city: 'Dhaka', country: 'Bangladesh' },
  { id: 'Asia/Bangkok', city: 'Bangkok', country: 'Thailand' },
  { id: 'Asia/Jakarta', city: 'Jakarta', country: 'Indonesia' },
  { id: 'Asia/Singapore', city: 'Singapore', country: 'Singapore' },
  { id: 'Asia/Hong_Kong', city: 'Hong Kong', country: 'China' },
  { id: 'Asia/Shanghai', city: 'Shanghai', country: 'China' },
  { id: 'Asia/Seoul', city: 'Seoul', country: 'South Korea' },
  { id: 'Asia/Tokyo', city: 'Tokyo', country: 'Japan' },
  { id: 'Australia/Perth', city: 'Perth', country: 'Australia' },
  { id: 'Australia/Adelaide', city: 'Adelaide', country: 'Australia' },
  { id: 'Australia/Sydney', city: 'Sydney', country: 'Australia' },
  { id: 'Pacific/Auckland', city: 'Auckland', country: 'New Zealand' },
  { id: 'UTC', city: 'UTC', country: 'Coordinated Universal Time' }
]

const CATALOG_INDEX = new Map(ZONE_CATALOG.map((z) => [z.id, z]))

export function describeZone(id) {
  const known = CATALOG_INDEX.get(id)
  if (known) return known
  const tail = id.split('/').pop().replace(/_/g, ' ')
  return { id, city: tail, country: id.split('/')[0].replace(/_/g, ' ') }
}
