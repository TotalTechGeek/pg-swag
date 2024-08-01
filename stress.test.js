import { Swag } from './index.js'
import { swag, pgConfig } from './setup.test.js'

const alternate = new Swag({
  config: pgConfig,
  dialect: 'postgres'
})

/**
 * Tries to distribute the work between two instances of the scheduler
 * @param {string} queue
 * @param {number} num
 * @param {number} under
 *
 * @test 'distributed', 5e3, 30e3 resolves
 */
export async function MultiTest (queue, num, under) {
  const schedules = []
  for (let i = 0; i < num; i++) {
    schedules.push({
      id: i.toString(),
      expression: '2020-01-01'
    })
  }
  await alternate.scheduleMany(queue, schedules)
  await swag.none('VACUUM (ANALYZE) jobs;').catch(() => {})
  const after = new Date()

  return new Promise((resolve, reject) => {
    let count = 0
    const workers = {}

    const f = name => job => {
      count++
      workers[name] = (workers[name] || 0) + 1
      if (count === num) {
        const time = new Date().getTime() - after.getTime()
        console.log(`Took ${time}ms to execute ${num} jobs`)
        console.log(workers)
        if (time < under) resolve()
        else reject(new Error(`Took ${time}ms to execute ${num} jobs`))
      }
    }

    swag.on(queue, f('swag'), { batchSize: 10, pollingPeriod: 1000, concurrentJobs: 1, flushPeriod: '10 seconds', maxHeartbeats: 1 })
    alternate.on(queue, f('alternate'), { batchSize: 10, pollingPeriod: 1000, concurrentJobs: 1, flushPeriod: '10 seconds', maxHeartbeats: 1 })
  })
}

/**
 * @test 'stress-simple', 10e3, 30e3, 200 resolves
 * @test 'stress', 80000, 50000, 200 resolves
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

  await swag.none('VACUUM (ANALYZE) jobs;').catch(() => {})
  const afterVacuum = new Date()
  console.log(`Took ${afterVacuum - after}ms to vacuum ${num} jobs`)

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
    }, { batchSize, pollingPeriod: 1000, flushPeriod: '10 seconds' })
  })
}

/**
 * @afterAll
 */
export async function TearDown () {
  await swag.remove('stress')
  await swag.remove('stress-simple')
  await swag.remove('distributed')
}
