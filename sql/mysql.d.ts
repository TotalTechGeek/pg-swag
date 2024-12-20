/**
 * @param {any} config
 * @param {any} schema
 * @returns
 */
export function connect(config: any, schema?: any): {
    query: (str: any) => Promise<import("mysql2/promise").QueryResult>;
};
export const fetch: "\nselect *, attempts + 1 as attempts\nfrom $1:name\nwhere queue = $3\nand locked_until <= now()\nlimit $4\nfor update skip locked";
export const lock: "\nupdate $1:name\nset locked_until = ADDDATE(now(), $5:mysqlInterval), locked_by = $2, attempts = attempts + 1\nwhere id in ($6:csv)\nand queue = $3 and locked_until <= now();\n";
export const heartbeat: "update $1:name set locked_until = ADDDATE(now(), $2:mysqlInterval) where id in ($3:csv) and queue = $4";
export const init: "\nbegin;\n$2:line create schema if not exists $2:name;\ncreate table if not exists $1:name (queue text, id text, run_at DATETIME, data json, expression text, locked_until DATETIME, locked_by text, attempts int default 0);\ncreate index idx_jobs_queue_locked_until on $1:name (queue(64), locked_until);\ncreate unique index idx_jobs_queue_id on $1:name (queue(64), id(64));\ncommit;\n";
export const insert: "\nSET time_zone = '+00:00';\ninsert into $1:name (queue, id, run_at, data, expression, locked_until)\nvalues ($2, $3, $4, $5:json, $6, $4)\non DUPLICATE KEY update data = $5:json, expression = $6\n$7:line , run_at = $4, locked_until = $4, attempts = 0";
export const vacuumTest: "optimize table jobs";
export { deleteQueue, deleteSingle, flush };
