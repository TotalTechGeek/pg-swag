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

Then('I should see the job run', function () {
  return new Promise((resolve, reject) => {
    swag.on(this.topic, job => {
      if (job.id === this.name) resolve()
      else reject(new Error('Somehow got a different job'))
    }, {
      // Massively reduce the polling period to make the test run faster
      pollingPeriod: 100
    })
  })
})

/**
 * @test { topic: 'Test', name: 'Joe', expression: 'R1/PT1S' } resolves
 */
export const Once = Scenario`
Given a topic {topic}
When I schedule a job with name {name} to run at {expression}
Then I should see the job run`

/**
 * @test { topic: 'Test', name: 'Joe', expression: 'R/PT1S' } resolves
 */
export const Twice = Scenario`
Given a topic {topic}
When I schedule a job with name {name} to run at {expression}
Then I should see the job run
Then I should see the job run`
