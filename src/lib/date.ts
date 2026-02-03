import { format, toZonedTime, fromZonedTime } from 'date-fns-tz'
import { parseISO } from 'date-fns'

const ZURICH_TZ = 'Europe/Zurich'

/**
 * Takes a date string from a datetime-local input (YYYY-MM-DDTHH:mm)
 * treats it as Zurich time, and returns a UTC ISO string for DB storage.
 */
export function inputDateToZurichIso(localDateString: string): string {
  if (!localDateString) return ''
  
  // input from datetime-local is "YYYY-MM-DDTHH:mm" (no timezone info)
  // We treat this string as if it's in Zurich time
  const zurichDate = fromZonedTime(localDateString, ZURICH_TZ)
  
  return zurichDate.toISOString()
}

/**
 * Formats a DB timestamp (UTC/ISO) to a readable Zurich string.
 * e.g. "03.02.2026 14:00 (Zurich)"
 */
export function formatToZurich(isoString: string | Date, dateFormat = 'dd.MM.yyyy HH:mm'): string {
  if (!isoString) return ''
  const date = typeof isoString === 'string' ? parseISO(isoString) : isoString
  
  // Convert UTC date to Zurich Zoned Date
  const zurichDate = toZonedTime(date, ZURICH_TZ)
  
  return `${format(zurichDate, dateFormat, { timeZone: ZURICH_TZ })} (Zurich)`
}

