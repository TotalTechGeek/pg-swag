import { swag } from './setup.test.js'

/**
 * @test 10000, 30000 resolves
 * @test 50000, 30000 resolves
 */
export async function Stress (num, under) {
  const now = new Date()
  for (let i = 0; i < num; i++) {
    await swag.schedule('stress', i, now, {})
  }
  const after = new Date()
  console.log(`Took ${after - now}ms to schedule ${num} jobs`)

  return new Promise((resolve, reject) => {
    let count = 0
    swag.on('stress', job => {
      count++
      if (count === num) {
        const time = new Date().getTime() - after.getTime()
        console.log(`Took ${time}ms to execute ${num} jobs`)
        if (time < under) resolve()
        else reject(new Error(`Took ${time}ms to execute ${num} jobs`))
      }
    }, {
      pollingPeriod: 100,
      flushPeriod: 100
    })
  })
}
