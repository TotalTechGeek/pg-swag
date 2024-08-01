import { deleteSingle, deleteQueue, flush, insert } from './postgres.js'
export { deleteSingle, deleteQueue, flush, insert }

export const fetchAndLock = `
update $1:name
set locked_until = datetime('now', $5), locked_by = $2, attempts = attempts + 1
where id in (
  select id
  from $1:name
  where queue = $3
  and locked_until <= datetime('now')
  limit $4
)
and queue = $3 and locked_until <= datetime('now')
returning *
`

export const heartbeat = `
update $1:name
set locked_until = datetime('now', $2)
where id in ($3:csv)
and queue = $4
`

export const init = `
begin;
$2:line create schema if not exists $2:name;
create table if not exists $1:name (queue text, id text, run_at timestamptz, data jsonb, expression text, locked_until timestamptz, locked_by text, attempts int default 0);
drop index if exists idx_jobs_queue_run_at;
create index if not exists idx_jobs_queue_locked_until on $1:name (queue, locked_until);
create unique index if not exists idx_jobs_queue_id on $1:name (queue, id);
commit;
`

/**
 * @param {any} config
 * @param {any} schema
 * @returns
 */
export function connect (config, schema = null) {
  async function connect () {
    const sqlite = await import('better-sqlite3')
    const db = sqlite.default(config.file)
    return {
      query: s => db.prepare(s).all(),
      none: s => db.exec(s)
    }
  }
  const db = connect()
  return {
    query: async str => (await db).query(str),
    none: async str => (await db).none(str)
  }
}
