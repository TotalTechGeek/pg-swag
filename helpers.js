// @ts-check
import { parse as durationParse, toSeconds } from 'iso8601-duration'
import cronParser from 'cron-parser'

/**
 * Parses recurring ISO8601 durations
 * @param {string} expression
 * Supports the following formats:
 * - `Rn?/[duration]`
 * - `Rn?/[start]/[duration]`
 * - `R/[start]/[end]/[duration] (non-standard)`
 * @returns {{repeats: number, start: Date, end: Date | null, duration: number}}
 * @test null throws
 * @test '' throws
 * @test 'R/P3D'
 * @test 'R/2021-01-01T00:00:00Z/P3D'
 * @test 'R/2021-01-01T00:00:00Z/2021-01-02T00:00:00Z/P3D'
 * @test 'R3/2024-01-01/P3D'
 * @test 'R/2024-01-01/P10Y'
 * @test 'R0/P1D' returns get(@, 'repeats') === 0
 * @test 'R-1/P1D' returns get(@, 'repeats') === Infinity
 */
export function parseRepeatingISO (expression) {
  if (!expression) throw new Error('Needs an expression')
  if (expression.startsWith('R')) {
    const terms = expression.split('/')
    const repeatsStr = terms[0].replace('R', '')
    const repeats = repeatsStr === '0' ? 0 : Math.max(+repeatsStr, 0) || Infinity
    const start = terms.length > 2 ? new Date(terms[1]) : new Date()
    const duration = toSeconds(durationParse(terms[terms.length - 1]))
    let end = terms.length > 3 ? new Date(terms[2]) : null

    if (!end && repeats !== Infinity) {
      end = new Date(start)
      end.setSeconds(start.getSeconds() + duration * repeats)
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

  if (omitStart) start = new Date(start.getTime() + params.duration * 1000)
  while (!params.end || start < params.end) {
    yield start
    start = new Date(start.getTime() + params.duration * 1000)
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

  if (!from) return params.start
  if (after && !(after instanceof Date)) after = new Date(after)
  let nextTime = new Date(from)

  do {
    nextTime = new Date(nextTime.getTime() + params.duration * 1000)
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
 *
 * @param {string | Date} expression An ISO8601 Duration, Date, or a Cron Expression
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
 * @test 'R0/2024-01-01/P1D'
 */
export function nextTime (expression, from, after) {
  if (!expression) return null
  if (expression === 'cancel') return null
  if (expression instanceof Date || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(expression) || /^\d{4}-\d{2}-\d{2}$/.test(expression)) {
    if (from) return null
    return new Date(expression)
  }
  if (expression.startsWith('R')) return nextRepeatingISO(expression, from, after)
  return nextCron(expression, from, after)
}
