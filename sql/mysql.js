import { deleteQueue, deleteSingle, flush } from './postgres.js'
export { deleteQueue, deleteSingle, flush }

export const fetch = `
select *, attempts + 1 as attempts
from $1:name
where queue = $3
and locked_until <= now()
limit $4
for update skip locked`

export const lock = `
update $1:name
set locked_until = ADDDATE(now(), $5:mysqlInterval), locked_by = $2, attempts = attempts + 1
where id in ($6:csv)
and queue = $3 and locked_until <= now();
`

export const heartbeat = 'update $1:name set locked_until = ADDDATE(now(), $2:mysqlInterval) where id in ($3:csv) and queue = $4'

export const init = `
begin;
$2:line create schema if not exists $2:name;
create table if not exists $1:name (queue text, id text, run_at DATETIME, data json, expression text, locked_until DATETIME, locked_by text, attempts int default 0);
create index idx_jobs_queue_locked_until on $1:name (queue(64), locked_until);
create unique index idx_jobs_queue_id on $1:name (queue(64), id(64));
commit;
`

// Todo: Optimize the time_zone setting; we shouldn't have to set it every time
export const insert = `
SET time_zone = '+00:00';
insert into $1:name (queue, id, run_at, data, expression, locked_until)
values ($2, $3, $4, $5:json, $6, $4)
on DUPLICATE KEY update data = $5:json, expression = $6
$7:line , run_at = $4, locked_until = $4, attempts = 0`

export const vacuumTest = 'optimize table jobs'

/**
 * @param {any} config
 * @param {any} schema
 * @returns
 */
export function connect (config, schema = null) {
  async function connect () {
    const mysql = await import('mysql2/promise')
    return mysql.createConnection({
      multipleStatements: true,
      ...config

    })
  }
  const db = connect()
  return {
    query: async str => {
      // console.log(str)
      return (await (await db).query(str))[0]
    }
  }
}
