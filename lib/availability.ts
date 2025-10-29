import { format, parse, addMinutes, isWithinInterval, isSameDay, startOfDay, endOfDay } from "date-fns"
import { toZonedTime, fromZonedTime } from "date-fns-tz"
import { CoachAvailRule, CoachTimeOff, Reservation } from "@prisma/client"

const KST_TIMEZONE = "Asia/Seoul"
const OPERATION_START = 9 * 60 // 09:00 in minutes
const OPERATION_END = 22 * 60  // 22:00 in minutes
const SLOT_STEP = 30 // 30 minutes

export interface TimeRange {
  start: Date
  end: Date
}

export interface AvailabilityResponse {
  date: string
  slotStepMinutes: number
  availableRanges: {
    start: string
    end: string
  }[]
}

export function calculateAvailability(
  date: Date,
  coachAvailRules: CoachAvailRule[],
  coachTimeOffs: CoachTimeOff[],
  existingReservations: Reservation[]
): AvailabilityResponse {
  const kstDate = toZonedTime(date, KST_TIMEZONE)
  const weekday = kstDate.getDay()

  // Get the rule for this weekday
  const dayRule = coachAvailRules.find(rule => rule.weekday === weekday)

  if (!dayRule) {
    return {
      date: format(kstDate, "yyyy-MM-dd"),
      slotStepMinutes: SLOT_STEP,
      availableRanges: []
    }
  }

  // Convert time-only fields to full dates in KST
  const ruleStartMinutes = dayRule.startTime.getHours() * 60 + dayRule.startTime.getMinutes()
  const ruleEndMinutes = dayRule.endTime.getHours() * 60 + dayRule.endTime.getMinutes()

  // Apply operation hours constraint
  const startMinutes = Math.max(ruleStartMinutes, OPERATION_START)
  const endMinutes = Math.min(ruleEndMinutes, OPERATION_END)

  if (startMinutes >= endMinutes) {
    return {
      date: format(kstDate, "yyyy-MM-dd"),
      slotStepMinutes: SLOT_STEP,
      availableRanges: []
    }
  }

  // Create available ranges for the day
  const dayStart = startOfDay(kstDate)
  const availableStart = addMinutes(dayStart, startMinutes)
  const availableEnd = addMinutes(dayStart, endMinutes)

  let availableRanges: TimeRange[] = [{
    start: availableStart,
    end: availableEnd
  }]

  // Remove time-off periods
  for (const timeOff of coachTimeOffs) {
    const timeOffStart = toZonedTime(timeOff.startAt, KST_TIMEZONE)
    const timeOffEnd = toZonedTime(timeOff.endAt, KST_TIMEZONE)

    availableRanges = subtractTimeRanges(availableRanges, {
      start: timeOffStart,
      end: timeOffEnd
    })
  }

  // Remove existing reservations
  const activeReservations = existingReservations.filter(r =>
    ["PENDING", "CONFIRMED", "ATTENDED", "HOLIDAY"].includes(r.status)
  )

  for (const reservation of activeReservations) {
    const resStart = toZonedTime(reservation.startAt, KST_TIMEZONE)
    const resEnd = toZonedTime(reservation.endAt, KST_TIMEZONE)

    availableRanges = subtractTimeRanges(availableRanges, {
      start: resStart,
      end: resEnd
    })
  }

  // Convert to ISO strings
  const result: AvailabilityResponse = {
    date: format(kstDate, "yyyy-MM-dd"),
    slotStepMinutes: SLOT_STEP,
    availableRanges: availableRanges.map(range => ({
      start: fromZonedTime(range.start, KST_TIMEZONE).toISOString(),
      end: fromZonedTime(range.end, KST_TIMEZONE).toISOString()
    }))
  }

  return result
}

function subtractTimeRanges(ranges: TimeRange[], toRemove: TimeRange): TimeRange[] {
  const result: TimeRange[] = []

  for (const range of ranges) {
    // No overlap
    if (range.end <= toRemove.start || range.start >= toRemove.end) {
      result.push(range)
      continue
    }

    // Partial overlap - split the range
    if (range.start < toRemove.start) {
      result.push({
        start: range.start,
        end: toRemove.start
      })
    }

    if (range.end > toRemove.end) {
      result.push({
        start: toRemove.end,
        end: range.end
      })
    }
  }

  return result
}