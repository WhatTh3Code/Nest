import { createEvent, DateArray, EventAttributes } from 'ics'
import type { CalendarEvent } from 'types/calendar'

export default function getIcsFileUrl(event: CalendarEvent): Promise<string> {
  return new Promise((resolve, reject) => {
    if (globalThis.window === undefined) {
      reject(new Error('Window not defined (server-side generation not supported)'))
      return
    }
    const parseDate = (date: string): DateArray => {
      const d = new Date(date)
      return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]
    }

    // Event end dates are inclusive (the last day of the event), but an all-day
    // iCalendar DTEND is exclusive (RFC 5545 §3.6.1), so always move it to the next day.
    const getExclusiveEndDate = (inclusiveEnd: DateArray): DateArray => {
      const [y, m, d] = inclusiveEnd
      const nextDay = new Date(Date.UTC(y, m - 1, d + 1))
      return [nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate()]
    }

    const startArray = parseDate(event.startDate)
    const inclusiveEndArray = parseDate(event.endDate ?? event.startDate)
    const finalEndArray = getExclusiveEndDate(inclusiveEndArray)

    const eventAttributes: EventAttributes = {
      start: startArray,
      end: finalEndArray,
      title: event.title,
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      ...(event.description && { description: event.description }),
      ...(event.location && { location: event.location }),
      ...(event.url && { url: event.url }),
    }

    createEvent(eventAttributes, (error, value) => {
      if (error) {
        reject(error)
        return
      }

      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
      resolve(globalThis.URL.createObjectURL(blob))
    })
  })
}