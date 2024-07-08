import { swag } from './setup.test.js'

/**
 * @test 'stress-simple', 10e3, 30e3, 200 resolves
 * @test 'stress', 80000, 45000, 200 resolves
 */
export async function Stress (queue, num, under, batchSize) {
  const now = new Date()
  const schedules = []
  for (let i = 0; i < num; i++) {
    schedules.push({
      id: i.toString(),
      expression: '2020-01-01'
    })
  }
  await swag.scheduleMany(queue, schedules)
  const after = new Date()
  console.log(`Took ${after - now}ms to schedule ${num} jobs`)

  return new Promise((resolve, reject) => {
    let count = 0
    swag.on(queue, job => {
      count++
      if (count === num) {
        const time = new Date().getTime() - after.getTime()
        console.log(`Took ${time}ms to execute ${num} jobs`)
        if (time < under) resolve()
        else reject(new Error(`Took ${time}ms to execute ${num} jobs`))
      }
    }, { batchSize, pollingPeriod: 1000 })
  })
}

/**
 * @afterAll
 */
export async function TearDown () {
  await swag.stop('stress')
  await swag.remove('stress')
  await swag.stop('stress-simple')
  await swag.remove('stress-simple')
}
