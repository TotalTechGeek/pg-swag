// @ts-check
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

When('I schedule a job with name {name} to run at {expression}', async function ({ name, expression }) {
  // @ts-ignore
  await swag.schedule(this.queue, name, expression, {})
  this.name = name
})

Then('I should see the job run {times}', function ({ times }) {
  let count = 0
  if (!times) times = 1
  return new Promise((resolve, reject) => {
    swag.on(this.queue, job => {
      if (job.id === this.name) {
        count++
        if (count === times) resolve(null)
      } else reject(new Error('Somehow got a different job'))
    }, {
      // Massively reduce the polling period to make the test run faster
      pollingPeriod: 100
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
 * @test { queue: 'Test', name: 'Date-Based', expression: '2020-01-01', times: 1 } resolves
 * @test { queue: 'Test', name: 'Non-Repeating-Schedule', expression: 'R0/PT1S', times: 1 } resolves
 *
 * This test assumes the inputs are non-repeating schedules / dates, some expression that would not reschedule,
 * but would run once.
 */
export const UnrepeatableJob = Scenario`
Given a queue {queue}
When I schedule a job with name {name} to run at {expression}
Then I should see the job run {times}
Then I should not see the job in the table`
