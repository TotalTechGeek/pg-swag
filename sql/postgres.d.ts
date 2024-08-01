/**
 * @param {any} config
 * @param {any} schema
 * @returns
 */
export function connect(config: any, schema?: any): {
    query: (str: any) => Promise<any>;
};
export const fetchAndLock: "\nset local enable_seqscan = off;\nset local enable_mergejoin = false;\nset local enable_hashjoin = false;\nset local enable_hashagg = false;\nset local statement_timeout = 15000;\nupdate $1:name\nset locked_until = now() + interval $5, locked_by = $2, attempts = attempts + 1\nwhere id in (\n  select id\n  from $1:name\n  where queue = $3\n  and locked_until <= now()\n  limit $4\n  for update skip locked\n)\nand queue = $3 and locked_until <= now()\nreturning *;\n";
export const heartbeat: "\nupdate $1:name\nset locked_until = now() + interval $2\nwhere id in ($3:csv)\nand queue = $4\n";
export const deleteSingle: "\ndelete from $1:name\nwhere queue = $2\nand id = $3\n";
export const deleteQueue: "delete from $1:name where queue = $2";
export const flush: "\nupdate $1:name\nset run_at = $2,\n  locked_until = $6,\n  locked_by = null,\n  attempts = 0\n  $5:line, expression = $5\nwhere queue = $4\nand id = $3\n";
export const init: "\nbegin;\n$2:line create schema if not exists $2:name;\ncreate table if not exists $1:name (queue text, id text, run_at timestamptz, data jsonb, expression text, locked_until timestamptz, locked_by text, attempts int default 0);\ndrop index if exists idx_jobs_queue_run_at;\ncreate index if not exists idx_jobs_queue_locked_until on $1:name (queue, locked_until);\ncreate unique index if not exists idx_jobs_queue_id on $1:name (queue, id);\ncluster $1:name using idx_jobs_queue_locked_until;\nCOMMENT ON TABLE $1:name is $3;\ncommit;\n";
export const insert: "\ninsert into $1:name (queue, id, run_at, data, expression, locked_until)\nvalues ($2, $3, $4, $5:json, $6, $4)\non conflict (queue, id) do update set data = $5:json, expression = $6\n$7:line , run_at = $4, locked_until = $4, attempts = 0";
export const vacuumTest: "vacuum (analyze) jobs";
