// @ts-check
import { parse as durationParse } from 'iso8601-duration'
import cronParser from 'cron-parser'
import { parseRelative } from './relative.js'

/**
 * Adds a duration to a date
 * @param {Date} date
 * @param {import('iso8601-duration').Duration} duration
 *
 * @test date('2020-01-01'), {days: 1} returns date('2020-01-02')
 * @test date('2020-01-01'), {months: 1} returns date('2020-02-01')
 * @test date('2020-01-01'), {seconds: 30}
 * @test date('2020-01-01'), {years: 1, months: 1, weeks: 1, days: 1, hours: 1, seconds: 30, minutes: 1 } returns date('2021-02-09T01:01:30.000Z')
 *
 * @pineapple_import
 */
export function addDuration (date, duration, multiplier = 1) {
  const newDate = new Date(date)
  if (duration.years) newDate.setFullYear(newDate.getFullYear() + duration.years * multiplier)
  if (duration.months) newDate.setMonth(newDate.getMonth() + duration.months * multiplier)
  if (duration.weeks) newDate.setDate(newDate.getDate() + duration.weeks * 7 * multiplier)
  if (duration.days) newDate.setDate(newDate.getDate() + duration.days * multiplier)
  if (duration.hours) newDate.setHours(newDate.getHours() + duration.hours * multiplier)
  if (duration.minutes) newDate.setMinutes(newDate.getMinutes() + duration.minutes * multiplier)
  if (duration.seconds) newDate.setSeconds(newDate.getSeconds() + duration.seconds * multiplier)
  return newDate
}

/**
 * Parses recurring ISO8601 durations
 * @param {string} expression
 * Supports the following formats:
 * - `Rn?/[duration]`
 * - `Rn?/[start]/[duration]`
 * - `R/[start]/[end]/[duration] (non-standard)`
 * @returns {{repeats: number, start: Date, end: Date | null, duration: import('iso8601-duration').Duration }}
 * @test null throws
 * @test '' throws
 * @test 'R/P3D'
 * @test 'R/2021-01-01T00:00:00Z/P3D'
 * @test 'R/2021-01-01T00:00:00Z/2021-01-02T00:00:00Z/P3D'
 * @test 'R3/2024-01-01/P3D'
 * @test 'R/2024-01-01/P10Y'
 * @test 'R0/P1D' returns get(@, 'repeats') === 0
 * @test 'R-1/P1D' returns get(@, 'repeats') === Infinity
 * @test 'Yeet' throws
 */
export function parseRepeatingISO (expression) {
  if (!expression) throw new Error('Needs an expression')
  if (expression.startsWith('R')) {
    const terms = expression.split('/')
    const repeatsStr = terms[0].replace('R', '')
    const repeats = repeatsStr === '0' ? 0 : Math.max(+repeatsStr, 0) || Infinity
    const start = terms.length > 2 ? new Date(terms[1]) : new Date()
    const duration = durationParse(terms[terms.length - 1])
    let end = terms.length > 3 ? new Date(terms[2]) : null

    if (!end && repeats !== Infinity) {
      end = addDuration(start, duration, repeats)
    }

    return {
      repeats,
      start,
      end,
      duration
    }
  }

  throw new Error('Unrecognized Format for ISO Duration')
}

/**
 * @param {string} expression
 */
export function * repeatingISO (expression, omitStart = true) {
  const params = parseRepeatingISO(expression)

  let start = params.start

  if (omitStart) start = addDuration(start, params.duration)
  while (!params.end || start < params.end) {
    yield start
    start = addDuration(start, params.duration)
  }
}

/**
 * @test 'R/P1D', '2024-01-01' returns date('2024-01-02')
 * @test 'R1/2024-01-01/P1D', '2024-01-01' returns date('2024-01-02')
 * @test 'R1/2024-01-01/P1D', '2024-01-02' returns null
 * @test 'R/invalid' throws
 * @param {string} expression
 * @param {string | Date} [from]
 * @param {string | Date} [after]
 * @returns {Date | null} The next time the expression will occur after the given time
 */
export function nextRepeatingISO (expression, from, after) {
  const params = parseRepeatingISO(expression)

  if (params.repeats === 0 && from) return null
  if (!from) return params.start
  if (after && !(after instanceof Date)) after = new Date(after)
  let nextTime = new Date(from)

  do {
    nextTime = addDuration(nextTime, params.duration)
    if (params.end && nextTime > params.end) return null
  }
  while (after && nextTime <= after)

  return nextTime
}

