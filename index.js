// @ts-check
import pgPromise from 'pg-promise'
import crypto from 'crypto'
import pMap from 'p-map'
import { nextTime, relativeToISO8601 } from './helpers.js'
import { parseRelativeAsSeconds } from './relative.js'
import { durationToISO8601 } from './helpers.js'
import { format } from './formatSQL.js'
import * as queries from './sql/postgres.js'

/**
 * Fetches a batch of jobs from the database and processes them,
 * this locks the jobs for a minute to prevent other workers from processing them.
 *
 * If the number of jobs fetched is equal to the batchSize, it will fetch another batch,
 * this is to prevent the worker from being idle when there are more jobs to process.
 *
 * @param {string} handlerId
 * @param {string} queue
 * @param {(job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string | Date | import('./types.d.ts').SpecialDuration } | { lockedUntil: Date } | boolean | Promise<void | null | undefined | { expression: string | Date | import('./types.d.ts').SpecialDuration } | { lockedUntil: Date } | boolean>} handler
 * @param {any} db
 * @param {any[]} completed
 * @param {{ skipPast: boolean, maxHeartbeats: number, batchSize: number, concurrentJobs: number, lockPeriod: import('./swag.d.ts').Interval, swag: Swag, errorHandler?: (err: any, job: import('./swag.d.ts').Job) => Promise<null | undefined | { expression: string | Date | import('./types.d.ts').SpecialDuration } | { lockedUntil: Date } | boolean> }} options
 * @return {Promise<void>}
 */
async function processBatch (db, handlerId, queue, handler, completed, options) {
  /** * @type {import('./swag.d.ts').Job[]} */
  let jobs
  do {
    jobs = await db.query(format(queries.fetchAndLock, [options.swag.table, handlerId, queue, options.batchSize, options.lockPeriod])).catch(() => [])
    if (!jobs.length) return

    let heartbeats = 0
    const lockedJobs = new Set(jobs.map(job => job.id))
    const activeJobs = new Set()

    const heartbeatMs = parseRelativeAsSeconds(options.lockPeriod) * 1000 / 2

    // Heartbeat to keep the jobs locked
    const heartbeat = setInterval(async () => {
      // Allows us to specify a maximum number of heartbeats to prevent infinite locking of jobs
      // not currently being processed.
      const jobsToLock = heartbeats++ < options.maxHeartbeats ? lockedJobs : activeJobs
      if (!jobsToLock.size) return
      await db.query(format(queries.heartbeat, [options.swag.table, options.lockPeriod, Array.from(jobsToLock), queue]))
    }, heartbeatMs)

    try {
      await pMap(jobs, async job => {
        let result
        activeJobs.add(job.id)

        try {
          result = await handler(job) ?? true
        } catch (e) {
          if (options.swag.globalErrorHandler) result = await options.swag.globalErrorHandler(e, job)
          if (options.errorHandler) result = await options.errorHandler(e, job)
        }

        if (result) {
          /** @type {string | Date | import('./types.d.ts').SpecialDuration} */
          let nextExpression = job.expression
          if (typeof result === 'object' && 'expression' in result) nextExpression = result.expression

          if (nextExpression instanceof Date) nextExpression = nextExpression.toISOString()
          if (typeof nextExpression === 'object') nextExpression = durationToISO8601(nextExpression)

          completed.push({
            id: job.id,
            // If the expression is returned in an object, use that, otherwise use the job's expression.
            nextRun: nextTime(nextExpression, job.run_at, options.skipPast ? new Date() : undefined),
            expression: typeof result === 'object' && 'expression' in result && result.expression,
            lockedUntil: (typeof result === 'object' && 'lockedUntil' in result && result.lockedUntil) || null
          })
        }

        lockedJobs.delete(job.id)
        activeJobs.delete(job.id)
      }, { concurrency: options.concurrentJobs })
    } finally {
      clearInterval(heartbeat)
    }
  } while (jobs.length === options.batchSize)
}

/**
 * Generates the query to update completed jobs
 * @param {string} queue
 * @param {{ id: string, nextRun: Date, expression: null | string, lockedUntil?: Date | null }[]} completed
 * @param {Swag} swag
 * @returns {string}
 */
function generateFlush (queue, completed, swag) {
  const query = completed.map(({ id, nextRun, expression, lockedUntil }) => {
    if (nextRun === null) return format(queries.deleteSingle, [swag.table, queue, id])
    return format(queries.flush, [swag.table, nextRun, id, queue, expression, lockedUntil ?? nextRun])
  }).join(';')
  completed.splice(0, completed.length)
  return query
}

/**
 * Swag - Postgres Scheduling With A Grin
 */
export class Swag {
  /**
   * @param {Parameters<typeof this.pgp>[0]} connectionConfig
   * @param {{ schema?: string | null, table?: string }} [tableOptions]
   */
  constructor (connectionConfig, {
    schema = null,
    table = 'jobs'
  } = {}) {
    this.pgp = pgPromise({ ...(schema && { schema }) })
    this.db = this.pgp(connectionConfig)
    this.initialized = false
    /** @type {Record<string, { batcherId: Timer, flushId: Timer, flush: (force?: boolean) => Promise<void | null> }>} */
    this.workers = {}
    this.workerId = crypto.randomUUID()
    this.schema = schema
    this.table = { table, ...(schema && { schema }) }
  }

