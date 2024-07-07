// @ts-check
import pgPromise from 'pg-promise'
import crypto from 'crypto'
import pMap from 'p-map'
import { nextTime } from './helpers.js'

/**
 * Fetches a batch of jobs from the database and processes them,
 * this locks the jobs for a minute to prevent other workers from processing them.
 *
 * If the number of jobs fetched is equal to the batchSize, it will fetch another batch,
 * this is to prevent the worker from being idle when there are more jobs to process.
 *
 * @param {string} handlerId
 * @param {string} queue
 * @param {(job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string } | boolean | Promise<void | null | undefined | { expression: string } | boolean>} handler
 * @param {any} db
 * @param {any[]} completed
 * @param {{ batchSize: number, concurrentJobs: number, lockPeriod: `${number} ${'minutes' | 'seconds'}`, swag: Swag, errorHandler?: (err: any, job: import('./swag.d.ts').Job) => Promise<null | undefined | { expression: string } | boolean> }} options
 * @return {Promise<void>}
 */
async function processBatch (db, handlerId, queue, handler, completed, options) {
  /** * @type {import('./swag.d.ts').Job[]} */
  let jobs
  do {
    jobs = await db.manyOrNone(`
        set enable_seqscan = off;
        update $1
        set locked_until = now() + interval $5, locked_by = $2, attempts = attempts + 1
        where id in (
          select id
          from $1
          where queue = $3
          and greatest(run_at, locked_until) <= now()
          limit $4
          for update skip locked
        )
        and queue = $3
        returning *;
      `, [options.swag.table, handlerId, queue, options.batchSize, options.lockPeriod])

    if (!jobs.length) return

    await pMap(jobs, async job => {
      let result

      try {
        result = await handler(job) ?? true
      } catch (e) {
        if (options.swag.globalErrorHandler) result = await options.swag.globalErrorHandler(e, job)
        if (options.errorHandler) result = await options.errorHandler(e, job)
      }

      if (result) {
        let nextExpression = job.expression
        if (typeof result === 'object' && result?.expression) nextExpression = result.expression

        completed.push({
          id: job.id,
          // If the expression is returned in an object, use that, otherwise use the job's expression.
          nextRun: nextTime(nextExpression, job.run_at, new Date()),
          expression: typeof result === 'object' && result.expression
        })
      }
    }, { concurrency: options.concurrentJobs })
  } while (jobs.length === options.batchSize)
}

/**
 * Generates the query to update completed jobs
 * @param {string} queue
 * @param {{ id: string, nextRun: Date, expression: null | string }[]} completed
 * @param {Swag} swag
 * @returns {string}
 */
function generateFlush (queue, completed, swag) {
  const query = completed.map(({ id, nextRun, expression }) => {
    if (nextRun === null) {
      return swag.pgp.as.format(`
        delete from $1
        where queue = $3
        and id = $2
      `, [swag.table, id, queue])
    }
    return swag.pgp.as.format(`
      update $1
      set run_at = $2,
        locked_until = null,
        locked_by = null,
        attempts = 0
        ${expression ? ', expression = $5' : ''}
      where queue = $4
      and id = $3
    `, [swag.table, nextRun, id, queue, expression])
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
    this.pgp = pgPromise({ schema })
    this.db = this.pgp(connectionConfig)
    this.initialized = false
    /** @type {Record<string, { batcherId: Timer, flushId: Timer, flush: (force?: boolean) => Promise<void | null> }>} */
    this.workers = {}
    this.workerId = crypto.randomUUID()
    this.schema = schema
    this.table = new pgPromise.TableName({ table, ...(schema && { schema }) })
  }

  async #start () {
    if (this.initialized) return
    this.initialized = true
    if (this.schema) await this.db.none('create schema if not exists $1:name', [this.schema])
    await this.db.none('create table if not exists $1 (queue text, id text, run_at timestamptz, data jsonb, expression text, locked_until timestamptz, locked_by text, attempts int default 0)', [this.table])
    await this.db.none('create index if not exists idx_jobs_queue_run_at on $1 (queue, greatest(run_at, locked_until))', [this.table])
    await this.db.none('create unique index if not exists idx_jobs_queue_id on $1 (queue, id)', [this.table])
  }

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
  async schedule (queue, id, expression, data) {
    await this.#start()
    const nextRun = nextTime(expression)
    if (!nextRun) return
    await this.db.none(`
      insert into $1 (queue, id, run_at, data, expression)
      values ($2, $3, $4, $5, $6)
      on conflict (queue, id) do update set data = $4, expression = $5
    `, [this.table, queue, id, nextRun, data, expression])
  }

  /**
    * Removes a job / schedule from the scheduler.
    * @param {string} queue - The name of the queue to remove the job from.
    * @param {string} [id] - The unique identifier for the job.
    */
  async remove (queue, id) {
    if (!id) return this.db.none('delete from $1 where queue = $2', [this.table, queue])
    return this.db.none('delete from $1 where queue = $2 and id = $3', [this.table, queue, id])
  }

  /**
   * Creates a handler for a given queue that receives the job information.
   * @param {string} queue The type of job to listen for.
   * @param {(job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string } | boolean | Promise<void | null | undefined | { expression: string } | boolean>} handler The function to run when a job is received.
   * @param {{ batchSize?: number, concurrentJobs?: number, pollingPeriod?: number, lockPeriod?: `${number} ${'minutes' | 'seconds'}`, flushPeriod?: number  }} [options]
   *
   * @example Sending a scheduled email
   * ```
   * swag.on('email', async (job) => {
   *  const { address, subject, body } = job.data;
   *  await sendEmail(address, subject, body);
   * })
   * ```
   * @returns {{ onError: (handler: (err: any, job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string } | boolean | Promise<void | null | undefined | { expression: string } | boolean>) => void}}
   */
  on (queue, handler, options) {
    this.#start()
    this.stop(queue)
    /** @type {any[]} */
    const completed = []
    let active = false

    /** @type {Required<typeof options> & { errorHandler?: any, swag: Swag }} */
    const processOptions = {
      batchSize: 100,
      concurrentJobs: 10,
      pollingPeriod: 15000,
      flushPeriod: 1000,
      lockPeriod: '1 minutes',
      swag: this,
      ...options
    }

    const batcherId = setInterval(() => {
      // Prevents more than one "processBatch" from running at the same time for the same queue.
      if (active) return
      active = true
      processBatch(this.db, this.workerId, queue, handler, completed, processOptions).finally(() => { active = false })
    }, processOptions.pollingPeriod)

    const flush = async (force) => {
      if (force) while (active) await new Promise(resolve => setTimeout(resolve, 100))
      if (!completed.length) return
      return this.db.tx(async t => t.none(generateFlush(queue, completed, this)))
    }

    // On the flush interval, flush the completed jobs
    const flushId = setInterval(flush, processOptions.flushPeriod)
    this.workers[queue] = { batcherId, flushId, flush }

    return { onError: (errorHandler) => { processOptions.errorHandler = errorHandler } }
  }

  /**
   * Creates a global error handler for all jobs, regardless of queue.
   * @param {(err: any, job: import('./swag.d.ts').Job) => void | null | undefined | { expression: string } | boolean | Promise<void | null | undefined | { expression: string } | boolean>} handler
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
