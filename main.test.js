import { Swag } from './index.js'
import { Steps } from 'pineapple'

const { Given, When, Then, Scenario } = Steps()

const swag = new Swag({
  password: 'postgres',
  user: 'postgres',
  host: 'localhost'
})

Given('a topic {topic}', async function (topic) {
  this.topic = topic
})

When('I schedule a job with name {name} to run at {expression}', async function (name, expression) {
  await swag.schedule(this.topic, name, expression, {})
  this.name = name
})

Then('I should see the job run', function () {
  return new Promise(resolve => swag.on(this.topic, resolve))
})

/**
 * @test { topic: 'Test', name: 'Joe', expression: 'R1/PT1S' } resolves @.id === 'Joe'
 */
export const Once = Scenario`
Given a topic {topic}
When I schedule a job with name {name} to run at {expression}
Then I should see the job run`
