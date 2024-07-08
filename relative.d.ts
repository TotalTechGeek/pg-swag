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
 * @test '10ms'
 * @test '50 milliseconds'
 */
export function parseRelative(expression: string): {};
/**
 * @test '1 day' returns 86400
 * @test '50ms' returns 0.05
 * @test '1 week' returns 604800
 * @test 'in 3 weeks' returns 1814400
 * @test '+30s' returns 30
 * @param {string} expression
 */
export function parseRelativeAsSeconds(expression: string): number;
