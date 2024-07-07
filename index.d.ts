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
       * @param {import('pg').ConnectionConfig} config
       */
    constructor(config: any);
    db: pgPromise.IDatabase<{}, import("pg-promise/typescript/pg-subset.js").IClient>;
    initialized: boolean;
    /** @type {Record<string, { batcherId: Timer, flushId: Timer }>} */
    workers: Record<string, {
        batcherId: Timer;
        flushId: Timer;
    }>;
    workerId: `${string}-${string}-${string}-${string}-${string}`;
    /**
     * Schedules a job to run either at a specific time or on a repeating interval.
     *
      * @param {string} queue - The name of the queue to schedule the job in.
      * @param {string} id - The unique identifier for the job.
      * @param {string} expression The expression to use for scheduling the job.
      * @param {any} data - The data to pass to the handler when the job is run.
      * Can be either a cron expression or a repeating ISO 8601 interval expression.
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
    schedule(queue: string, id: string, expression: string, data: any): Promise<void>;
    /**
      * Removes a job / schedule from the scheduler.
      * @param {string} queue - The name of the queue to remove the job from.
      * @param {string} [id] - The unique identifier for the job.
      */
    remove(queue: string, id?: string): Promise<null>;
    /**
     * Creates a handler for a given queue that receives the job information.
     * @param {string} queue The type of job to listen for.
     * @param {(job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string } | boolean | Promise<void | null | undefined | { expression: string } | boolean>} handler The function to run when a job is received.
     * @param {{ batchSize?: number, concurrentJobs?: number, pollingPeriod?: number, lockPeriod?: `${number} ${'minutes' | 'seconds'}` }} [options]
     *
     * @example Sending a scheduled email
     * ```
     * swag.on('email', async (job) => {
     *  const { address, subject, body } = job.data;
     *  await sendEmail(address, subject, body);
     * })
     * ```
     * @returns {{ onError: (handler: (err: any, job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string } | boolean | Promise<void | null | undefined | { expression: string } | boolean>) => void }}
     */
    on(queue: string, handler: (job: import("./swag.d.ts").Job) => void | null | undefined | {
        expression: string;
    } | boolean | Promise<void | null | undefined | {
        expression: string;
    } | boolean>, options?: {
        batchSize?: number;
        concurrentJobs?: number;
        pollingPeriod?: number;
        lockPeriod?: `${number} ${"minutes" | "seconds"}`;
    }): {
        onError: (handler: (err: any, job: import("./swag.d.ts").Job) => void | null | undefined | {
            expression: string;
        } | boolean | Promise<void | null | undefined | {
            expression: string;
        } | boolean>) => void;
    };
    /**
     * Creates a global error handler for all jobs, regardless of queue.
     * @param {(err: any, job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string } | boolean | Promise<void | null | undefined | { expression: string } | boolean>} handler
     */
    onError(handler: (err: any, job: import("./swag.d.ts").Job) => void | null | undefined | {
        expression: string;
    } | boolean | Promise<void | null | undefined | {
        expression: string;
    } | boolean>): void;
    globalErrorHandler: (err: any, job: import("./swag.d.ts").Job) => void | null | undefined | {
        expression: string;
    } | boolean | Promise<void | null | undefined | {
        expression: string;
    } | boolean>;
    /**
     * This stops the worker for the specified queue
     * @param {string} queue
     */
    stop(queue: string): void;
    #private;
}
import pgPromise from 'pg-promise';