/**
 * Get the next time a cron expression will occur
 *
 * @test '0 0 *\/1 * *', '2024-01-01' returns date('2024-01-02T00:00:00Z')
 * @test '0 0 *\/1 * *' returns currentTime(@)
 * @param {string} expression
 * @param {string | Date} [from]
 * @param {string | Date} [after]
 */
export function nextCron (expression, from, after) {
  const options = {
    currentDate: from ? new Date(from) : new Date(),
    utc: true
  }

  const interval = cronParser.parseExpression(expression, options)

  if (!from) return new Date()
  if (after && !(after instanceof Date)) after = new Date(after)

  let nextTime = interval.next().toDate()
  while (after && nextTime <= after) nextTime = interval.next().toDate()

  return nextTime
}

/**
 * @test 'R5/2024-01-01/P1D'
 * @param {string} expression
 */
export function testGenerateRepeatingISO (expression) {
  return [...repeatingISO(expression)]
}

const cronRegex = /^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})$/

/**
 * Given a recurring ISO8601 Duration or a Cron Expression,
 * and a time, generate the next time the expression will occur
 *
 * ### Expression Format
 * - `Rn?/[duration]`
 * - `Rn?/[start]/[duration]`
 * - `R/[start]/[end]/[duration]` (non-standard)
 *
 * ### Cron Expression Format
 *
 * - `[second] [minute] [hour] [day of month] [month] [day of week]`
 * - `0 0 *\/1 * * (every day at midnight)`
 *
 * ### Just a Date
 * - `'2024-01-01'`
 * - `'2024-01-01T00:00:00.000Z'`
 * - `new Date('2024-01-01')`
 *
 * ### Duration
 *
 * An object that represents a duration, with the following optional properties:
 * - `years`
 * - `months`
 * - `weeks`
 * - `days`
 * - `hours`
 * - `minutes`
 * - `seconds`
 * - `recurrences` - Number of times to repeat the duration (default: Infinity)
 * - `startDate` - The start date of the duration
 * - `endDate` - The end date of the duration
 *
 * Allowing you to specify a duration like so:
 * - `{ days: 1 }`
 * - `{ hours: 1, minutes: 30 }`
 *
 * ### Special Values
 * - `'cancel'` - Cancels the expression
 * - `null` - Cancels the expression
 *
 * @param {string | Date | import('./types.d.ts').SpecialDuration} expression An ISO8601 Duration, Date, or a Cron Expression
 * @param {string | Date} [from]
 * @param {string | Date} [after] Use if you want to find the next time after a certain date
 * @returns {Date | null}
 *
 * @test 'R5/2024-01-01/P1D' returns date('2024-01-01')
 * @test 'R5/2024-01-01/P1D', '2024-01-01' returns date('2024-01-02')
 * @test 'R4/2024-01-01/P1D', '2024-01-05' returns null
 * @test 'R/2024-01-01/2025-01-01/P2M', '2024-12-01' returns null
 * @test 'R/P1D' returns currentTime(@)
 * @test '0 0 *\/1 * *' returns currentTime(@)
 * @test '0 0 *\/1 * *', '2024-01-01' returns date('2024-01-02')
 * @test 'R/P1D', '2024-01-01', '2024-04-05' returns date('2024-04-06')
 * @test '0 0 *\/1 * *', '2024-01-01', '2024-04-05' returns date('2024-04-06')
 * @test 'R/2024-01-01/2024-01-02/P1D', '2024-01-01', '2024-04-04' returns null
 * @test 'invalid' throws
 * @test 'R/invalid' throws
 * @test '2024-01-01' returns date('2024-01-01')
 * @test '2024-01-01T00:00:00.000Z' returns date('2024-01-01')
 * @test '2024-01-01', '2024-01-01' returns null
 * @test date('2024-01-01') returns date('2024-01-01')
 * @test date('2024-01-01'), '2024-01-01' returns null
 * @test 'cancel' returns null
 * @test null returns null
 * @test 'R0/P1D'
 * @test 'R0/P1M', '2024-01-01' returns null
 * @test 'R0/2024-01-01/P1D'
 * @test { days: 1 }, '2024-01-01' returns date('2024-01-02')
 * @test { days: 1 }, date() returns isCloseTo(@, addDuration(date(), { days: 1 }))
 *
 */
