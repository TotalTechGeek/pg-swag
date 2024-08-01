/**
 * @param {any} config
 * @param {any} schema
 * @returns
 */
export function connect(config: any, schema?: any): {
    query: (str: any) => Promise<any>;
    none: (str: any) => Promise<any>;
};
export const fetchAndLock: "\nupdate $1:name\nset locked_until = datetime('now', $5), locked_by = $2, attempts = attempts + 1\nwhere id in (\n  select id\n  from $1:name\n  where queue = $3\n  and locked_until <= datetime('now')\n  limit $4\n)\nand queue = $3 and locked_until <= datetime('now')\nreturning *\n";
export const heartbeat: "\nupdate $1:name\nset locked_until = datetime('now', $2)\nwhere id in ($3:csv)\nand queue = $4\n";
export const init: "\nbegin;\n$2:line create schema if not exists $2:name;\ncreate table if not exists $1:name (queue text, id text, run_at timestamptz, data jsonb, expression text, locked_until timestamptz, locked_by text, attempts int default 0);\ndrop index if exists idx_jobs_queue_run_at;\ncreate index if not exists idx_jobs_queue_locked_until on $1:name (queue, locked_until);\ncreate unique index if not exists idx_jobs_queue_id on $1:name (queue, id);\ncommit;\n";
export const vacuumTest: "";
import { deleteSingle } from './postgres.js';
import { deleteQueue } from './postgres.js';
import { flush } from './postgres.js';
import { insert } from './postgres.js';
export { deleteSingle, deleteQueue, flush, insert };
