import sqlString from 'sqlstring'
import { parseRelative } from './relative.js'
import { toSeconds } from 'iso8601-duration'

/**
 * Sanitizes SQL strings by replacing $1, $2, $3, etc with the corresponding parameter
 *
 * @param {string} key
 * @param {Record<string,any>} params
 * @param {string} dialect
 */
function replace (key, params, dialect) {
  if (!Array.isArray(params)) throw new Error('Params was not an array')
  if (key === 'data') return ''

  // check for a :csv or :name or something
  let modifier = (key.match(/:(\w+)/) || '')[1]
  if (modifier === 'list') modifier = 'csv'

  // Extract out the parameter index
  key = key.replace(/:\w+/, '')
  key = key.substring(1)
  key = +key - 1

  if (!Number.isInteger(key)) throw new Error('Invalid param index')
  if (Array.isArray(params[key]) && modifier !== 'csv') throw new Error('Param is an array, use :csv to format it')
  if (modifier === 'name') return TableName(params[key], dialect === 'mysql' ? '`' : '"')

  if (params[key] instanceof Date) {
    let dateStr = params[key].toISOString()
    if (dialect === 'sqlite') dateStr = dateStr.replace('T', ' ').replace('Z', '')
    if (dialect === 'mysql') dateStr = dateStr.replace('T', ' ').replace('Z', '+00:00')
    return sqlString.escape(dateStr)
  }

  if (params[key] && typeof params[key] === 'object' && !Array.isArray(params[key])) {
    if (modifier !== 'json') throw new Error('Invalid object, use :json to stringify it.')
    return sqlString.escape(JSON.stringify(params[key])).replace(/\\"/g, '"')
  }

  if (modifier === 'mysqlInterval') {
    const duration = parseRelative(params[key])
    // makes a best effort to use months
    if (duration.months && Object.keys(duration).length === 1) return 'INTERVAL ' + duration.months + ' MONTH'
    const seconds = toSeconds(duration)
    return 'INTERVAL ' + seconds + ' SECOND'
  }

  return sqlString.escape(params[key])
}

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
export function format (sql, params, dialect) {
  const lineRemoval = /\$[0-9]+:line(.*)/g
  sql = sql.replace(lineRemoval, (match, k) => {
    const key = match.match(/\$[0-9]+/)[0]
    const index = +key.substring(1)
    if (!params[index - 1]) return ''
    return k
  })
  return sql.replace(/\$([0-9]+)(:\w+)?/g, (match, key) => replace(match, params, dialect))
}

/**
 * Generates a table name string that is safe to use in SQL queries
 *
 * @test 'jobs'
 * @test 'jobs', '`'
 * @test { name: 'jobs', schema: 'public' }
 * @test { table: 'jobs' }
 * @test {} throws
 */
export function TableName (table, char = '"') {
  let schema = null
  if (typeof table !== 'string') {
    const tbl = table
    if (tbl.name) table = tbl.name
    else if (tbl.table) table = tbl.table
    else throw new Error('Invalid table name')
    schema = tbl.schema
  }

  if (/"|`|'/.test(table)) throw new Error('Invalid table name, if you hit this, please explain to me why this is necessary.')
  if (schema) return (sqlString.escapeId(schema) + '.' + sqlString.escapeId(table)).replace(/`/g, char)
  return (sqlString.escapeId(table)).replace(/`/g, char)
}
