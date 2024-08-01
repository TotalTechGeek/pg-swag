/**
 * @test "select * from jobs where id in ($1:csv)", [1]
 * @test 'select * from $1:name', ['jobs']
 * @test 'select * from jobs where id in ($1:csv)', [[1, 2, 3]]
 * @test '$1:line select 1\n select 2', [true]
 * @test '$1:line select 1\n select 2', [false]
 *
 * Note that this function is a simple implementation, and will break with test cases where '$1' is embedded in a string.
 * Which is an inaccuracy
 *
 * :line will remove the line if the param is not truthy
 * :csv will format an array param into a csv, like '1', '2', '3'
 * :name will format a table name
 *
 * @param {string | string[]} name
 * @param {Record<string,any>} params
 * @param {string} dialect
 */
export function format(sql: any, params: Record<string, any>, dialect: string): any;
/**
 * Generates a table name string that is safe to use in SQL queries
 *
 * @test 'jobs'
 * @test 'jobs', '`'
 * @test { name: 'jobs', schema: 'public' }
 * @test { table: 'jobs' }
 * @test {} throws
 */
export function TableName(table: any, char?: string): any;
