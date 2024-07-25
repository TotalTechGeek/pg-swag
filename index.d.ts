/**
 * A helper function for creating an error handler that cancels a job after a certain number of attempts.
 * @param {Number} num The number of attempts before the job is cancelled.
 * @example
 * ```
 * swag.on('email', async (job) => {
 *  ...
 * }).onError(cancelAfter(3));
 * ```
 */
export function cancelAfter(num: number): (_err: any, job: import("./swag.d.ts").Job) => {
    expression: string;
};
/**
 * Swag - Postgres Scheduling With A Grin
 */
export class Swag {
    /**
     * @param {Parameters<typeof this.pgp>[0]} connectionConfig
     * @param {{ schema?: string | null, table?: string }} [tableOptions]
     */
    constructor(connectionConfig: Parameters<typeof this.pgp>[0], { schema, table }?: {
        schema?: string | null;
        table?: string;
    });
    pgp: pgPromise.IMain<{}, import("pg-promise/typescript/pg-subset.js").IClient>;
    db: pgPromise.IDatabase<{}, import("pg-promise/typescript/pg-subset.js").IClient>;
    initialized: boolean;
    /** @type {Record<string, { batcherId: Timer, flushId: Timer, flush: (force?: boolean) => Promise<void | null> }>} */
    workers: Record<string, {
        batcherId: Timer;
        flushId: Timer;
        flush: (force?: boolean) => Promise<void | null>;
    }>;
    workerId: `${string}-${string}-${string}-${string}-${string}`;
    schema: string;
    table: pgPromise.TableName;
    /**
     * Schedules a job to run either at a specific time or on a repeating interval.
     *
      * @param {string} queue - The name of the queue to schedule the job in.
      * @param {string} id - The unique identifier for the job.
      * @param {string | Date} expression The expression to use for scheduling the job.
      * @param {any} data - The data to pass to the handler when the job is run.
      * @param {boolean} [preserveRunAt=false] Whether to preserve the run_at & lock time if the job already exists.
      *
      * Can be a cron expression or a repeating ISO 8601 interval expression or a Date.
      * For example, to run every 3 days, use 'R/2012-10-01T00:00:00Z/P3D'.
      *
      * ### ISO 8601 Interval Expressions
      * - `'R/2012-10-01T00:00:00Z/P3D'` - Repeats every 3 days starting from 2012-10-01
      * - `'R/2012-10-01T00:00:00Z/PT1H'` - Repeats every hour starting from 2012-10-01
      * - `'R/2012-10-01T00:00:00Z/PT5M'` - Repeats every 5 minutes starting from 2012-10-01
      * - `'R3/2012-10-01T00:00:00Z/P1D'` - Repeats every day starting from 2012-10-01, but only 3 times
      *
      * ### Cron Expressions
      * - `'0 0 * * *'` - Repeats every day at midnight
      * - `'0 0 * * 1'` - Repeats every Monday at midnight
      * - `'0 0 1 * *'` - Repeats every first day of the month at midnight
      *
      * ### ISO8601 Dates
      * - `'2012-10-01T00:00:00Z'` - A specific date and time to run at, once.
      *
      * ### Never
      * - `'cancel'` - Cancels / does not schedule the job.
      * - `null` - Cancels / does not schedule the job.
      *
      * If a job by the same ID already exists in the queue, it will be replaced.
      */
    schedule(queue: string, id: string, expression: string | Date, data: any, preserveRunAt?: boolean): Promise<void>;
    /**
     * Schedules multiple jobs to run either at a specific time or on a repeating interval.
     *
     * @param {string} queue
     * @param {{ id: string, expression: string | Date, data: any }[]} jobs
     * @param {boolean} [preserveRunAt=false] Whether to preserve the run_at & lock time if the job already exists.
     *
     * Can be a cron expression or a repeating ISO 8601 interval expression or a Date.
      * For example, to run every 3 days, use 'R/2012-10-01T00:00:00Z/P3D'.
      *
      * ### ISO 8601 Interval Expressions
      * - `'R/2012-10-01T00:00:00Z/P3D'` - Repeats every 3 days starting from 2012-10-01
      * - `'R/2012-10-01T00:00:00Z/PT1H'` - Repeats every hour starting from 2012-10-01
      * - `'R/2012-10-01T00:00:00Z/PT5M'` - Repeats every 5 minutes starting from 2012-10-01
      * - `'R3/2012-10-01T00:00:00Z/P1D'` - Repeats every day starting from 2012-10-01, but only 3 times
      *
      * ### Cron Expressions
      * - `'0 0 * * *'` - Repeats every day at midnight
      * - `'0 0 * * 1'` - Repeats every Monday at midnight
      * - `'0 0 1 * *'` - Repeats every first day of the month at midnight
      *
      * ### ISO8601 Dates
      * - `'2012-10-01T00:00:00Z'` - A specific date and time to run at, once.
      *
      * ### Never
      * - `'cancel'` - Cancels / does not schedule the job.
      * - `null` - Cancels / does not schedule the job.
      *
      * If a job by the same ID already exists in the queue, it will be replaced.
     */
    scheduleMany(queue: string, jobs: {
        id: string;
        expression: string | Date;
        data: any;
    }[], preserveRunAt?: boolean): Promise<void>;
    /**
      * Removes a job / schedule from the scheduler.
      * @param {string} queue - The name of the queue to remove the job from.
      * @param {string} [id] - The unique identifier for the job.
      */
    remove(queue: string, id?: string): Promise<null>;
    /**
     * Creates a handler for a given queue that receives the job information.
     * @param {string} queue The type of job to listen for.
     * @param {(job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string } | { lockedUntil: Date } | boolean | Promise<void | null | undefined | { expression: string } | { lockedUntil: Date } | boolean>} handler The function to run when a job is received.
     * @param {{ skipPast?: boolean, maxHeartbeats?: number, batchSize?: number, concurrentJobs?: number, pollingPeriod?: number | import('./swag.d.ts').Interval, lockPeriod?: number | import('./swag.d.ts').Interval, flushPeriod?: number | import('./swag.d.ts').Interval }} [options]
     *
     * @example Sending a scheduled email
     * ```
     * swag.on('email', async (job) => {
     *  const { address, subject, body } = job.data;
     *  await sendEmail(address, subject, body);
     * })
     * ```
     * @returns {{ onError: (handler: (err: any, job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string } | { lockedUntil: Date } | boolean | Promise<void | null | undefined | { expression: string } | { lockedUntil: Date } | boolean>) => void}}
     */
    on(queue: string, handler: (job: import("./swag.d.ts").Job) => void | null | undefined | {
        expression: string;
    } | {
        lockedUntil: Date;
    } | boolean | Promise<void | null | undefined | {
        expression: string;
    } | {
        lockedUntil: Date;
    } | boolean>, options?: {
        skipPast?: boolean;
        maxHeartbeats?: number;
        batchSize?: number;
        concurrentJobs?: number;
        pollingPeriod?: number | import("./swag.d.ts").Interval;
        lockPeriod?: number | import("./swag.d.ts").Interval;
        flushPeriod?: number | import("./swag.d.ts").Interval;
    }): {
        onError: (handler: (err: any, job: import("./swag.d.ts").Job) => void | null | undefined | {
            expression: string;
        } | {
            lockedUntil: Date;
        } | boolean | Promise<void | null | undefined | {
            expression: string;
        } | {
            lockedUntil: Date;
        } | boolean>) => void;
    };
    /**
     * Creates a global error handler for all jobs, regardless of queue.
     * @param {(err: any, job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string } | { lockedUntil: Date } | boolean | Promise<void | null | undefined | { expression: string } | { lockedUntil: Date } | boolean>} handler
     */
    onError(handler: (err: any, job: import("./swag.d.ts").Job) => void | null | undefined | {
        expression: string;
    } | {
        lockedUntil: Date;
    } | boolean | Promise<void | null | undefined | {
        expression: string;
    } | {
        lockedUntil: Date;
    } | boolean>): void;
    globalErrorHandler: (err: any, job: import("./swag.d.ts").Job) => void | null | undefined | {
        expression: string;
    } | {
        lockedUntil: Date;
    } | boolean | Promise<void | null | undefined | {
        expression: string;
    } | {
        lockedUntil: Date;
    } | boolean>;
    /**
     * This stops the worker for the specified queue
     * @param {string} queue
     */
    stop(queue: string): Promise<void>;
    #private;
}
import pgPromise from 'pg-promise';
