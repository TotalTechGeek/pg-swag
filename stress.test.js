import { swag } from './setup.test.js'

/**
 * @test 10000, 30000 resolves
 * TODO: Build a more robust suite of tests with more control over resources
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
    })
  })
}
