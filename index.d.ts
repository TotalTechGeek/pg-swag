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
     * @param {{ dialect: keyof typeof connections, config: any } | { dialect: keyof typeof connections, query: (str: string) => Promise<any[]>, none?: (str: string) => Promise<any[]> }} connectionConfig
     * @param {{ schema?: string | null, table?: string }} [tableOptions]
     */
    constructor(connectionConfig: {
        dialect: keyof typeof connections;
        config: any;
    } | {
        dialect: keyof typeof connections;
        query: (str: string) => Promise<any[]>;
        none?: (str: string) => Promise<any[]>;
    }, { schema, table }?: {
        schema?: string | null;
        table?: string;
    });
    initialized: boolean;
    /** @type {keyof typeof connections} */
    dialect: keyof typeof connections;
    queries: typeof sqlite | typeof postgres | typeof mysql;
    query: (str: any) => Promise<any>;
    none: any;
    /** @type {Record<string, { batcherId: Timer, flushId: Timer, flush: (force?: boolean) => Promise<void | null> }>} */
    workers: Record<string, {
        batcherId: Timer;
        flushId: Timer;
        flush: (force?: boolean) => Promise<void | null>;
    }>;
    workerId: `${string}-${string}-${string}-${string}-${string}`;
    schema: string;
    table: {
        schema: string;
        table: string;
    };
    /**
     * Schedules a job to run either at a specific time or on a repeating interval.
     *
      * @param {string} queue - The name of the queue to schedule the job in.
      * @param {string} id - The unique identifier for the job.
      * @param {string | Date | import('./types.d.ts').SpecialDuration} expression The expression to use for scheduling the job.
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
      * ### Duration
      *
      * An object that represents a duration, with the following optional properties:
      * - `years`
      * - `months`
      * - `weeks`
      * - `days`
      * - `hours`
      * - `minutes`
      * - `seconds`
      * - `recurrences` - Number of times to repeat the duration (default: Infinity)
      * - `startDate` - The start date of the duration
      * - `endDate` - The end date of the duration
      *
      * Allowing the following
      * - `{ days: 1 }` - Repeats every day starting from now
      * - `{ days: 1, startDate: new Date('2021-01-01') }` - Repeats every day starting from 2021-01-01
      * - `{ hours: 10, minutes: 30 }` - Repeats every 10 hours and 30 minutes starting from now
      * - `{ hours: 5, recurrences: 3 }` - Repeats every 5 hours starting from now, but only 3 times
      *
      * ### Never
      * - `'cancel'` - Cancels / does not schedule the job.
      * - `null` - Cancels / does not schedule the job.
      *
      * If a job by the same ID already exists in the queue, it will be replaced.
      */
    schedule(queue: string, id: string, expression: string | Date | import("./types.d.ts").SpecialDuration, data: any, preserveRunAt?: boolean): Promise<void>;
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
      *  ### Duration
      *
      * An object that represents a duration, with the following optional properties:
      * - `years`
      * - `months`
      * - `weeks`
      * - `days`
      * - `hours`
      * - `minutes`
      * - `seconds`
      * - `recurrences` - Number of times to repeat the duration (default: Infinity)
      * - `startDate` - The start date of the duration
      * - `endDate` - The end date of the duration
      *
      * Allowing the following
      * - `{ days: 1 }` - Repeats every day starting from now
      * - `{ days: 1, startDate: new Date('2021-01-01') }` - Repeats every day starting from 2021-01-01
      * - `{ hours: 10, minutes: 30 }` - Repeats every 10 hours and 30 minutes starting from now
      * - `{ hours: 5, recurrences: 3 }` - Repeats every 5 hours starting from now, but only 3 times
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
    remove(queue: string, id?: string): Promise<any>;
    /**
     * Creates a handler for a given queue that receives the job information.
     * @param {string} queue The type of job to listen for.
     * @param {(job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string | Date | import('./types.d.ts').SpecialDuration } | { lockedUntil: Date } | boolean | Promise<void | null | undefined | { expression: string | Date | import('./types.d.ts').SpecialDuration } | { lockedUntil: Date } | boolean>} handler The function to run when a job is received.
     * @param {{ skipPast?: boolean, maxHeartbeats?: number, batchSize?: number, concurrentJobs?: number, pollingPeriod?: number | import('./swag.d.ts').Interval, lockPeriod?: number | import('./swag.d.ts').Interval, flushPeriod?: number | import('./swag.d.ts').Interval }} [options]
     *
     * @example Sending a scheduled email
     * ```
     * swag.on('email', async (job) => {
     *  const { address, subject, body } = job.data;
     *  await sendEmail(address, subject, body);
     * })
     * ```
     * @returns {{ onError: (handler: (err: any, job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string | Date | import('./types.d.ts').SpecialDuration } | { lockedUntil: Date } | boolean | Promise<void | null | undefined | { expression: string | Date | import('./types.d.ts').SpecialDuration } | { lockedUntil: Date } | boolean>) => void}}
     */
    on(queue: string, handler: (job: import("./swag.d.ts").Job) => void | null | undefined | {
        expression: string | Date | import("./types.d.ts").SpecialDuration;
    } | {
        lockedUntil: Date;
    } | boolean | Promise<void | null | undefined | {
        expression: string | Date | import("./types.d.ts").SpecialDuration;
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
            expression: string | Date | import("./types.d.ts").SpecialDuration;
        } | {
            lockedUntil: Date;
        } | boolean | Promise<void | null | undefined | {
            expression: string | Date | import("./types.d.ts").SpecialDuration;
        } | {
            lockedUntil: Date;
        } | boolean>) => void;
    };
    /**
     * Creates a global error handler for all jobs, regardless of queue.
     * @param {(err: any, job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string | Date | import('./types.d.ts').SpecialDuration } | { lockedUntil: Date } | boolean | Promise<void | null | undefined | { expression: string | Date | import('./types.d.ts').SpecialDuration } | { lockedUntil: Date } | boolean>} handler
     */
    onError(handler: (err: any, job: import("./swag.d.ts").Job) => void | null | undefined | {
        expression: string | Date | import("./types.d.ts").SpecialDuration;
    } | {
        lockedUntil: Date;
    } | boolean | Promise<void | null | undefined | {
        expression: string | Date | import("./types.d.ts").SpecialDuration;
    } | {
        lockedUntil: Date;
    } | boolean>): void;
    globalErrorHandler: (err: any, job: import("./swag.d.ts").Job) => void | null | undefined | {
        expression: string | Date | import("./types.d.ts").SpecialDuration;
    } | {
        lockedUntil: Date;
    } | boolean | Promise<void | null | undefined | {
        expression: string | Date | import("./types.d.ts").SpecialDuration;
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
declare namespace connections {
    export { postgres };
    export { sqlite };
    export { mysql };
}
import * as sqlite from './sql/sqlite.js';
import * as postgres from './sql/postgres.js';
import * as mysql from './sql/mysql.js';
import { durationToISO8601 } from './helpers.js';
import { relativeToISO8601 } from './helpers.js';
export { durationToISO8601, relativeToISO8601 };
