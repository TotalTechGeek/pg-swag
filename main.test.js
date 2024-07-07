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
  const results = await swag.db.query('select * from jobs where queue = $1 and id = $2', [this.queue, this.name])
  if (results.length) throw new Error('Job still exists')
})

/**
 * @test { queue: 'Test', name: 'Joe', expression: '2020-01-01', times: 1 } resolves
 * @test { queue: 'Test', name: 'Jim', expression: 'R/PT1S', times: 2 } resolves
 */
export const SimpleRun = Scenario`
Given a queue {queue}
When I schedule a job with name {name} to run at {expression}
Then I should see the job run {times}`

/**
 * @test { queue: 'Test', name: 'Joe', expression: '2020-01-01' } resolves
 */
export const CancelJob = Scenario`
Given a queue {queue}
When I schedule a job with name {name} to run at {expression}
When I cancel the job
Then I should not see the job in the table`

/**
 * @test { queue: 'Test', name: 'Joe', expression: '2020-01-01' } resolves
 */
export const CancelAllJobs = Scenario`
Given a queue {queue}
When I schedule a job with name {name} to run at {expression}
When I cancel all jobs in the queue
Then I should not see the job in the table`
