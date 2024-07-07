import { Swag } from './index.js'

import { Steps } from 'pineapple'

const { Given, When, Then, Scenario } = Steps()

const swag = new Swag({
  password: 'postgres',
  user: 'postgres',
  host: 'localhost'
})

Given('a queue {queue}', async function ({ queue }) {
  this.queue = queue
})

Given('I want the job to fail {failures}', async function ({ failures }) {
  this.failures = failures
})

When('I schedule a job with name {name} to run at {expression}', async function ({ name, expression }) {
  await swag.schedule(this.queue, name, expression, {})
  this.name = name
})

Then('I should see the job run {times}', function ({ times }) {
  let count = 0
  let failCount = 0
  if (!times) times = 1
  return new Promise((resolve, reject) => {
    swag.on(this.queue, job => {
      console.log('job seen ', job)
      if (job.id === this.name) {
        if (this.failures && failCount++ < this.failures) throw new Error('Job failed')
        count++
        if (count === times) {
          this.job = job
          resolve(job)
        }
      } else reject(new Error('Somehow got a different job'))
    }, {
      // Massively reduce the polling period to make the test run faster
      pollingPeriod: 100,
      lockPeriod: '3 seconds'
    })
  })
})

When('I cancel the job', async function () {
  await swag.remove(this.queue, this.name)
})

When('I cancel all jobs in the queue', async function () {
  await swag.remove(this.queue)
})

Then('I should not see the job in the table', async function () {
  await swag.stop(this.queue) // force a flush
  const results = await swag.db.query('select * from jobs where queue = $1 and id = $2', [this.queue, this.name])
  if (results.length) throw new Error('Job still exists')
})

/**
 * @test { queue: 'Test', name: 'Date-Based', expression: '2020-01-01', times: 1 } resolves
 * @test { queue: 'Test', name: 'Repeating-Schedule', expression: 'R/PT1S', times: 2 } resolves
 *
 * This test is checking that jobs are scheduled and run as expected
 */
export const SimpleRun = Scenario`
Given a queue {queue}
When I schedule a job with name {name} to run at {expression}
Then I should see the job run {times}`

/**
 * @test { queue: 'Test', name: 'Date-Based', expression: '2020-01-01' } resolves
 *
 * This test is just checking that jobs are removed from the queue when cancelled
 */
export const CancelJob = Scenario`
Given a queue {queue}
When I schedule a job with name {name} to run at {expression}
When I cancel the job
Then I should not see the job in the table`

/**
 * @test { queue: 'Test', name: 'Date-Based', expression: '2020-01-01' } resolves
 *
 * This test is just checking that jobs are removed from the queue when all are cancelled
 */
export const CancelAllJobs = Scenario`
Given a queue {queue}
When I schedule a job with name {name} to run at {expression}
When I cancel all jobs in the queue
Then I should not see the job in the table`

/**
 * @test { queue: 'Unrepeatable', name: 'Date-Based', expression: '2020-01-01', times: 1 } resolves
 * @test { queue: 'Unrepeatable', name: 'Non-Repeating-Schedule', expression: 'R0/PT1S', times: 1 } resolves
 *
 * This test assumes the inputs are non-repeating schedules / dates, some expression that would not reschedule,
 * but would run once.
 */
export const UnrepeatableJob = Scenario`
Given a queue {queue}
When I schedule a job with name {name} to run at {expression}
Then I should see the job run {times}
Then I should not see the job in the table`

/**
 * @test { queue: 'Test', name: 'Date-Based', expression: '2020-01-01', times: 1, failures: 1 } resolves @.job.attempts === 2
 * @test { queue: 'Test', name: 'Date-Based-2', expression: '2020-01-01', times: 1, failures: 2 } resolves @.job.attempts === 3
 *
 * This test is checking that when jobs fail, they are retried and the attempts are incremented
 */
export const PoisonedJobsRecover = Scenario`
Given a queue {queue}
And I want the job to fail {failures}
When I schedule a job with name {name} to run at {expression}
Then I should see the job run {times}`
