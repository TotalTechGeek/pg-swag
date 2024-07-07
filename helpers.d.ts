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
export function parseRepeatingISO (expression: string): {
  repeats: number
  start: Date
  end: Date | null
  duration: number
}
/**
 * @param {string} expression
 */
export function repeatingISO (expression: string, omitStart?: boolean): Generator<Date, void, unknown>
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
export function nextRepeatingISO (expression: string, from?: string | Date, after?: string | Date): Date | null
/**
 * Get the next time a cron expression will occur
 *
 * @test '0 0 *\/1 * *', '2024-01-01' returns date('2024-01-02T00:00:00Z')
 * @test '0 0 *\/1 * *' returns currentTime(@)
 * @param {string} expression
 * @param {string | Date} [from]
 * @param {string | Date} [after]
 */
export function nextCron (expression: string, from?: string | Date, after?: string | Date): any
/**
 * @test 'R5/2024-01-01/P1D'
 * @param {string} expression
 */
export function testGenerateRepeatingISO (expression: string): Date[]
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
export function nextTime (expression: string | Date, from?: string | Date, after?: string | Date): Date | null