export function nextTime (expression, from, after) {
  if (!expression) return null
  if (typeof expression === 'object' && !(expression instanceof Date)) expression = durationToISO8601(expression)
  if (expression === 'cancel') return null
  if (expression instanceof Date || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(expression) || /^\d{4}-\d{2}-\d{2}$/.test(expression)) {
    if (from) return null
    return new Date(expression)
  }
  if (expression.startsWith('R')) return nextRepeatingISO(expression, from, after)
  if (cronRegex.test(expression)) return nextCron(expression, from, after)

  throw new Error('Unrecognized Format')
}

/**
 * This is an attempt to convert a relative time expression into an ISO8601 Duration
 * @param {string} expression
 * @param {string | Date} [from]
 *
 * "every" / "each" will be treated as an infinite number of recurrences
 * "in" / "next" will be treated as a single recurrence, assuming recurrences aren't specified in the expression.
 *
 * Currently, this format does not extract start / end dates from the expression
 *
 * This will not be worked into the main expression parser, instead, it will be exported from this module to make it
 * easier to transform relative expressions into ISO8601 durations
 *
 * @test 'every day' returns 'R/P1D'
 * @test 'every 2 days' returns 'R/P2D'
 * @test 'every 20 seconds' returns 'R/PT20S'
 * @test 'every 10 hours, 30 minutes, and 15 seconds' returns 'R/PT10H30M15S'
 * @test 'in 3 days', '2020-01-01' returns 'R0/2020-01-04T00:00:00.000Z/P0S'
 * @test 'next week', '2020-01-01' returns 'R0/2020-01-08T00:00:00.000Z/P0S'
 * @test 'every 3 days 5 times' returns 'R5/P3D'
 * @test '10s' returns 'R0/PT10S'
 * @test '30s 8 times' returns 'R8/PT30S'
 * @returns {string}
 */
export function relativeToISO8601 (expression, from) {
  let recurrences = 0

  if (from) from = new Date(from)
  const duration = parseRelative(expression)

  if (/^(each|every) /.test(expression)) recurrences = Infinity
  else if (/^(in|next) /.test(expression) && !duration.recurrences) {
    return `R0/${addDuration(from ? new Date(from) : new Date(), duration).toISOString()}/P0S`
  }

  return durationToISO8601({ recurrences, ...duration, startDate: from })
}

/**
 * Takes a duration and converts it to an ISO8601 representation
 * @param {import('./types.d.ts').SpecialDuration} duration
 *
 * @test { days: 1 } returns 'R/P1D'
 * @test { months: 1 } returns 'R/P1M'
 * @test { years: 1 } returns 'R/P1Y'
 * @test { days: 1, hours: 1, seconds: 30 } returns 'R/P1DT1H30S'
 * @test { days: 1, recurrences: 0 } returns 'R0/P1D'
 * @test { startDate: '2020-01-01' } throws
 * @test { days: 1, startDate: '2020-01-01' }
 * @test { days: 2, startDate: '2020-01-01', endDate: '2021-01-01' }
 * @test { weeks: 1 } returns 'R/P1W'
 */
export function durationToISO8601 (duration) {
  let result = 'P'

  const recurrences = typeof duration.recurrences === 'undefined' ? Infinity : duration.recurrences

  if (duration.years) result += `${duration.years}Y`
  if (duration.months) result += `${duration.months}M`
  if (duration.weeks) result += `${duration.weeks}W`
  if (duration.days) result += `${duration.days}D`

  if (duration.hours || duration.minutes || duration.seconds) result += 'T'
  if (duration.hours) result += `${duration.hours}H`
  if (duration.minutes) result += `${duration.minutes}M`
  if (duration.seconds) result += `${duration.seconds}S`

  if (result.length === 1) throw new Error('No duration found')

  if (duration.startDate && duration.endDate) result = `${new Date(duration.startDate).toISOString()}/${new Date(duration.endDate).toISOString()}/${result}`
  else if (duration.startDate) result = `${new Date(duration.startDate).toISOString()}/${result}`

  if (recurrences !== Infinity) return `R${recurrences}/${result}`
  return `R/${result}`
}