  async #start () {
    if (this.initialized) return
    this.initialized = true
    await this.db.query(format(queries.init, [this.table, this.schema, '1']))
  }

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
  async schedule (queue, id, expression, data, preserveRunAt = false) {
    await this.#start()
    if (expression instanceof Date) expression = expression.toISOString()

    // While "nextTime" does support this object, converting it here is cleaner for the
    // database query.
    if (typeof expression === 'object') expression = durationToISO8601(expression)

    const nextRun = nextTime(expression)
    if (!nextRun) return
    await this.db.query(format(queries.insert, [this.table, queue, id, nextRun, data ?? null, expression, !preserveRunAt]))
  }

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
  async scheduleMany (queue, jobs, preserveRunAt = false) {
    await this.#start()

    const query = jobs.map(job => {
      let expression = job.expression
      if (expression instanceof Date) expression = expression.toISOString()
      if (typeof expression === 'object') expression = durationToISO8601(expression)

      const nextRun = nextTime(expression)
      if (!nextRun) return null
      return format(queries.insert, [this.table, queue, job.id, nextRun, job.data ?? null, expression, !preserveRunAt])
    }).join(';')

    await this.db.query(`begin; ${query}; commit;`)
  }

  /**
    * Removes a job / schedule from the scheduler.
    * @param {string} queue - The name of the queue to remove the job from.
    * @param {string} [id] - The unique identifier for the job.
    */
  async remove (queue, id) {
    if (!id) return this.db.query(format(queries.deleteQueue, [this.table, queue]))
    return this.db.query(format(queries.deleteSingle, [this.table, queue, id]))
  }

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
  on (queue, handler, options) {
    this.#start()
    this.stop(queue)
    /** @type {any[]} */
    const completed = []
    let active = false

    /** @type {import('./swag.d.ts').Interval} */
    // @ts-expect-error This is a valid assignment
    const lockPeriod = typeof options?.lockPeriod === 'number' ? Math.floor(options.lockPeriod / 1000) + ' seconds' : (options?.lockPeriod ?? '1 minutes')

    /** @type {Required<typeof options> & { errorHandler?: any, swag: Swag, pollingPeriod: number, flushPeriod: number, lockPeriod: import('./swag.d.ts').Interval }} */
    const processOptions = {
      batchSize: 100,
      concurrentJobs: 2,
      swag: this,
      skipPast: true,
      maxHeartbeats: Infinity,
      ...options,
      pollingPeriod: typeof options?.pollingPeriod === 'number' ? options?.pollingPeriod : parseRelativeAsSeconds(options?.pollingPeriod ?? '15s') * 1000,
      flushPeriod: typeof options?.flushPeriod === 'number' ? options?.flushPeriod : parseRelativeAsSeconds(options?.flushPeriod ?? '1s') * 1000,
      lockPeriod
    }

    const run = () => {
      // Prevents more than one "processBatch" from running at the same time for the same queue.
      if (active) return
      active = true
      processBatch(this.db, this.workerId, queue, handler, completed, processOptions).finally(() => { active = false })
    }

    setImmediate(run)

    const batcherId = setInterval(run, processOptions.pollingPeriod)

    const flush = async (force) => {
      if (force) while (active) await new Promise(resolve => setTimeout(resolve, 100))
      if (!completed.length) return
      return this.db.query(`begin; ${generateFlush(queue, completed, this)}; commit;`)
    }

    // On the flush interval, flush the completed jobs
    const flushId = setInterval(flush, processOptions.flushPeriod)
    this.workers[queue] = { batcherId, flushId, flush }

    return { onError: (errorHandler) => { processOptions.errorHandler = errorHandler } }
  }

  /**
   * Creates a global error handler for all jobs, regardless of queue.
   * @param {(err: any, job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string | Date | import('./types.d.ts').SpecialDuration } | { lockedUntil: Date } | boolean | Promise<void | null | undefined | { expression: string | Date | import('./types.d.ts').SpecialDuration } | { lockedUntil: Date } | boolean>} handler
   */
  onError (handler) {
    this.globalErrorHandler = handler
  }

  /**
   * This stops the worker for the specified queue
   * @param {string} queue
   */
  async stop (queue) {
    const worker = this.workers[queue]
    if (!worker) return
    clearInterval(worker.batcherId)
    clearInterval(worker.flushId)

    // Force a flush before stopping
    await worker.flush(true)
    delete this.workers[queue]
  }
}

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
export function cancelAfter (num) {
  /**
   * @param {any} _err
   * @param {import('./swag.d.ts').Job} job
   */
  return (_err, job) => {
    if (job.attempts > num) return { expression: 'cancel' }
  }
}

export {
  durationToISO8601,
  relativeToISO8601
}
