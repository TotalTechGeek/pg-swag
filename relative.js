import { toSeconds } from 'iso8601-duration'

const timeLookup = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
  w: 'weeks',
  M: 'months',
  y: 'years',
  mo: 'months',
  moment: 'minutes',
  ms: 'milliseconds',
  millisecond: 'milliseconds',
  milli: 'milliseconds',
  milliseconds: 'milliseconds'
}

const timeReg = /([0-9]+)\s*([a-zA-Z]+)/g

/**
 * @param {string} expression
 * @test '1 day'
 * @test '2 days'
 * @test '1 week'
 * @test 'in 3 weeks'
 * @test '+30s'
 * @test '+30 seconds'
 * @test '30 hours 30 seconds'
 * @test '3h30s'
 * @test 'in 10 hours and 30s in about a week'
 * @test 'in an hour'
 * @test 'a week'
 * @test 'a month'
 * @test 'a Month'
 * @test 'a Hour'
 * @test 'a moment'
 * @test '5 minutes'
 * @test '10ms'
 * @test '50 milliseconds'
 */
export function parseRelative (expression) {
  expression = expression.replace(/(^| )in |\+/g, '').replace(/(^| )(a|an) /g, ' 1 ').trim()

  const matches = [...expression.matchAll(timeReg)]

  const duration = {}
  for (const match of matches) {
    const [, num, unit] = match
    const correctUnit = timeLookup[unit.toLowerCase()] || timeLookup[unit.substring(0, 2)] || timeLookup[unit[0]] || timeLookup[unit[0].toLowerCase()]
    duration[correctUnit] = (+duration[correctUnit] || 0) + +num
  }

  return duration
}

/**
 * @test '1 day' returns 86400
 * @test '50ms' returns 0.05
 * @test '1 week' returns 604800
 * @test 'in 3 weeks' returns 1814400
 * @test '+30s' returns 30
 * @param {string} expression
 */
export function parseRelativeAsSeconds (expression) {
  const duration = parseRelative(expression)
  if (duration.milliseconds) {
    duration.seconds = (duration.seconds || 0) + duration.milliseconds / 1000
    delete duration.milliseconds
  }
  return toSeconds(duration)
}
