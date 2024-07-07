import { Swag } from './index.js'
import { Steps } from 'pineapple'

const { Given, When, Then, Scenario } = Steps()

const swag = new Swag({
  password: 'postgres',
  user: 'postgres',
  host: 'localhost'
})

Given('a topic {topic}', async function ({ topic }) {
  this.topic = topic
})

When('I schedule a job with name {name} to run at {expression}', async function ({ name, expression }) {
  await swag.schedule(this.topic, name, expression, {})
  this.name = name
})

Then('I should see the job run {times}', function ({ times }) {
  let count = 0
  if (!times) times = 1
  return new Promise((resolve, reject) => {
    swag.on(this.topic, job => {
      if (job.id === this.name) {
        count++
        if (count === times) resolve()
      } else reject(new Error('Somehow got a different job'))
    }, {
      // Massively reduce the polling period to make the test run faster
      pollingPeriod: 100
    })
  })
})

/**
 * @test { topic: 'Test', name: 'Joe', expression: '2020-01-01', times: 1 } resolves
 * @test { topic: 'Test', name: 'Jim', expression: 'R/PT1S', times: 2 } resolves
 */
export const SimpleRun = Scenario`
Given a topic {topic}
When I schedule a job with name {name} to run at {expression}
Then I should see the job run {times}`
