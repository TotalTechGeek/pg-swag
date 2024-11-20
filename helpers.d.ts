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
export function addDuration(date: Date, duration: import("iso8601-duration").Duration, multiplier?: number): Date;
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
export function parseRepeatingISO(expression: string): {
    repeats: number;
    start: Date;
    end: Date | null;
    duration: import("iso8601-duration").Duration;
};
/**
 * @param {string} expression
 */
export function repeatingISO(expression: string, omitStart?: boolean): Generator<Date, void, unknown>;
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
export function nextRepeatingISO(expression: string, from?: string | Date, after?: string | Date): Date | null;
/**
 * Get the next time a cron expression will occur
 *
 * @test '0 0 *\/1 * *', '2024-01-01' returns date('2024-01-02T00:00:00Z')
 * @test '0 0 *\/1 * *' returns currentTime(@)
 * @param {string} expression
 * @param {string | Date} [from]
 * @param {string | Date} [after]
 */
export function nextCron(expression: string, from?: string | Date, after?: string | Date): Date;
/**
 * @test 'R5/2024-01-01/P1D'
 * @param {string} expression
 */
export function testGenerateRepeatingISO(expression: string): Date[];
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
export function nextTime(expression: string | Date | any, from?: string | Date, after?: string | Date): Date | null;
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
export function relativeToISO8601(expression: string, from?: string | Date): string;
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
export function durationToISO8601(duration: any): string;
