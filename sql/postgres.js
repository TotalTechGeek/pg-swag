export const fetchAndLock = `
set local enable_seqscan = off;
set local enable_mergejoin = false;
set local enable_hashjoin = false;
set local enable_hashagg = false;
set local statement_timeout = 15000;
update $1:name
set locked_until = now() + interval $5, locked_by = $2, attempts = attempts + 1
where id in (
  select id
  from $1:name
  where queue = $3
  and locked_until <= now()
  limit $4
  for update skip locked
)
and queue = $3 and locked_until <= now()
returning *;
`

export const heartbeat = `
update $1:name
set locked_until = now() + interval $2
where id in ($3:csv)
and queue = $4
`

export const deleteSingle = `
delete from $1:name
where queue = $2
and id = $3
`

export const deleteQueue = 'delete from $1:name where queue = $2'

export const flush = `
update $1:name
set run_at = $2,
  locked_until = $6,
  locked_by = null,
  attempts = 0
  $5:line, expression = $5
where queue = $4
and id = $3
`

export const init = `
begin;
$2:line create schema if not exists $2:name;
create table if not exists $1:name (queue text, id text, run_at timestamptz, data jsonb, expression text, locked_until timestamptz, locked_by text, attempts int default 0);
drop index if exists idx_jobs_queue_run_at;
create index if not exists idx_jobs_queue_locked_until on $1:name (queue, locked_until);
create unique index if not exists idx_jobs_queue_id on $1:name (queue, id);
cluster $1:name using idx_jobs_queue_locked_until;
COMMENT ON TABLE $1:name is $3;
commit;
`

export const insert = `
insert into $1:name (queue, id, run_at, data, expression, locked_until)
values ($2, $3, $4, $5:json, $6, $4)
on conflict (queue, id) do update set data = $5:json, expression = $6
$7:line , run_at = $4, locked_until = $4, attempts = 0`
